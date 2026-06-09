# Frostline TD

A browser-based, single-player **maze-style tower defense** game set on a sci-fi
ice planet. Defend the shield generator from invading forces. Built with
[Phaser 3](https://phaser.io/) and [Vite](https://vitejs.dev/).

## Running locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173).

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

## Deployment

Hosted on Vercel, auto-deploying from the `main` branch.

## Build status

Following the staged build order from the spec:

- [x] **Step 1** — Pipeline check: Phaser + Vite running locally and on Vercel (colored square)
- [x] **Step 2** — Grid + shield generator
- [x] **Step 3** — Enemy spawning + A* pathfinding (Light Scouts walk to base, damage it)
- [x] **Step 4** — Tower placement (Sniper Towers, block validation, live rerouting)
- [x] **Step 5** — Tower shooting + enemy death (targeting, tracers, range ring, kills)
- [x] **Step 6** — Heavy Walker enemy + Tripwire Hook trap (type interactions)
- [x] **Step 7** — Waves (20 hand-tuned waves + "Start Next Wave" button)
- [x] **Step 8** — Economy (starting credits, kill rewards, tower costs enforced)
- [x] **Controls** — speed toggle (1x/2x/3x), auto-start, rush-next-wave (overlapping waves)
- [x] **Step 9** — Win / lose conditions (Game Over + Victory screens, Play Again)
- [x] **Expansion** — 3 new enemies + 3 new towers + UI layout refactor (see below)
- [ ] Step 10 — Polish pass (balance tuning)

## Enemies

| Enemy | Traits | Counter |
|-------|--------|---------|
| Light Scout | fast, fragile | Sniper / Tesla |
| Runner | extremely fast, paper HP, swarms | Frost + AoE / Tesla |
| Heavy Walker | slow, high HP, trips hooks | Tripwire / Plasma |
| Disruptor | EMP that disables a nearby tower for a few seconds | kill it fast (Sniper/Plasma) |
| Juggernaut | boss: huge HP, devastating to the base, trips hooks | Tripwire chains + Frost + focus fire |

## Towers

| Tower | Cost | Ability |
|-------|------|---------|
| Sniper Tower | 50 | long range, high single-target, slow reload |
| Tripwire Hook | 20 | ground trap: big hit + freeze on heavy units, ignores fast ones |
| Frost Tower | 40 | slows + lightly damages every enemy in range (force multiplier) |
| Plasma Mortar | 70 | area-of-effect splash damage (anti-swarm) |
| Tesla Coil | 85 | fast chain lightning that arcs between several enemies |
