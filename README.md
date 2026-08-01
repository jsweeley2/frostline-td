# Stunt Driver 🏎️

A 3D stunt driving game. Drive a race car around, hit ramps, and get big air.
Built with Vite + vanilla JavaScript, Three.js (the pictures) and cannon-es (the physics).

This is **Phase 1**: one car, one flat world with ramps, and three cameras. The
whole point of Phase 1 is that the car **feels good to drive**.

## Run it

```bash
npm install      # download Three.js, cannon-es and Vite (only needed once)
npm run dev      # start the game, then open the link it prints
```

To make the finished version for the web:

```bash
npm run build    # puts the game in the dist/ folder
```

## Controls

| Key | What it does |
| --- | --- |
| **W / ↑** | Drive forward (in the air: front-flip) |
| **S / ↓** | Reverse (in the air: back-flip) |
| **A / ←** | Steer left (in the air: spin left) |
| **D / →** | Steer right (in the air: spin right) |
| **Space** | Handbrake — locks the back wheels for slides |
| **C** | Change camera (chase → front → cockpit) |
| **R** | Respawn (flip the car back upright at the start) |
| **Reset button** | Same as R, with the mouse |

## The files, and what each one does

Everything lives in `src/`. Each file does one job.

| File | Job |
| --- | --- |
| `main.js` | **The heart.** Starts everything, then runs the game loop ~60 times a second. Read this first. |
| `world.js` | The 3D scene you see: sky, sun, shadows, ground, and the ramps. |
| `physics.js` | The invisible physics world (gravity + the ground the wheels feel). |
| `car.js` | Builds the car and makes it drive (raycast wheel suspension). |
| `cars.js` | **Every car is ONE entry here** — mass, power, grip, springs, body shape. |
| `pieces.js` | **Every track piece is ONE entry here** — shape, collision, and how it snaps. |
| `cameras.js` | The three camera modes and switching between them. |
| `dashboard.js` | The cockpit steering wheel (it really turns) and dashboard. |
| `controls.js` | Reads the keyboard. |
| `hud.js` | The on-screen speed, camera name and Reset button. |

### Want to change how the car feels?

Open **`cars.js`** and change one number at a time. The comments tell you what
each number does. You never need to touch `car.js` to do this.

### Want to add a new ramp or track piece later?

Add one entry to **`pieces.js`**. The renderer, the physics and (in Phase 2) the
track builder all read from that one file.

## Things we learned the hard way (notes for later)

A few tricky bugs we hit while building Phase 1, written down so we don't repeat them:

- **The car must never "sleep".** cannon-es puts still things to sleep to save
  work, but a sleeping car ignores the engine. See `allowSleep = false` in `car.js`.
- **The ground is a giant box, not a flat plane.** The wheel-rays reliably see a
  box; they can miss an infinite plane and the car falls through. See `physics.js`.
- **After moving/rotating a physics block you must set `aabbNeedsUpdate = true`**,
  or the engine still thinks it's back at the start and the wheel-rays can't find
  it — so the car drives straight through ramps. See `world.js`. (This one took
  a while!)
- **Ramps are a smooth curve, not a hard wedge.** A car at speed crashes into a
  hard-angled ramp. Ours is a parabola made of short slabs, so the car slides on
  smoothly and flies off the top.

## Coming in later phases (not built yet)

Loop-de-loops, corkscrews, boosters, a track builder, more cars (monster truck!),
level progression, lap times and sound.

**The loop-de-loop plan:** a normal car falls off the top of a loop because "down"
always points at the ground. The fix is to gently pull the car toward the road it's
driving on, so "down" becomes "the road". The wheels already report the road's
direction, so this plugs in later.

---

_The previous game that used to live here (Frostline TD, a tower-defense game) has
been moved into the `frostline-td-old/` folder — nothing was deleted._
