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
- [ ] Step 4 — Tower placement (with path-blocking validation)
- [ ] Step 5 — Tower shooting + enemy death
- [ ] Step 6 — Second enemy + second tower
- [ ] Step 7 — Waves
- [ ] Step 8 — Economy
- [ ] Step 9 — Win / lose conditions
- [ ] Step 10 — Polish pass
