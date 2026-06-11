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
- [x] **Endless mode** — Campaign/Endless toggle; infinite procedurally-scaled waves
- [x] **Art pass** — original sprite art (baked in code in `src/art.js`), combat effects, animations
- [x] **Upgrades + border** — click a tower to upgrade it (3 levels); decorative field frame
- [x] **Title screen** — animated sci-fi title (aurora, starfield, ice planet) with a quote
- [x] **2-player modes** — mode-select menu: Attacker vs Defender + Score Duel (see below)
- [x] **Kill Shop** — every 5 cleared waves (solo), spend kills on stacking global perks
- [x] **Maps** — map picker; freeform maze + fixed-path lane maps (see below)
- [x] **Feel pass** — synth sound effects (M mutes), floating credit/damage numbers, pause (P), how-to screen, tower tooltips
- [x] **Meta** — tower targeting modes (First/Last/Closest/Strongest), boss waves every 10, saved Endless best-wave per map
- [ ] Step 10 — Polish pass (balance tuning)

## Meta features

- **Targeting modes:** select a placed shooter tower and cycle its target
  priority (First / Last / Closest / Strongest) in the panel.
- **Boss waves:** every 10th wave sends a giant Juggernaut boss (lots of HP, big
  credit reward) with a warning banner.
- **High scores:** Endless saves your best wave reached per map (localStorage);
  the end screen shows it and flags a new best.

## Maps

After picking a mode you choose a map:
- **Open Snowfield** (maze) — freeform; towers act as walls and the route is
  found with A* (the original mode).
- **Switchback Pass / The Gauntlet** (fixed path) — classic lane TD: enemies
  follow a preset winding lane and towers are placed beside it (they don't block).

## Kill Shop

In Solo, every 5th wave you clear pauses the game and opens a "Resupply" shop.
Your **kills** are the currency; spend them on stacking global perks: +shield HP,
+12% tower damage, +10% fire rate, +25% credit bounty, or instant credits.
Hit Continue to resume. Kill count shows in the HUD.

## Modes (mode-select menu after the title)

- **Solo Defense** — the normal 1-player game (Campaign or Endless).
- **Attacker vs Defender (2P)** — one player builds towers with the mouse; the
  other player presses number keys **1-5** to spend regenerating *menace* and
  send enemies (Runner / Scout / Disruptor / Walker / Juggernaut). The defender
  wins if the shield survives the countdown; the attacker wins if it falls.
- **Score Duel (2P)** — players take turns surviving Endless. When the shield
  falls, the other player takes over; the higher wave reached (kills as
  tiebreak) wins.

## Upgrading towers

Click a placed tower (when no tower button is selected) to open its panel, then
press **U** or click **Upgrade** to spend credits leveling it up (max Lv 3).
Each level boosts the tower's key stats (damage/range/fire rate, splash, chains,
slow strength, etc.). Gold pips above a tower show its level. Press **S** or
click **Sell** to remove a tower and refund part of what you spent on it.

## Economy rules

- Each tower type has a **build cap** (e.g. 14 Snipers, 8 Frost), shown on its
  palette button as `count/max`.
- Tower prices **rise** as you build more of a type (x1.15 per existing tower of
  that type), so spamming one tower gets pricier; selling brings the price back
  down.
- **Selling** refunds 60% of everything spent on a tower (purchase + upgrades).

## Modes

- **Campaign** — the 20 hand-built waves; survive all of them to win.
- **Endless** — waves never stop. After wave 20 they're generated on the fly with
  growing counts, tighter spawns, and scaling enemy HP. No victory: see how far
  you can get. Toggle with the **Mode** button before/while playing.

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
