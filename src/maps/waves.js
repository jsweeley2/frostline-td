// ---------------------------------------------------------------------------
// Wave definitions. 20 hand-tuned waves of rising difficulty. Each wave is a
// list of groups that spawn in order; a group is one enemy type, a count, and
// the gap (ms) between each spawn. `startDelay` (ms) adds a pause before the
// group begins, letting you stagger or overlap types.
//
// The difficulty curve: pure Light Scouts early (Sniper-friendly), Heavy
// Walkers introduced around wave 4, then ever-larger mixes — so the player must
// keep expanding and balancing Snipers vs Tripwire Hooks. Tune freely in the
// step-10 polish pass; this is just data.
// ---------------------------------------------------------------------------

const scout = (count, gap = 700, startDelay = 0) => ({
  type: 'lightScout',
  count,
  gap,
  startDelay,
});

const walker = (count, gap = 1600, startDelay = 0) => ({
  type: 'heavyWalker',
  count,
  gap,
  startDelay,
});

export const WAVES = [
  { groups: [scout(5, 900)] }, // 1
  { groups: [scout(8, 750)] }, // 2
  { groups: [scout(11, 650)] }, // 3
  { groups: [scout(6, 700), walker(1, 1600, 600)] }, // 4 — first Walker
  { groups: [scout(8, 650), walker(2, 1500, 600)] }, // 5
  { groups: [walker(2, 1600), scout(10, 600, 400)] }, // 6
  { groups: [scout(12, 550), walker(3, 1500, 500)] }, // 7
  { groups: [walker(3, 1400), scout(9, 550, 300)] }, // 8
  { groups: [walker(4, 1400), scout(11, 500, 300)] }, // 9
  { groups: [scout(15, 480), walker(3, 1300, 800)] }, // 10
  { groups: [walker(5, 1300), scout(8, 500, 300)] }, // 11
  { groups: [walker(6, 1200), scout(9, 480, 300)] }, // 12
  { groups: [scout(16, 450), walker(4, 1300, 600)] }, // 13
  { groups: [walker(7, 1200), scout(8, 480, 300)] }, // 14
  { groups: [walker(8, 1100), scout(11, 450, 300)] }, // 15
  { groups: [scout(20, 400), walker(5, 1200, 600)] }, // 16
  { groups: [walker(9, 1100), scout(10, 450, 300)] }, // 17
  { groups: [walker(10, 1000), scout(13, 420, 300)] }, // 18
  { groups: [walker(12, 1000), scout(11, 420, 300)] }, // 19
  { groups: [walker(15, 900), scout(20, 380, 500)] }, // 20 — finale
];
