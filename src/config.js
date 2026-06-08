// ---------------------------------------------------------------------------
// Shared game constants. Keeping these in one place makes the later tuning pass
// (step 10) easy: numbers like tile size, colors, and grid dimensions live here.
// ---------------------------------------------------------------------------

// Grid: an open snowfield. 24 columns x 16 rows of 40px tiles = 960 x 640.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;

export const GAME_WIDTH = COLS * TILE; // 960
export const GAME_HEIGHT = ROWS * TILE; // 640

// Economy (step 8). Credits start fixed, are earned per kill, and are spent
// placing towers. Tuned further in the step-10 pass.
export const STARTING_CREDITS = 150;

// Game-speed multipliers the speed button cycles through.
export const SPEED_STEPS = [1, 2, 3];

// Game-time delay before an auto-started wave begins once the field is clear.
export const AUTO_START_DELAY_MS = 2000;

// Palette (ice-planet theme). Hex numbers for Phaser fills.
export const COLORS = {
  snow: 0xdfe9f5, // base snowfield
  snowAlt: 0xd3e0f0, // checkerboard alternate
  grid: 0xb6c7dd, // grid lines
  spawn: 0xe05a47, // enemy entry point (warm red)
  base: 0x2bd4d9, // shield generator core (cyan)
  baseRing: 0x12808a, // shield generator ring
  text: 0x12386b, // dark blue text
  path: 0x6f8fbf, // debug path overlay
  lightScout: 0xffb24d, // Light Scout enemy (orange)
  sniperBody: 0x3b5b8c, // Sniper Tower body (steel blue)
  sniperAccent: 0xbcd4ff, // Sniper Tower barrel
  ghostOk: 0x39c06a, // valid placement preview (green)
  ghostBad: 0xe05a47, // invalid placement preview (red)
  uiPanel: 0x0b1320, // UI bar background
  uiButton: 0x1c2c46, // UI button
  uiButtonOn: 0x2b7de9, // selected UI button
  heavyWalker: 0x7a6f9b, // Heavy Walker enemy (slate purple)
  tripwire: 0xf2c14e, // Tripwire Hook trap (hazard yellow)
  tripwireArm: 0x8a6d1f, // Tripwire when on cooldown (dimmed)
};

// Tower stats. Cost is wired up in step 8; range/damage/fire rate in step 5.
//   range     = pixels
//   fireRateMs = ms between shots
export const TOWERS = {
  sniper: {
    key: 'sniper',
    name: 'Sniper Tower',
    kind: 'shooter', // fires at enemies in range
    cost: 50,
    range: 220,
    damage: 30,
    fireRateMs: 1500,
    tracerColor: 0xfff2a8,
    blocks: true, // a structure: enemies must route around it
    bodyColor: COLORS.sniperBody,
    accentColor: COLORS.sniperAccent,
  },
  tripwire: {
    key: 'tripwire',
    name: 'Tripwire Hook',
    kind: 'trap', // a ground trap: enemies walk over it
    cost: 20,
    blocks: false, // does NOT block the path
    damage: 80, // heavy hit to whatever trips it
    immobilizeMs: 1000, // briefly freezes the victim
    cooldownMs: 1400, // time to re-arm after triggering
    triggerRadius: 18, // how close a victim must be to trip it
    color: COLORS.tripwire,
    armColor: COLORS.tripwireArm,
  },
};

// Enemy stats. Tuned for the slow, cerebral pace; refined in the step-10 pass.
//   speed  = pixels per second
//   damage = HP removed from the shield generator if it reaches the base
export const ENEMIES = {
  lightScout: {
    key: 'lightScout',
    name: 'Light Scout',
    hp: 30,
    speed: 115,
    damage: 5,
    reward: 5, // credits awarded on kill
    radius: 9,
    shape: 'circle', // nimble scout
    color: COLORS.lightScout,
    triggersTripwire: false, // too fast/light to trip the hook
  },
  heavyWalker: {
    key: 'heavyWalker',
    name: 'Heavy Walker',
    hp: 200,
    speed: 45,
    damage: 25,
    reward: 20, // credits awarded on kill
    radius: 15,
    shape: 'square', // bulky four-legged walker
    color: COLORS.heavyWalker,
    triggersTripwire: true, // heavy enough to set off the hook
  },
};
