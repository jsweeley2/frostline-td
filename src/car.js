// car.js
// ---------------------------------------------------------------------------
// Builds ONE car and makes it drive. It reads all its numbers from cars.js, so
// this file has NO numbers of its own to tweak - change the feel in cars.js.
//
// The magic here is cannon-es's RaycastVehicle. Instead of four real spinning
// wheels (which are hard to keep stable), each wheel is a RAY: an invisible
// line pointing down from the car. The ray measures how far the ground is, and
// a spring pushes the car up. That spring is what makes the car:
//   - lean in corners
//   - squash down when it lands a jump
//   - bounce a little
// It also lets the car launch off ramps and fly, because when the ray finds no
// ground, that corner just falls.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { getCar } from './cars.js';

// Where the car appears when the game starts or when you press R.
const SPAWN = new THREE.Vector3(0, 2, 5);

export function createCar(scene, world, carId) {
  const spec = getCar(carId); // all the feel numbers live here

  // --- The chassis: the main body block that everything hangs off ---
  const c = spec.body.chassis; // the size you SEE
  const col = spec.body.collision; // the (smaller) size the physics feels
  const chassisShape = new CANNON.Box(
    new CANNON.Vec3(col.width / 2, col.height / 2, col.length / 2)
  );
  const chassisBody = new CANNON.Body({ mass: spec.mass });
  // Add the collision block lifted up a bit so its corners clear ramps.
  chassisBody.addShape(chassisShape, new CANNON.Vec3(0, col.offsetY, 0));
  chassisBody.position.copy(SPAWN);
  chassisBody.angularDamping = 0.4; // stops endless spinning in the air
  // IMPORTANT: never let the car "sleep". cannon-es puts still bodies to sleep
  // to save work, but a sleeping car ignores the engine, so it would never
  // start moving. Turning sleep off keeps it always ready to drive.
  chassisBody.allowSleep = false;
  world.addBody(chassisBody);

  // --- The RaycastVehicle: the thing that turns the chassis into a car ---
  const vehicle = new CANNON.RaycastVehicle({
    chassisBody,
    indexRightAxis: 0, // x is left-right
    indexUpAxis: 1, // y is up-down
    indexForwardAxis: 2, // z is front-back
  });

  // Settings shared by all four wheels, taken from the car's suspension spec.
  const s = spec.suspension;
  const wheelOptions = {
    radius: spec.wheel.radius,
    directionLocal: new CANNON.Vec3(0, -1, 0), // suspension pushes straight down
    axleLocal: new CANNON.Vec3(-1, 0, 0), // wheels spin around the left-right axis
    suspensionStiffness: s.stiffness,
    suspensionRestLength: s.restLength,
    maxSuspensionTravel: s.travel,
    dampingCompression: s.compression,
    dampingRelaxation: s.relaxation,
    maxSuspensionForce: s.maxForce,
    frictionSlip: spec.frictionSlip,
    rollInfluence: spec.rollInfluence,
    // These two make hard cornering slide nicely instead of snapping.
    customSlidingRotationalSpeed: -30,
    useCustomSlidingRotationalSpeed: true,
    chassisConnectionPointLocal: new CANNON.Vec3(), // set per-wheel just below
  };

  // The four corners the wheels connect to. Left is +x, forward is -z.
  const aw = spec.axleWidth;
  const corners = [
    { x: aw, z: spec.frontZ, front: true }, // front-left
    { x: -aw, z: spec.frontZ, front: true }, // front-right
    { x: aw, z: spec.backZ, front: false }, // back-left
    { x: -aw, z: spec.backZ, front: false }, // back-right
  ];
  const isFrontWheel = [];
  for (const corner of corners) {
    wheelOptions.chassisConnectionPointLocal.set(corner.x, spec.wheelY, corner.z);
    vehicle.addWheel(wheelOptions);
    isFrontWheel.push(corner.front);
  }
  vehicle.addToWorld(world);

  // --- The pictures: the body, cabin and four wheels you actually see ---
  const carGroup = new THREE.Group();
  scene.add(carGroup);

  // Body block.
  const bodyMesh = boxMesh(c.width, c.height, c.length, spec.body.color);
  // Cabin block sits on top and a bit back, just for looks.
  const cab = spec.body.cabin;
  const cabinMesh = boxMesh(cab.width, cab.height, cab.length, spec.body.cabinColor);
  cabinMesh.position.set(0, c.height / 2 + cab.height / 2, cab.offsetZ);
  const chassisMesh = new THREE.Group();
  chassisMesh.add(bodyMesh);
  chassisMesh.add(cabinMesh);
  carGroup.add(chassisMesh);

  // Wheel pictures. The cylinder is turned so its round faces point sideways.
  const wheelMeshes = [];
  for (let i = 0; i < vehicle.wheelInfos.length; i++) {
    const geo = new THREE.CylinderGeometry(
      spec.wheel.radius,
      spec.wheel.radius,
      spec.wheel.width,
      24
    );
    geo.rotateZ(Math.PI / 2); // point the wheel's axle along x (left-right)
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: spec.wheel.color }));
    mesh.castShadow = true;
    carGroup.add(mesh);
    wheelMeshes.push(mesh);
  }

  // How much the front wheels are currently steered, from -1 (right) to 1 (left).
  // The cockpit steering wheel reads this to know how far to spin.
  let currentSteer = 0;

  // Whether the car was touching the ground at the end of the last physics step.
  // We MUST remember it here: updating the wheel pictures wipes the physics
  // engine's own contact flag, so we read it once per step and store it.
  let grounded = false;

  // -------------------------------------------------------------------------
  // controls(): called every frame BEFORE the physics step. Turns the keys you
  // are pressing into engine force, steering, braking - and, when you are in
  // the air, into flips and spins.
  // -------------------------------------------------------------------------
  function controls(input) {
    const grounded = isGrounded();

    // Steering: ease towards the target so it feels smooth, not twitchy.
    const targetSteer = input.steer * spec.maxSteer; // input.steer is -1..1
    currentSteer += (targetSteer - currentSteer) * 0.2;
    vehicle.setSteeringValue(currentSteer, 0); // front-left
    vehicle.setSteeringValue(currentSteer, 1); // front-right

    // Engine: push forward/back. A positive engine force drives the car towards
    // its front (the -z direction), which is what W / Up should do.
    const force = input.throttle * spec.engineForce;
    // Drive all four wheels (four-wheel drive grips best).
    for (let i = 0; i < 4; i++) vehicle.applyEngineForce(force, i);

    // Braking. Space is the handbrake (locks the back wheels for slides).
    const brake = input.handbrake ? spec.handbrakeForce : input.brake ? spec.brakeForce : 0;
    if (input.handbrake) {
      // Handbrake grabs the BACK wheels only, so the tail slides round.
      vehicle.setBrake(0, 0);
      vehicle.setBrake(0, 1);
      vehicle.setBrake(spec.handbrakeForce, 2);
      vehicle.setBrake(spec.handbrakeForce, 3);
    } else {
      for (let i = 0; i < 4; i++) vehicle.setBrake(brake, i);
    }

    // Air control: only when all four wheels are off the ground. This is how
    // you line the car up to land on its wheels - and how you show off.
    if (!grounded) {
      airControl(input);
    }
  }

  // Nudge the car's spin while flying. Left/right yaw it, up/down flip it.
  function airControl(input) {
    const spin = 6; // how fast you can spin in the air
    const av = chassisBody.angularVelocity;
    // Work out the car's own left and sideways directions in the world, so a
    // "flip" always flips head-over-heels no matter which way it is pointing.
    const carRight = new CANNON.Vec3(1, 0, 0);
    chassisBody.quaternion.vmult(carRight, carRight);
    const carUp = new CANNON.Vec3(0, 1, 0);
    chassisBody.quaternion.vmult(carUp, carUp);

    // Up/Down = front flip / back flip (spin around the car's side axis).
    if (input.throttle !== 0) {
      av.x += carRight.x * spin * 0.05 * input.throttle;
      av.y += carRight.y * spin * 0.05 * input.throttle;
      av.z += carRight.z * spin * 0.05 * input.throttle;
    }
    // Left/Right = spin flat like a top (around the car's up axis).
    if (input.steer !== 0) {
      av.x += carUp.x * spin * 0.05 * input.steer;
      av.y += carUp.y * spin * 0.05 * input.steer;
      av.z += carUp.z * spin * 0.05 * input.steer;
    }
  }

  // -------------------------------------------------------------------------
  // update(): called every frame AFTER the physics step. Copies the positions
  // the physics engine worked out onto the pictures you see.
  // -------------------------------------------------------------------------
  function update() {
    // FIRST, remember if we're on the ground. We have to check this BEFORE the
    // wheel-picture update below, because that update clears the contact flag.
    grounded = false;
    for (const info of vehicle.wheelInfos) {
      if (info.isInContact) {
        grounded = true;
        break;
      }
    }

    // Move the body picture to match the physics chassis.
    chassisMesh.position.copy(chassisBody.position);
    chassisMesh.quaternion.copy(chassisBody.quaternion);

    // Move each wheel picture to match its physics wheel (this shows steering
    // and spinning).
    for (let i = 0; i < vehicle.wheelInfos.length; i++) {
      vehicle.updateWheelTransform(i);
      const t = vehicle.wheelInfos[i].worldTransform;
      wheelMeshes[i].position.copy(t.position);
      wheelMeshes[i].quaternion.copy(t.quaternion);
    }
  }

  // True when at least one wheel was touching the ground last step.
  function isGrounded() {
    return grounded;
  }

  // Speed in km/h (nicer to read than metres per second).
  function getSpeedKmh() {
    return Math.abs(chassisBody.velocity.length()) * 3.6;
  }

  // Put the car back at the start, upright and still. Used by R and the reset button.
  function respawn() {
    chassisBody.position.copy(SPAWN);
    chassisBody.quaternion.set(0, 0, 0, 1);
    chassisBody.velocity.set(0, 0, 0);
    chassisBody.angularVelocity.set(0, 0, 0);
  }

  // Everything the rest of the game needs to talk to the car.
  return {
    chassisBody,
    chassisMesh, // cameras read this to sit behind / inside the car
    controls,
    update,
    respawn,
    getSpeedKmh,
    isGrounded,
    get steer() {
      return currentSteer / spec.maxSteer; // -1..1, for the cockpit wheel
    },
  };
}

// Little helper so we don't repeat the "make a box you can see" code.
function boxMesh(width, height, length, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, length),
    new THREE.MeshStandardMaterial({ color })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
