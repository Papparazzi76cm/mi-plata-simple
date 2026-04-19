// Subtle streak-milestone celebration. Fires once per milestone per local day.
import confetti from "canvas-confetti";

const MILESTONES = [3, 7, 14, 30] as const;
const CELEBRATED_KEY = "miplata.celebrated.v1";

interface CelebratedMap {
  [milestone: number]: string; // YYYY-MM-DD when celebrated
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readCelebrated(): CelebratedMap {
  try {
    const raw = localStorage.getItem(CELEBRATED_KEY);
    return raw ? (JSON.parse(raw) as CelebratedMap) : {};
  } catch {
    return {};
  }
}

function writeCelebrated(map: CelebratedMap) {
  try {
    localStorage.setItem(CELEBRATED_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Returns the milestone matching the streak, or null. */
export function streakMilestoneValue(streak: number): number | null {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (streak === MILESTONES[i]) return MILESTONES[i];
  }
  return null;
}

/**
 * Fires a subtle confetti burst when the user hits a streak milestone,
 * once per milestone per day. Returns true when celebrated.
 */
export function celebrateStreakIfMilestone(streak: number): boolean {
  const milestone = streakMilestoneValue(streak);
  if (!milestone) return false;
  const today = todayKey();
  const map = readCelebrated();
  if (map[milestone] === today) return false;

  // Subtle, off-center burst from the top — feels alive without being loud.
  const fire = (opts: confetti.Options) =>
    confetti({
      particleCount: 22,
      spread: 55,
      startVelocity: 28,
      gravity: 0.9,
      ticks: 120,
      scalar: 0.85,
      colors: ["#22c55e", "#16a34a", "#facc15", "#fb923c"],
      disableForReducedMotion: true,
      ...opts,
    });

  fire({ origin: { x: 0.25, y: 0.2 } });
  setTimeout(() => fire({ origin: { x: 0.75, y: 0.2 } }), 120);

  map[milestone] = today;
  writeCelebrated(map);
  return true;
}
