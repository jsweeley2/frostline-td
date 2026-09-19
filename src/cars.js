// cars.js
// ---------------------------------------------------------------------------
// EVERY car in the game is ONE entry in this file.
// A car is just a bag of numbers (how heavy, how strong, how grippy) plus the
// sizes of the boxes we build its body from.
//
// To add a new car later (monster truck, etc.) you add ONE new entry here.
// You do NOT touch car.js. That is the whole point of this file.
//
// The numbers with comments are the "feel" knobs. If the car feels wrong,
// this is the file you change. Try changing one number at a time.
// ---------------------------------------------------------------------------

export const CARS = {
  // Fast and a little slippery. The all-rounder that likes big jumps.
  raceCar: {
    name: 'Race Car',
    unlockedByDefault: true, // the car you start with; the rest are earned by beating levels
    // Little 1-5 bars shown on the "pick your car" screen. Just for looks.
    stats: { speed: 5, grip: 3, tough: 2 },
    blurb: 'Fast and zippy, slides in corners.',

    // --- How the physics engine treats the car ---
    mass: 400, // heavier = harder to push around, lands with more thud, harder to flip

    // --- Engine + steering + brakes ---
    // This force is shared across the 4 driven wheels. Too big and the car does
    // a wheelie and backflips, so we keep it sensible.
    engineForce: 900, // how hard EACH wheel pushes. Bigger = faster acceleration.
    maxSteer: 0.5, // biggest steering angle, in radians (~28 degrees). Bigger = sharper turns.
    brakeForce: 20, // gentle braking when you lift off the gas
    handbrakeForce: 90, // space bar. Big number = locks the back wheels for slides.

    // --- Suspension (the springs the wheels sit on) ---
    // This is what makes the car lean in corners and squash on landings.
    suspension: {
      stiffness: 55, // springy-ness. Higher = stiffer, lifts the car onto ramps faster.
      restLength: 0.5, // how long the spring is when nothing pushes on it (also = ground clearance)
      travel: 0.4, // how far the wheel can move up and down
      compression: 4.4, // how much it resists being squished (bounce control)
      relaxation: 2.3, // how much it resists springing back (bounce control)
      maxForce: 100000, // safety cap so a huge landing can't explode the springs
    },

    // --- Grip ---
    frictionSlip: 3.5, // how much the tyres grip the road. Lower = more slidey/driftier.
    rollInfluence: 0.15, // how much the car tips onto two wheels. Low = arcade, hard to flip.

    // --- The shape of the body, built from simple boxes ---
    // All sizes are in metres. IMPORTANT: the body is SHORTER than the distance
    // between the front and back wheels, so the wheels poke out past the nose
    // and tail. That lets the wheels climb a ramp first, instead of the nose
    // jamming into the slope like a wall.
    body: {
      // The main chassis box you SEE (just a picture).
      chassis: { width: 1.8, height: 0.5, length: 3.0 },
      // A smaller box on top for the cabin/roof, just for looks.
      cabin: { width: 1.5, height: 0.45, length: 1.6, offsetZ: -0.2 },
      // The collision block the PHYSICS uses. On purpose it is SHORTER than the
      // body and lifted up a little, so its corners don't dig into ramps. The
      // wheels touch the ramp first and lift the car; this block only matters
      // when you crash or land on the roof. This is the trick that lets the car
      // climb steep ramps instead of beaching on them like a boat.
      collision: { width: 1.6, height: 0.4, length: 2.0, offsetY: 0.12 },
      color: 0xff3355, // race-car red
      cabinColor: 0x222233, // dark windows
    },

    // --- The wheels ---
    wheel: {
      radius: 0.45,
      width: 0.3,
      color: 0x111111,
    },

    // Where the 4 wheels sit relative to the middle of the car.
    // x = left/right, y = up/down, z = front/back (negative z is forward).
    // We only list the front-left and back positions; the code mirrors x for
    // the right-side wheels so we never type the same numbers twice.
    axleWidth: 0.95, // half the distance between left and right wheels
    frontZ: -1.6, // front wheels, JUST past the nose (body half-length is 1.5)
    backZ: 1.6, // back wheels, JUST past the tail
    wheelY: -0.25, // how far down the wheels hang from the chassis middle
  },

  // Balanced and easy to drive. A good "just right" car.
  normalCar: {
    name: 'Normal Car',
    stats: { speed: 3, grip: 4, tough: 3 },
    blurb: 'Steady and grippy. Easy to control.',

    mass: 550,
    engineForce: 950,
    maxSteer: 0.5,
    brakeForce: 25,
    handbrakeForce: 100,
    suspension: {
      stiffness: 55,
      restLength: 0.5,
      travel: 0.4,
      compression: 4.4,
      relaxation: 2.3,
      maxForce: 120000,
    },
    frictionSlip: 4.5, // more grip than the race car = less sliding
    rollInfluence: 0.12,
    body: {
      chassis: { width: 1.9, height: 0.6, length: 3.2 },
      cabin: { width: 1.6, height: 0.55, length: 1.8, offsetZ: -0.1 },
      collision: { width: 1.7, height: 0.45, length: 2.0, offsetY: 0.12 },
      color: 0xffcc33, // sunny yellow
      cabinColor: 0x223344,
    },
    wheel: { radius: 0.48, width: 0.32, color: 0x111111 },
    axleWidth: 1.0,
    frontZ: -1.7,
    backZ: 1.7,
    wheelY: -0.28,
  },

  // Big, heavy and grippy, with fat wheels and soft springs so it can land
  // enormous jumps without flipping. Slower to get going.
  monsterTruck: {
    name: 'Monster Truck',
    stats: { speed: 2, grip: 5, tough: 5 },
    blurb: 'Huge and tough. Grips hard, lands big.',

    mass: 950,
    engineForce: 1900, // lots of push, but it is heavy so it still feels slow
    maxSteer: 0.55,
    brakeForce: 45,
    handbrakeForce: 160,
    suspension: {
      stiffness: 45, // softer springs soak up giant landings
      restLength: 0.75, // tall stance = big ground clearance
      travel: 0.7, // long travel so it bounces instead of slamming
      compression: 4.0,
      relaxation: 2.6,
      maxForce: 300000, // strong enough to hold up all that weight on a landing
    },
    frictionSlip: 5.5, // monster-truck tyres grip a lot
    rollInfluence: 0.1, // low so the tall body doesn't tip over
    body: {
      chassis: { width: 2.3, height: 0.8, length: 3.4 },
      cabin: { width: 1.9, height: 0.7, length: 2.0, offsetZ: -0.1 },
      collision: { width: 2.0, height: 0.55, length: 2.2, offsetY: 0.2 },
      color: 0x33aa55, // monster green
      cabinColor: 0x113322,
    },
    wheel: { radius: 0.8, width: 0.55, color: 0x0a0a0a }, // big fat tyres
    axleWidth: 1.25,
    frontZ: -1.75,
    backZ: 1.75,
    wheelY: -0.4,
  },

  // The secret reward car. Ridiculously fast and slippery - a handful to drive,
  // but a blast. You only get it by beating the last level.
  rocketCar: {
    name: 'Rocket Car',
    stats: { speed: 5, grip: 2, tough: 2 },
    blurb: 'Super fast and super slidey. For experts!',

    mass: 350,
    engineForce: 1250, // rockets off the line
    maxSteer: 0.5,
    brakeForce: 18,
    handbrakeForce: 80,
    suspension: {
      stiffness: 60,
      restLength: 0.45,
      travel: 0.4,
      compression: 4.6,
      relaxation: 2.4,
      maxForce: 100000,
    },
    frictionSlip: 2.8, // low grip = big slides
    rollInfluence: 0.16,
    body: {
      chassis: { width: 1.7, height: 0.45, length: 3.0 },
      cabin: { width: 1.3, height: 0.4, length: 1.4, offsetZ: -0.3 },
      collision: { width: 1.5, height: 0.38, length: 2.0, offsetY: 0.12 },
      color: 0x22e0e0, // electric cyan
      cabinColor: 0x101820,
    },
    wheel: { radius: 0.44, width: 0.3, color: 0x111111 },
    axleWidth: 0.95,
    frontZ: -1.6,
    backZ: 1.6,
    wheelY: -0.24,
  },

  // YOUR car. This is the starting design; the "Design Car" button rebuilds it
  // from your choices (colour, speed, grip, size) and saves it. Always unlocked.
  myCar: {
    name: 'My Car',
    unlockedByDefault: true,
    custom: true,
    stats: { speed: 3, grip: 3, tough: 3 },
    blurb: 'Design your own! Tap Design Car.',

    mass: 480,
    engineForce: 900,
    maxSteer: 0.5,
    brakeForce: 20,
    handbrakeForce: 95,
    suspension: {
      stiffness: 55,
      restLength: 0.5,
      travel: 0.4,
      compression: 4.4,
      relaxation: 2.3,
      maxForce: 150000,
    },
    frictionSlip: 4.1,
    rollInfluence: 0.14,
    body: {
      chassis: { width: 1.8, height: 0.5, length: 3.0 },
      cabin: { width: 1.4, height: 0.45, length: 1.6, offsetZ: -0.2 },
      collision: { width: 1.6, height: 0.4, length: 2.0, offsetY: 0.12 },
      color: 0xa970ff, // purple, until you pick your own
      cabinColor: 0x222233,
    },
    wheel: { radius: 0.45, width: 0.3, color: 0x111111 },
    axleWidth: 0.95,
    frontZ: -1.6,
    backZ: 1.6,
    wheelY: -0.25,
  },
};

// A tiny helper so other files can grab a car by its id without repeating the
// CARS[...] lookup everywhere.
export function getCar(id) {
  const car = CARS[id];
  if (!car) throw new Error(`No car called "${id}" in cars.js`);
  return car;
}
