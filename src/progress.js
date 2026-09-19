// progress.js
// ---------------------------------------------------------------------------
// Remembers which levels you've beaten, saved in the browser (localStorage) so
// your unlocked cars are still there next time you play.
//
// From "which levels are beaten" we can work out two things:
//   - which CARS are unlocked (a car unlocks when you beat the level that gives it)
//   - which LEVELS are unlocked (you unlock the next level by beating this one)
// ---------------------------------------------------------------------------

const SAVE_KEY = 'stuntDriver.progress.v1';

// Load the saved progress. If there's nothing saved (or it's broken), start
// fresh with no levels beaten. We wrap it in try/catch because some browsers
// block storage, and we never want that to crash the game.
export function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { beaten: new Set(JSON.parse(raw).beaten || []) };
  } catch (e) {
    /* storage blocked - just start fresh */
  }
  return { beaten: new Set() };
}

// Save progress back to the browser.
export function saveProgress(progress) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ beaten: [...progress.beaten] }));
  } catch (e) {
    /* storage blocked - progress just won't stick this time */
  }
}

// Is this car unlocked? The starter car is always unlocked; the rest need you
// to have beaten the level that gives them.
export function isCarUnlocked(carId, cars, levels, progress) {
  if (cars[carId] && cars[carId].unlockedByDefault) return true;
  return levels.some((level, i) => level.unlocks === carId && progress.beaten.has(i));
}

// Is this level unlocked? Level 1 is always open; each later level opens when
// you beat the one before it.
export function isLevelUnlocked(index, progress) {
  return index === 0 || progress.beaten.has(index - 1);
}
