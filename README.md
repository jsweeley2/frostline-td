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
- [ ] Step 10 — Polish pass (balance tuning)
