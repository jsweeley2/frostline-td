// levels.js
// ---------------------------------------------------------------------------
// EVERY level is ONE entry in this file (just like cars.js and pieces.js).
// A level says:
//   - name      : what to call it
//   - unlocks   : which car you win by beating it (an id from cars.js)
//   - ramps     : where to put ramps  ({ x, z, yaw })
//   - stars     : where to put collectible stars  ([x, y, z])
//
// You BEAT a level by collecting every star. Stars on the ground (y about 1)
// are easy; stars up in the air (higher y) need a jump off a ramp, so later
// levels put more stars in the sky.
//
// Add a new level = add one entry here. Nothing else to change.
// ---------------------------------------------------------------------------

export const LEVELS = [
  {
    name: 'Warm-Up',
    unlocks: 'normalCar',
    ramps: [
      { x: 0, z: -30, yaw: 0 },
      { x: -18, z: -18, yaw: 0 },
    ],
    // All on the ground - just drive around and scoop them up.
    stars: [
      [6, 1, -8],
      [-8, 1, -20],
      [12, 1, -38],
      [-14, 1, -44],
      [0, 1, -52],
    ],
  },
  {
    name: 'Big Air',
    unlocks: 'monsterTruck',
    ramps: [
      { x: 0, z: -30, yaw: 0 },
      { x: -22, z: -48, yaw: 0 },
      { x: 22, z: -60, yaw: Math.PI / 2 },
    ],
    stars: [
      [9, 1, -14], // ground
      [-12, 1, -28], // ground
      [0, 3.2, -40], // in the air - jump the ramp at (0, -30)
      [-22, 3.2, -58], // in the air - jump the ramp at (-22, -48)
      [16, 1, -74], // ground, far away
    ],
  },
  {
    name: 'Stunt Master',
    unlocks: 'rocketCar',
    ramps: [
      { x: 0, z: -24, yaw: 0 },
      { x: 0, z: -58, yaw: 0 },
      { x: 20, z: -42, yaw: Math.PI / 2 },
      { x: -20, z: -42, yaw: -Math.PI / 2 },
    ],
    stars: [
      [0, 3.4, -33], // air - first ramp
      [0, 3.6, -67], // air - second ramp
      [13, 1, -30], // ground
      [-13, 1, -52], // ground
      [19, 1, -74], // ground, tucked in a corner
      [-19, 1, -20], // ground, tucked in a corner
    ],
  },
];
