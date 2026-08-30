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
  // The one car we have in Phase 1: a race car. Fast and a little slippery.
  raceCar: {
    name: 'Race Car',

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
};

// A tiny helper so other files can grab a car by its id without repeating the
// CARS[...] lookup everywhere.
export function getCar(id) {
  const car = CARS[id];
  if (!car) throw new Error(`No car called "${id}" in cars.js`);
  return car;
}
