// ---------------------------------------------------------------------------
// Shared game constants. Keeping these in one place makes the later tuning pass
// (step 10) easy: numbers like tile size, colors, and grid dimensions live here.
// ---------------------------------------------------------------------------

// Grid: an open snowfield. 24 columns x 16 rows of 40px tiles = 960 x 640.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;

export const GRID_W = COLS * TILE; // 960
export const GRID_H = ROWS * TILE; // 640

// Layout: a top HUD/controls bar and a bottom tower palette, with the grid
// between them. The grid is offset down by TOP_BAR_H so UI never overlaps it.
export const TOP_BAR_H = 48;
export const BOTTOM_BAR_H = 86;
export const GRID_X = 0;
export const GRID_Y = TOP_BAR_H;

export const GAME_WIDTH = GRID_W; // 960
export const GAME_HEIGHT = TOP_BAR_H + GRID_H + BOTTOM_BAR_H; // 774

// Economy (step 8). Credits start fixed, are earned per kill, and are spent
// placing towers. Tuned further in the step-10 pass.
export const STARTING_CREDITS = 200;

// Game-speed multipliers the speed button cycles through.
export const SPEED_STEPS = [1, 2, 3];

// Game-time delay before an auto-started wave begins once the field is clear.
export const AUTO_START_DELAY_MS = 2000;

// Each tower of a given type costs a bit more than the last one you built
// (multiplied by this per existing tower of that type), so spamming one tower
// gets pricier. Selling refunds this fraction of everything spent on a tower.
export const COST_GROWTH = 1.15;
export const SELL_REFUND = 0.6;

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
  runner: 0xff5d8f, // Runner enemy (hot pink)
  disruptor: 0x9b6cff, // Disruptor enemy (violet)
  juggernaut: 0x444a5e, // Juggernaut enemy (dark slate)
  frostBody: 0x4fb6d6, // Frost Tower (icy blue)
  frostAccent: 0xe6fbff,
  plasmaBody: 0x7a3bd1, // Plasma Mortar (purple)
  plasmaAccent: 0xe3b8ff,
  teslaBody: 0x2f9e8f, // Tesla Coil (teal)
  teslaAccent: 0xb8fff2,
  emp: 0x9b6cff, // Disruptor EMP pulse
  frostAura: 0x8fdcff, // Frost slow tint
};

// Tower stats. Cost is wired up in step 8; range/damage/fire rate in step 5.
//   range     = pixels
//   fireRateMs = ms between shots
export const TOWERS = {
  sniper: {
    key: 'sniper',
    name: 'Sniper Tower',
    kind: 'shooter', // fires at enemies in range
    desc: 'Precise single-target damage, slow reload. Best against light units.',
    cost: 50,
    max: 14,
    range: 170,
    damage: 22,
    fireRateMs: 2000,
    tracerColor: 0xfff2a8,
    blocks: true, // a structure: enemies must route around it
    bodyColor: COLORS.sniperBody,
    accentColor: COLORS.sniperAccent,
  },
  tripwire: {
    key: 'tripwire',
    name: 'Tripwire Hook',
    kind: 'trap', // a ground trap: enemies walk over it
    desc: 'Ground trap. Big hit + freeze on Walkers/Juggernauts. Ignores fast units.',
    cost: 20,
    max: 20,
    blocks: false, // does NOT block the path
    damage: 80, // heavy hit to whatever trips it
    immobilizeMs: 1000, // briefly freezes the victim
    cooldownMs: 1400, // time to re-arm after triggering
    triggerRadius: 18, // how close a victim must be to trip it
    color: COLORS.tripwire,
    armColor: COLORS.tripwireArm,
  },
  frost: {
    key: 'frost',
    name: 'Frost Tower',
    kind: 'slow', // continuous slowing aura
    desc: 'Slows every enemy in range and chips away at them. A force multiplier.',
    cost: 40,
    max: 8,
    range: 120,
    slowFactor: 0.45, // enemies move at 45% speed inside the aura
    damagePerSec: 7, // light chip damage
    blocks: true,
    bodyColor: COLORS.frostBody,
    accentColor: COLORS.frostAccent,
  },
  plasma: {
    key: 'plasma',
    name: 'Plasma Mortar',
    kind: 'shooter',
    desc: 'Lobs shells that explode for AREA damage. Shreds tight groups and swarms.',
    cost: 70,
    max: 10,
    range: 190,
    damage: 24,
    fireRateMs: 1800,
    splashRadius: 58, // everything within this of the impact is hit
    tracerColor: 0xe3b8ff,
    blocks: true,
    bodyColor: COLORS.plasmaBody,
    accentColor: COLORS.plasmaAccent,
  },
  tesla: {
    key: 'tesla',
    name: 'Tesla Coil',
    kind: 'shooter',
    desc: 'Fast arcs of lightning that CHAIN between several nearby enemies.',
    cost: 85,
    max: 8,
    range: 165,
    damage: 16,
    fireRateMs: 850,
    chainCount: 3, // extra targets the bolt jumps to
    chainRange: 95, // max jump distance between links
    chainFalloff: 0.75, // damage multiplier per jump
    tracerColor: 0xb8fff2,
    blocks: true,
    bodyColor: COLORS.teslaBody,
    accentColor: COLORS.teslaAccent,
  },
};

// Display order for the tower palette.
export const TOWER_ORDER = ['sniper', 'tripwire', 'frost', 'plasma', 'tesla'];

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
  runner: {
    key: 'runner',
    name: 'Runner',
    hp: 18,
    speed: 195, // blisteringly fast
    damage: 3,
    reward: 4,
    radius: 7,
    shape: 'circle',
    color: COLORS.runner,
    triggersTripwire: false, // far too quick to trip the hook
  },
  disruptor: {
    key: 'disruptor',
    name: 'Disruptor',
    hp: 95,
    speed: 78,
    damage: 12,
    reward: 18,
    radius: 12,
    shape: 'diamond',
    color: COLORS.disruptor,
    triggersTripwire: false,
    // Stun attack: every intervalMs, disables the nearest tower in range.
    stunsTowers: { range: 95, intervalMs: 2600, durationMs: 2600 },
  },
  juggernaut: {
    key: 'juggernaut',
    name: 'Juggernaut',
    hp: 620,
    speed: 32, // very slow
    damage: 60, // devastating if it reaches the base
    reward: 60,
    radius: 19,
    shape: 'square',
    color: COLORS.juggernaut,
    triggersTripwire: true,
  },
};
