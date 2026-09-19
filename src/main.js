// main.js
// ---------------------------------------------------------------------------
// THE HEART OF THE GAME. Read this file first!
//
// It does two things:
//   1. SET UP: build the world, the physics, a car, the cameras, the HUD, and
//      load the first level (its ramps and its stars).
//   2. THE GAME LOOP: runs ~60 times a second:
//         read the keys -> push the car -> step the physics -> move the pictures
//         -> spin the stars and check if you touched one -> move the camera -> draw
//
// You BEAT a level by collecting all its stars. Beating a level unlocks a car.
// Everything else in src/ is a helper this file glues together.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { createWorld, buildLevel } from './world.js';
import { createPhysicsWorld, PHYSICS_STEP } from './physics.js';
import { createCar } from './car.js';
import { CARS } from './cars.js';
import { LEVELS } from './levels.js';
import { loadProgress, saveProgress, isCarUnlocked, isLevelUnlocked } from './progress.js';
import { createDashboard } from './dashboard.js';
import { createCameras } from './cameras.js';
import { createControls } from './controls.js';
import { createHud } from './hud.js';
import { createBuilder, loadCustomTrack } from './builder.js';

// How close the car has to get to a star to collect it.
const COLLECT_RADIUS = 3;

// ---- 1. SET UP -----------------------------------------------------------

const canvas = document.getElementById('game');
const { renderer, scene, camera } = createWorld(canvas);
const { world } = createPhysicsWorld();

// What levels you've beaten (loaded from the browser so it's remembered).
const progress = loadProgress();

// The list of cars for the garage picker, built straight from cars.js.
const carIds = Object.keys(CARS);
const carList = carIds.map((id) => ({
  id,
  name: CARS[id].name,
  color: CARS[id].body.color,
  stats: CARS[id].stats,
  blurb: CARS[id].blurb,
}));

// The car we're driving. `let` because the garage swaps it for another one.
let currentCarId = 'raceCar';
let car = createCar(scene, world, currentCarId);
let dashboard = createDashboard(car);
const cameras = createCameras(camera, car, dashboard);

// The current level: which one, its built pieces+stars, and how many stars left.
let currentLevelIndex = 0;
let level = null; // the handle from buildLevel (has .stars and .dispose)
let levelName = '';
let isCustomLevel = false; // true when playing a track you built yourself
let starsTotal = 0;
let starsCollected = 0;
let levelWon = false;
let buildMode = false; // true while you're in the track builder

// Little helpers the HUD asks so it knows what to lock.
const carUnlocked = (id) => isCarUnlocked(id, CARS, LEVELS, progress);
const levelUnlocked = (i) => isLevelUnlocked(i, progress);

// THE GARAGE: swap to a different (unlocked) car.
function spawnCar(id) {
  if (!CARS[id] || !carUnlocked(id)) return; // can't drive a car you haven't unlocked
  if (id === currentCarId) {
    car.respawn();
    return;
  }
  car.destroy();
  currentCarId = id;
  car = createCar(scene, world, id);
  dashboard = createDashboard(car);
  cameras.setTarget(car, dashboard);
  hud.setActiveCar(id);
}

// Load ANY level from its data (a real level or a custom track).
function loadLevelData(data, name, { index = null, custom = false } = {}) {
  if (level) level.dispose();
  if (index != null) currentLevelIndex = index;
  isCustomLevel = custom;
  levelName = name;
  level = buildLevel(scene, world, data);
  starsTotal = level.stars.length;
  starsCollected = 0;
  levelWon = false;
  car.respawn();
  hud.setLevel(custom ? -1 : currentLevelIndex, name, starsTotal);
  hud.hideWin();
  hud.refresh();
}

// Load one of the built-in levels.
function loadLevel(index) {
  loadLevelData(LEVELS[index], LEVELS[index].name, { index });
}

// Try to switch to a built-in level (only if it's unlocked).
function selectLevel(index) {
  if (index >= 0 && index < LEVELS.length && levelUnlocked(index)) loadLevel(index);
}

// Play the track you built in the builder.
function playCustom() {
  loadLevelData(loadCustomTrack(), 'My Track', { custom: true });
}

// You collected the last star! Show the banner. For real levels, also unlock the
// car and save your progress. Custom tracks just say "nice one" (no unlocks).
function winLevel() {
  levelWon = true;
  if (isCustomLevel) {
    hud.showWin({ levelName, unlockedCarName: null, hasNext: false });
    return;
  }
  const data = LEVELS[currentLevelIndex];
  const firstTime = !progress.beaten.has(currentLevelIndex);
  progress.beaten.add(currentLevelIndex);
  saveProgress(progress);

  const unlockedName =
    firstTime && data.unlocks && CARS[data.unlocks] ? CARS[data.unlocks].name : null;
  hud.refresh(); // light up the newly-unlocked car and next level
  hud.showWin({
    levelName: data.name,
    unlockedCarName: unlockedName,
    hasNext: currentLevelIndex + 1 < LEVELS.length,
  });
}

// ---- BUILD MODE (the track builder) ----

// Enter the builder: hide the car and the normal HUD, clear the level.
function enterBuild() {
  buildMode = true;
  if (level) {
    level.dispose();
    level = null;
  }
  car.setVisible(false);
  hud.setHudVisible(false);
  builder.enter();
}

// Leave the builder and go back to normal play.
function exitBuild() {
  buildMode = false;
  builder.exit();
  car.setVisible(true);
  hud.setHudVisible(true);
  loadLevel(currentLevelIndex);
}

// Pressed "Play" in the builder: drive the track you just made.
function playBuiltTrack(data) {
  buildMode = false;
  builder.exit();
  car.setVisible(true);
  hud.setHudVisible(true);
  loadLevelData(data, 'My Track', { custom: true });
}

// The HUD (speed, cameras, garage, level picker, win banner) and the keyboard.
const hud = createHud({
  onReset: () => car.respawn(),
  cars: carList,
  levels: LEVELS.map((l) => l.name),
  currentCar: currentCarId,
  onSelectCar: spawnCar,
  onSelectLevel: selectLevel,
  isCarUnlocked: carUnlocked,
  isLevelUnlocked: levelUnlocked,
  onNextLevel: () => selectLevel(currentLevelIndex + 1),
  onReplayLevel: () => (isCustomLevel ? playCustom() : loadLevel(currentLevelIndex)),
  onBuild: () => enterBuild(),
  onPlayCustom: () => playCustom(),
});

// The track builder. It uses the same camera and gets its own click handling.
const builder = createBuilder({
  scene,
  world,
  camera,
  canvas,
  onPlay: (data) => playBuiltTrack(data),
  onExit: () => exitBuild(),
});

const controls = createControls({
  onCamera: () => cameras.next(),
  onRespawn: () => car.respawn(),
  onSelectCarIndex: (n) => {
    if (carIds[n - 1]) spawnCar(carIds[n - 1]);
  },
});

// Start on the first level.
loadLevel(0);

// A clock so we know how much time passed since the last frame.
const clock = new THREE.Clock();
const carPos = new THREE.Vector3(); // reused each frame, not remade

// ---- 2. THE GAME LOOP ----------------------------------------------------

function frame() {
  requestAnimationFrame(frame);
  const delta = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  // In build mode we don't drive - just look down at the track you're making.
  if (buildMode) {
    builder.update(delta);
    renderer.render(scene, camera);
    return;
  }

  // Drive.
  const input = controls.getInput();
  car.controls(input);
  world.step(PHYSICS_STEP, delta, 10);
  car.update();
  dashboard.setSteer(car.steer);
  if (car.chassisBody.position.y < -20) car.respawn();

  // Spin and bob the stars, and check if the car has touched any.
  carPos.set(car.chassisBody.position.x, car.chassisBody.position.y, car.chassisBody.position.z);
  for (const star of level.stars) {
    if (star.collected) continue;
    star.mesh.rotation.y += delta * 2.5; // spin
    star.mesh.position.y = star.baseY + Math.sin(time * 3 + star.position.x) * 0.25; // bob
    if (carPos.distanceTo(star.position) < COLLECT_RADIUS) {
      star.collected = true;
      star.mesh.visible = false;
      starsCollected++;
      hud.setStars(starsCollected, starsTotal);
      if (starsTotal > 0 && starsCollected === starsTotal && !levelWon) winLevel();
    }
  }

  // Camera + on-screen numbers, then draw.
  cameras.update(delta);
  hud.update(car.getSpeedKmh(), cameras.getMode());
  renderer.render(scene, camera);
}

frame();
