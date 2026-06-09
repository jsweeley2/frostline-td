// ---------------------------------------------------------------------------
// Wave definitions. 20 hand-tuned waves of rising difficulty. Each wave is a
// list of groups that spawn in order; a group is one enemy type, a count, and
// the gap (ms) between each spawn. `startDelay` (ms) adds a pause before the
// group begins, letting you stagger or overlap types.
//
// Enemy introduction curve:
//   Scouts (1+), Runners (3, fast swarm), Heavy Walkers (4),
//   Disruptors (8, stun your towers), Juggernauts (13, boss). Late waves mix
//   everything. Tune freely in the polish pass; this is just data.
// ---------------------------------------------------------------------------

const scout = (count, gap = 700, startDelay = 0) => ({ type: 'lightScout', count, gap, startDelay });
const runner = (count, gap = 450, startDelay = 0) => ({ type: 'runner', count, gap, startDelay });
const walker = (count, gap = 1600, startDelay = 0) => ({ type: 'heavyWalker', count, gap, startDelay });
const disruptor = (count, gap = 1700, startDelay = 0) => ({ type: 'disruptor', count, gap, startDelay });
const jugg = (count, gap = 2600, startDelay = 0) => ({ type: 'juggernaut', count, gap, startDelay });

export const WAVES = [
  { groups: [scout(5, 900)] }, // 1
  { groups: [scout(8, 750)] }, // 2
  { groups: [scout(6, 700), runner(4, 400, 600)] }, // 3 — first Runners
  { groups: [scout(6, 650), walker(1, 1600, 600)] }, // 4 — first Walker
  { groups: [runner(8, 350), walker(2, 1500, 500)] }, // 5
  { groups: [walker(2, 1600), scout(10, 600, 300)] }, // 6
  { groups: [runner(12, 320), walker(3, 1400, 600)] }, // 7
  { groups: [disruptor(1, 1700), scout(10, 550, 300)] }, // 8 — first Disruptor
  { groups: [walker(4, 1300), disruptor(2, 1700, 500)] }, // 9
  { groups: [runner(16, 300), walker(3, 1300, 800)] }, // 10
  { groups: [disruptor(3, 1500), walker(4, 1300, 400)] }, // 11
  { groups: [walker(6, 1200), runner(12, 320, 300)] }, // 12
  { groups: [jugg(1, 2600), scout(14, 450, 400)] }, // 13 — first Juggernaut
  { groups: [disruptor(3, 1400), walker(7, 1100, 400)] }, // 14
  { groups: [jugg(2, 2400), runner(18, 280, 600)] }, // 15
  { groups: [walker(8, 1000), disruptor(4, 1300, 400), runner(14, 300, 600)] }, // 16
  { groups: [jugg(2, 2200), disruptor(4, 1300, 500)] }, // 17
  { groups: [walker(10, 950), runner(20, 260, 400), disruptor(3, 1400, 800)] }, // 18
  { groups: [jugg(3, 2000), walker(8, 1000, 600), disruptor(4, 1300, 400)] }, // 19
  { groups: [jugg(4, 1800), disruptor(5, 1200, 500), walker(8, 950, 700), runner(24, 240, 1000)] }, // 20 — finale
];
