// world.js
// ---------------------------------------------------------------------------
// The world you can SEE: the sky, the sun, the shadows, the big flat ground,
// and the ramps. It uses Three.js.
//
// Remember: physics.js is the invisible maths world. This file is the picture.
// The game loop in main.js keeps the two lined up.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PIECES } from './pieces.js';

// Set up the renderer, scene, camera, sky, sun and ground all in one go.
export function createWorld(canvas) {
  // The renderer is the thing that actually draws pixels onto the canvas.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; // let things cast shadows
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // soft, not jagged, shadows

  // The scene is the container that holds everything in the 3D world.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b7e0); // sky blue
  // Fog makes far-away things fade into the sky. It hides the edge of the
  // ground and makes the world feel big.
  scene.fog = new THREE.Fog(0x87b7e0, 120, 600);

  // The camera is your eye. cameras.js moves it around each frame; here we just
  // create it with a normal 60-degree view.
  const camera = new THREE.PerspectiveCamera(
    60, // field of view (how wide you see)
    window.innerWidth / window.innerHeight, // shape of the window
    0.1, // nearest thing you can see
    1000 // farthest thing you can see
  );

  addLights(scene);
  addGround(scene);

  // Keep everything the right shape when the window is resized.
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera };
}

// Sunlight (makes shadows) plus a soft fill light (so shadows aren't pitch black).
function addLights(scene) {
  // Soft light coming from everywhere, so nothing is fully black.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x557733, 0.6));

  // The sun. A directional light shines like the sun: parallel rays, and it is
  // the one that casts the car's shadow onto the ground.
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(50, 80, 30);
  sun.castShadow = true;
  // The shadow "camera" is the box the sun checks for shadows inside. We make
  // it big enough to cover where the car drives.
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 300;
  scene.add(sun);
}

// The big flat ground. A grid pattern is painted on it so you can SEE how fast
// you are moving - a plain colour would look still even at top speed.
function addGround(scene) {
  const geometry = new THREE.PlaneGeometry(2000, 2000);
  const texture = makeGridTexture();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(400, 400); // repeat the grid lots of times across the ground
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2; // lay it flat
  ground.receiveShadow = true; // let the car's shadow land on it
  scene.add(ground);
}

// Paint a single grid square onto a tiny canvas, which we then tile across the
// whole ground. Green grass with darker lines.
function makeGridTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#5aa84b'; // grass green
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#4c9440'; // slightly darker line
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// ---------------------------------------------------------------------------
// RAMPS
// A ramp is built from the PIECES.ramp entry. We build it as a tilted slab:
// a box turned at an angle so its top face is a slope. Building the picture and
// the physics from the SAME numbers means they always match perfectly.
//
// The clever bit: we place the slab so its top-front edge sits exactly on the
// ground (y = 0). That means the car rolls straight from the grass onto the
// slope with no bump or wall to catch on.
// ---------------------------------------------------------------------------

// Scatter a few ramps around so you can test jumps right away.
// Each placement is a spot on the ground and a direction to face.
const RAMP_PLACEMENTS = [
  { x: 0, z: -30, yaw: 0 },
  { x: 30, z: -60, yaw: Math.PI / 2 },
  { x: -35, z: -20, yaw: -Math.PI / 4 },
  { x: 15, z: -95, yaw: 0 },
];

export function buildRamps(scene, world) {
  const shape = PIECES.ramp.shape;

  for (const spot of RAMP_PLACEMENTS) {
    buildOneRamp(scene, world, shape, spot);
  }
}

// How many little slabs we chain together to make the smooth curve. More = smoother.
const RAMP_SEGMENTS = 8;

function buildOneRamp(scene, world, shape, spot) {
  const R = shape.runLength; // how far along the ground the slope runs
  const H = shape.height; // how tall the lip is
  const w = shape.width; // how wide

  // A hard-angled wedge makes a fast car CRASH into it. So instead the ramp is
  // a smooth CURVE that starts flat and bends up to the launch lip, like a real
  // skate ramp. The curve is a parabola: y = H * (fraction along the run)^2.
  // Flat at the bottom (so the car slides on smoothly), steep at the top (so it
  // flies). We build the curve out of several short straight slabs.
  const surfacePoint = (s) => {
    // s goes 0 (entry, on the ground) to 1 (lip, up high).
    const dist = s * R;
    return new THREE.Vector3(0, H * s * s, R / 2 - dist);
  };

  // The whole ramp turns to face its direction and moves to its spot.
  const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw);
  const place = new THREE.Vector3(spot.x, 0, spot.z);

  const material = new THREE.MeshStandardMaterial({ color: shape.color });

  // Build one slab for each step along the curve, joining point to point.
  for (let i = 0; i < RAMP_SEGMENTS; i++) {
    const p0 = surfacePoint(i / RAMP_SEGMENTS);
    const p1 = surfacePoint((i + 1) / RAMP_SEGMENTS);
    buildSlab(scene, world, p0, p1, w, material, yawQuat, place);
  }
}

// Build ONE straight slab whose top face is the line from p0 to p1.
function buildSlab(scene, world, p0, p1, w, material, yawQuat, place) {
  const t = 0.5; // how thick the slab is
  const length = p0.distanceTo(p1);

  // Directions for this slab: along it, across it, and up out of its top face.
  const along = new THREE.Vector3().subVectors(p1, p0).normalize();
  const across = new THREE.Vector3(1, 0, 0);
  const up = new THREE.Vector3().crossVectors(across, along).normalize();

  // Make a proper right-handed rotation (see the note we learned the hard way:
  // a left-handed set makes a broken quaternion and the slab can't be hit).
  const boxZ = new THREE.Vector3().crossVectors(across, up).normalize();
  const basis = new THREE.Matrix4().makeBasis(across, up, boxZ);
  const localQuat = new THREE.Quaternion().setFromRotationMatrix(basis);

  // Centre sits half a thickness below the middle of the top face.
  const topMid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
  const localCenter = topMid.clone().addScaledVector(up, -t / 2);

  // Turn and move the slab into the world.
  const worldQuat = yawQuat.clone().multiply(localQuat);
  const worldPos = localCenter.clone().applyQuaternion(yawQuat).add(place);

  // --- The picture. The slabs meet end-to-end (no overlap): overlapping tilted
  // boxes would poke above each other and make little ridges the wheels slam
  // into, which scrubs off all your speed. ---
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, t, length), material);
  mesh.position.copy(worldPos);
  mesh.quaternion.copy(worldQuat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // --- The physics: same box, same place. ---
  const body = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(w / 2, t / 2, length / 2)),
  });
  body.position.set(worldPos.x, worldPos.y, worldPos.z);
  body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);
  // MUST do this after moving/rotating the body: it tells the engine to
  // recalculate the box's bounding area. Without it the engine still thinks the
  // box is back at the origin, so the wheel-rays never find the ramp and the
  // car drives straight through it. (This one line cost us a LOT of debugging.)
  body.aabbNeedsUpdate = true;
  world.addBody(body);
}
