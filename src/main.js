// main.js
// ---------------------------------------------------------------------------
// THE HEART OF THE GAME. Read this file first!
//
// It does two things:
//   1. SET UP: build the world, the physics, the car, the cameras and the HUD.
//   2. THE GAME LOOP: a function that runs about 60 times every second, forever.
//      Each time round the loop it:
//         read the keys  ->  push the car  ->  step the physics
//         ->  move the pictures  ->  move the camera  ->  draw the frame
//
// Everything else in src/ is a helper this file glues together.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { createWorld, buildRamps } from './world.js';
import { createPhysicsWorld, PHYSICS_STEP } from './physics.js';
import { createCar } from './car.js';
import { CARS } from './cars.js';
import { createDashboard } from './dashboard.js';
import { createCameras } from './cameras.js';
import { createControls } from './controls.js';
import { createHud } from './hud.js';

// ---- 1. SET UP -----------------------------------------------------------

const canvas = document.getElementById('game');

// The 3D world you see (sky, sun, ground, ramps) and the invisible physics world.
const { renderer, scene, camera } = createWorld(canvas);
const { world } = createPhysicsWorld();

// Build the ramps into BOTH worlds from the pieces.js recipe.
buildRamps(scene, world);

// The list of cars for the garage picker, built straight from cars.js. Add a
// car there and it shows up here automatically - no code to change.
const carIds = Object.keys(CARS);
const carList = carIds.map((id) => ({
  id,
  name: CARS[id].name,
  color: CARS[id].body.color,
  stats: CARS[id].stats,
  blurb: CARS[id].blurb,
}));

// The car we're driving right now. These are `let` (not `const`) because the
// garage swaps them out for a different car when you pick one.
let currentCarId = 'raceCar';
let car = createCar(scene, world, currentCarId);
let dashboard = createDashboard(car);

// The three cameras (they follow whichever car is current).
const cameras = createCameras(camera, car, dashboard);

// THE GARAGE: swap to a different car. We throw away the old car and build the
// new one, then point the cameras and dashboard at it. Picking the car you're
// already in just sends you back to the start.
function spawnCar(id) {
  if (!CARS[id]) return;
  if (id === currentCarId) {
    car.respawn();
    return;
  }
  car.destroy(); // remove the old car from both worlds (this also removes its dashboard)
  currentCarId = id;
  car = createCar(scene, world, id);
  dashboard = createDashboard(car);
  cameras.setTarget(car, dashboard); // cameras now follow the new car
  hud.setActiveCar(id); // highlight the chosen car in the picker
}

// The HUD (speed, camera name, reset button, and the car picker) and the keyboard.
const hud = createHud({
  onReset: () => car.respawn(),
  cars: carList,
  currentCar: currentCarId,
  onSelectCar: spawnCar,
});
const controls = createControls({
  onCamera: () => cameras.next(),
  onRespawn: () => car.respawn(),
  // Number keys 1, 2, 3... are shortcuts for picking a car.
  onSelectCarIndex: (n) => {
    if (carIds[n - 1]) spawnCar(carIds[n - 1]);
  },
});

// A clock so we know how much time passed since the last frame.
const clock = new THREE.Clock();

// ---- 2. THE GAME LOOP ----------------------------------------------------

function frame() {
  // Ask the browser to call this function again for the next frame.
  requestAnimationFrame(frame);

  // How many seconds since the last frame. We cap it so that if the game
  // freezes for a moment (e.g. you switch tabs) the car doesn't teleport.
  const delta = Math.min(clock.getDelta(), 0.05);

  // READ THE KEYS and push the car with them (must happen BEFORE physics).
  const input = controls.getInput();
  car.controls(input);

  // STEP THE PHYSICS. cannon-es moves everything by the laws of physics.
  // It takes fixed little steps so the car feels the same on every computer.
  world.step(PHYSICS_STEP, delta, 10);

  // MOVE THE PICTURES to wherever the physics ended up.
  car.update();
  dashboard.setSteer(car.steer);

  // If the car fell off the edge of the world, put it back.
  if (car.chassisBody.position.y < -20) car.respawn();

  // MOVE THE CAMERA and update the on-screen numbers.
  cameras.update(delta);
  hud.update(car.getSpeedKmh(), cameras.getMode());

  // DRAW this frame.
  renderer.render(scene, camera);
}

// Kick off the loop.
frame();
