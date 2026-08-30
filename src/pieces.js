// pieces.js
// ---------------------------------------------------------------------------
// EVERY track piece in the game is ONE entry in this file.
// Each entry describes three things:
//   1. shape    - how big it is and what colour (the renderer reads this)
//   2. collision - how the physics engine should feel it (derived from shape)
//   3. snap      - where the NEXT piece connects to this one (the builder reads this)
//
// Phase 1 only has ONE piece: a ramp, which we scatter around to jump off.
// Later, adding a loop-de-loop or a booster pad means adding ONE entry here
// and nothing else. The track builder, the renderer, and the save file will
// all read from this same file.
//
// A "snap point" is just a spot on the piece with a position and a direction
// the car is travelling when it reaches that spot. To join two pieces you line
// up one piece's EXIT with the next piece's ENTRY. We are not using this in
// Phase 1, but it is here so the track builder in Phase 2 just works.
// ---------------------------------------------------------------------------

export const PIECES = {
  // A ramp is a wedge: flat at the bottom, rising up to a launch lip.
  ramp: {
    name: 'Ramp',
    kind: 'ramp',

    // --- shape (all sizes in metres) ---
    // The slope is `runLength` long and rises by `height` over that distance.
    // The steepness is worked out from those two numbers, so if you make it
    // taller or shorter the launch angle changes automatically.
    shape: {
      width: 6, // how wide the ramp is (side to side)
      runLength: 9, // how long the slope is (front to back along the ground)
      height: 1.6, // how tall the launch lip is at the top
      color: 0x3388ff, // ramp blue
    },

    // --- snap points (used by the Phase 2 track builder, not yet) ---
    // Positions are relative to the middle of the piece. `dir` is the way the
    // car is pointing when it passes through that point.
    snap: {
      entry: { position: [0, 0, 4], dir: [0, 0, -1] }, // drive in at the bottom
      exit: { position: [0, 2.2, -4], dir: [0, 0, -1] }, // fly off the top lip
    },
  },
};

// Grab a piece by its id. Keeps the PIECES[...] lookup in one place.
export function getPiece(id) {
  const piece = PIECES[id];
  if (!piece) throw new Error(`No piece called "${id}" in pieces.js`);
  return piece;
}
