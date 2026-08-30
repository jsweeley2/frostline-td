// physics.js
// ---------------------------------------------------------------------------
// Sets up the invisible physics world using cannon-es.
// cannon-es doesn't draw anything - it only works out where things SHOULD be
// (falling, bouncing, driving). Then world.js copies those positions onto the
// 3D shapes you can actually see.
//
// Think of it as two worlds stacked on top of each other:
//   - the physics world (invisible, does the maths)  <- this file
//   - the 3D world (what you see)                    <- world.js
// ---------------------------------------------------------------------------

import * as CANNON from 'cannon-es';

export function createPhysicsWorld() {
  const world = new CANNON.World();

  // Gravity pulls everything down. -9.82 is real Earth gravity (metres/sec/sec).
  // We could make it stronger to feel "snappier", but real gravity feels good.
  world.gravity.set(0, -9.82, 0);

  // How the engine figures out what MIGHT be touching. We use the simple
  // "naive" one on purpose: the faster "SAP" one has a bug where the car's
  // wheel-rays can't find our tilted ramp blocks, so the car would drive
  // straight through every ramp. Naive checks everything, which for one car and
  // a few ramps is plenty fast.
  world.broadphase = new CANNON.NaiveBroadphase();

  // A material is a "kind of surface". We give the ground its own material so
  // later we can control how grippy it is against different things.
  const groundMaterial = new CANNON.Material('ground');

  // The ground is a HUGE flat box, with its top surface exactly at y = 0.
  // We use a box instead of an infinite plane because the car's wheel-rays
  // reliably "see" a box - they can miss an infinite plane, which would make
  // the car fall straight through its own wheels. The box is 2km wide, so you
  // won't reach the edge.
  const groundBody = new CANNON.Body({
    mass: 0, // never moves
    shape: new CANNON.Box(new CANNON.Vec3(1000, 1, 1000)),
    material: groundMaterial,
  });
  groundBody.position.set(0, -1, 0); // push it down 1 so its TOP is at y = 0
  groundBody.aabbNeedsUpdate = true; // recalc its bounding area after moving it
  world.addBody(groundBody);

  return { world, groundMaterial, groundBody };
}

// How much time each physics step covers. 1/60 = sixty steps a second, which
// matches most screens. Using a FIXED step keeps the car feeling the same on
// fast and slow computers.
export const PHYSICS_STEP = 1 / 60;
