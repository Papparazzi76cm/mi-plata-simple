// Insights & habit helpers for Mi Plata
// All "expense" math uses transactions of type "gasto".

export interface TxLite {
  type: "gasto" | "ingreso";
  amount: number;
  date: string; // ISO
  description?: string;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Sum of expenses for a specific local day. */
export function sumExpensesOnDay(txs: TxLite[], day: Date): number {
  const key = dayKey(day);
  return txs
    .filter((t) => t.type === "gasto" && dayKey(new Date(t.date)) === key)
    .reduce((a, t) => a + Number(t.amount), 0);
}

/**
 * Average daily expense over the last `windowDays` days, EXCLUDING today.
 * Only counts days that actually have expenses (so a brand-new user isn't
 * compared against artificial zeros).
 */
export function averageDailyExpense(txs: TxLite[], windowDays = 14): number {
  const today = startOfDay(new Date());
  const totals = new Map<string, number>();
  for (let i = 1; i <= windowDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    totals.set(dayKey(d), 0);
  }
  for (const t of txs) {
    if (t.type !== "gasto") continue;
    const k = dayKey(new Date(t.date));
    if (totals.has(k)) totals.set(k, (totals.get(k) ?? 0) + Number(t.amount));
  }
  const active = [...totals.values()].filter((v) => v > 0);
  if (active.length === 0) return 0;
  return active.reduce((a, b) => a + b, 0) / active.length;
}

export type Mood = "good" | "warn" | "bad" | "neutral";

export interface DailyStatus {
  mood: Mood;
  headline: string;
  detail: string;
}

/** Emotional status for the dynamic header. */
export function getDailyStatus(today: number, avg: number): DailyStatus {
  if (avg <= 0 && today === 0) {
    return {
      mood: "neutral",
      headline: "Empezá tu día 💚",
      detail: "Aún no registraste gastos hoy.",
    };
  }
  if (avg <= 0) {
    return {
      mood: "neutral",
      headline: "Vamos midiendo 📊",
      detail: "Necesitamos algunos días para darte feedback.",
    };
  }
  const ratio = today / avg;
  if (ratio <= 0.7) {
    return {
      mood: "good",
      headline: "Vas bien hoy 🟢",
      detail: "Estás gastando menos que tu promedio.",
    };
  }
  if (ratio <= 1.1) {
    return {
      mood: "good",
      headline: "Buen control hoy 👍",
      detail: "Vas en línea con tu promedio diario.",
    };
  }
  if (ratio <= 1.4) {
    return {
      mood: "warn",
      headline: "Cuidado, estás gastando más de lo normal 🟡",
      detail: "Hoy vas por encima de tu promedio.",
    };
  }
  return {
    mood: "bad",
    headline: "Te estás pasando hoy 🔴",
    detail: "Estás muy por encima de tu gasto habitual.",
  };
}

export interface DayCompare {
  label: string;
  emoji: string;
  tone: Mood;
}

/** Compare today's spending vs yesterday's. */
export function compareWithYesterday(today: number, yesterday: number): DayCompare {
  if (today === 0 && yesterday === 0) {
    return { label: "Sin gastos aún", emoji: "✨", tone: "neutral" };
  }
  if (yesterday === 0) {
    return { label: "Primer día con gastos", emoji: "📊", tone: "neutral" };
  }
  if (today === 0) {
    return { label: "Hoy aún no gastaste 🎉", emoji: "🎉", tone: "good" };
  }
  if (today < yesterday * 0.95) {
    return { label: "Vas mejor que ayer", emoji: "👍", tone: "good" };
  }
  if (today > yesterday * 1.05) {
    return { label: "Hoy gastaste más que ayer", emoji: "⚠️", tone: "warn" };
  }
  return { label: "Parecido a ayer", emoji: "≈", tone: "neutral" };
}

/**
 * Consecutive-day streak ending today (or yesterday if nothing yet today).
 * Counts any transaction (gasto or ingreso).
 */
export function calcStreak(txs: TxLite[]): number {
  if (txs.length === 0) return 0;
  const days = new Set(txs.map((t) => dayKey(new Date(t.date))));
  const today = startOfDay(new Date());
  let streak = 0;
  let cursor = new Date(today);
  // If today has activity, start counting today; else allow start from yesterday.
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Number of expense transactions logged today. */
export function countExpensesToday(txs: TxLite[]): number {
  const key = dayKey(new Date());
  return txs.filter((t) => t.type === "gasto" && dayKey(new Date(t.date)) === key).length;
}

export interface DailyTrigger {
  /** Visible message — the "pull" that makes the user act. */
  message: string;
  /** Short action label, only present when there's something to do. */
  cta?: string;
  /** Tone — drives accent color. */
  tone: "info" | "good" | "fire" | "warn";
  /** Optional emoji prefix for visual punch. */
  emoji: string;
}

/**
 * Reactive daily trigger banner. Behavior:
 *  - 0 logs hoy   → "Hoy no registraste ningún gasto" + CTA
 *  - 1 log y aún temprano (< 12h) → "Buen comienzo de día"
 *  - 3+ logs hoy  → "Estás llevando buen control hoy"
 *  - 1-2 logs y ya pasó mediodía → mensaje neutro de seguimiento
 */
export function getDailyTrigger(txs: TxLite[]): DailyTrigger {
  const count = countExpensesToday(txs);
  const hour = new Date().getHours();
  if (count === 0) {
    return {
      emoji: "👀",
      message: "Hoy no registraste ningún gasto",
      cta: "Registrar ahora",
      tone: "info",
    };
  }
  if (count >= 3) {
    return {
      emoji: "🔥",
      message: "Estás llevando buen control hoy",
      tone: "fire",
    };
  }
  if (hour < 12) {
    return {
      emoji: "💪",
      message: "Buen comienzo de día",
      tone: "good",
    };
  }
  return {
    emoji: "✍️",
    message: count === 1 ? "Anotaste 1 movimiento hoy" : `Anotaste ${count} movimientos hoy`,
    tone: "good",
  };
}

export interface ClosureCard {
  total: number;
  avg: number;
  message: string;
  emoji: string;
  tone: Mood;
}

/**
 * "Así cerraste tu día" — built from yesterday's totals vs the prior 14d avg.
 * Returns null if there's nothing to close (no expenses yesterday AND no avg).
 */
export function getYesterdayClosure(txs: TxLite[]): ClosureCard | null {
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const total = sumExpensesOnDay(txs, yest);
  // Compute avg over the 14d window ENDING the day before yesterday
  // so yesterday isn't compared against itself.
  const dayBefore = new Date(yest);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const totals = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(dayBefore);
    d.setDate(d.getDate() - i);
    totals.set(dayKey(d), 0);
  }
  for (const t of txs) {
    if (t.type !== "gasto") continue;
    const k = dayKey(new Date(t.date));
    if (totals.has(k)) totals.set(k, (totals.get(k) ?? 0) + Number(t.amount));
  }
  const active = [...totals.values()].filter((v) => v > 0);
  const avg = active.length ? active.reduce((a, b) => a + b, 0) / active.length : 0;

  if (total === 0 && avg === 0) return null;
  if (total === 0) {
    return { total, avg, emoji: "🎉", tone: "good", message: "Ayer no gastaste nada — ¡bien hecho!" };
  }
  if (avg === 0) {
    return { total, avg, emoji: "📊", tone: "neutral", message: "Primer día con datos — vamos midiendo." };
  }
  const ratio = total / avg;
  if (ratio <= 0.8) {
    return { total, avg, emoji: "👍", tone: "good", message: "Ayer gastaste menos que tu media" };
  }
  if (ratio <= 1.15) {
    return { total, avg, emoji: "✅", tone: "good", message: "Ayer cerraste en línea con tu promedio" };
  }
  if (ratio <= 1.4) {
    return { total, avg, emoji: "⚠️", tone: "warn", message: "Ayer se te fue un poco" };
  }
  return { total, avg, emoji: "🚨", tone: "bad", message: "Ayer te excediste bastante" };
}

/** Friendly streak milestone label (returned only when a milestone applies). */
export function streakMilestone(streak: number): string | null {
  if (streak >= 30) return "Imparable este mes 🏆";
  if (streak >= 14) return "Nivel experto 👀";
  if (streak >= 7) return "Una semana completa 🔥";
  if (streak >= 3) return "Ya estás creando hábito 💪";
  return null;
}

/**
 * Rotating insight chips for the Home. Picks one based on the current day-of-year
 * so it changes daily but stays stable within a day.
 */
export function pickRotatingInsight(opts: {
  todayTotal: number;
  yesterdayTotal: number;
  avg: number;
  streak: number;
  topCategoryLabel?: string;
}): string {
  const candidates: string[] = [];
  if (opts.topCategoryLabel) candidates.push(`Tu gasto más común es ${opts.topCategoryLabel}`);
  if (opts.streak >= 3) candidates.push(`Llevás ${opts.streak} días seguidos registrando`);
  if (opts.todayTotal > 0 && opts.yesterdayTotal > 0 && opts.todayTotal < opts.yesterdayTotal) {
    candidates.push("Hoy vas mejor que ayer");
  }
  if (opts.avg > 0 && opts.todayTotal > 0 && opts.todayTotal < opts.avg * 0.8) {
    candidates.push("Estás por debajo de tu promedio diario");
  }
  if (opts.streak >= 5) candidates.push("Llevás buen ritmo esta semana");
  if (candidates.length === 0) {
    candidates.push("Registrar todos los días te ayuda a ver patrones");
  }
  // day-of-year for stable daily rotation
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const doy = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return candidates[doy % candidates.length];
}

export interface WeeklySummary {
  total: number;
  /** Day-of-week label (es-PY) with the highest spend, e.g. "martes". */
  topDayLabel: string;
  topDayAmount: number;
  /** Top category id + display label/emoji, if any. */
  topCategoryId: string | null;
  topCategoryLabel: string | null;
  topCategoryEmoji: string | null;
  topCategoryAmount: number;
  /** True when there is enough data to show the card. */
  hasData: boolean;
}

/**
 * Weekly summary for the last 7 days (today inclusive).
 * `resolveCategory` returns { id, label, emoji } | null for a given description.
 */
export function getWeeklySummary(
  txs: TxLite[],
  resolveCategory: (desc: string) => { id: string; label: string; emoji: string } | null,
): WeeklySummary {
  const today = startOfDay(new Date());
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() - 6); // 7-day window including today
  const weekdayFmt = new Intl.DateTimeFormat("es-PY", { weekday: "long" });

  const dayTotals = new Map<string, { label: string; total: number }>();
  const catTotals = new Map<
    string,
    { id: string; label: string; emoji: string; total: number }
  >();
  let total = 0;

  for (const t of txs) {
    if (t.type !== "gasto") continue;
    const d = startOfDay(new Date(t.date));
    if (d.getTime() < cutoff.getTime() || d.getTime() > today.getTime()) continue;
    const amt = Number(t.amount);
    total += amt;
    const k = dayKey(d);
    const cur = dayTotals.get(k);
    if (cur) cur.total += amt;
    else dayTotals.set(k, { label: weekdayFmt.format(d), total: amt });

    const cat = resolveCategory(t.description ?? "");
    if (cat) {
      const c = catTotals.get(cat.id);
      if (c) c.total += amt;
      else catTotals.set(cat.id, { ...cat, total: amt });
    }
  }

  let topDayLabel = "—";
  let topDayAmount = 0;
  for (const v of dayTotals.values()) {
    if (v.total > topDayAmount) {
      topDayAmount = v.total;
      topDayLabel = v.label;
    }
  }

  let topCat: { id: string; label: string; emoji: string; total: number } | null = null;
  for (const c of catTotals.values()) {
    if (!topCat || c.total > topCat.total) topCat = c;
  }

  return {
    total,
    topDayLabel,
    topDayAmount,
    topCategoryId: topCat?.id ?? null,
    topCategoryLabel: topCat?.label ?? null,
    topCategoryEmoji: topCat?.emoji ?? null,
    topCategoryAmount: topCat?.total ?? 0,
    hasData: total > 0,
  };
}

/** Friendly label for a reminder due date (timezone-safe for YYYY-MM-DD). */
export function reminderUrgency(dateStr: string): {
  label: string;
  tone: "past" | "today" | "tomorrow" | "soon" | "ok";
  urgent: boolean;
} {
  const today = startOfDay(new Date());
  const due = new Date(dateStr + "T00:00:00");
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `Vencido hace ${Math.abs(diff)}d`, tone: "past", urgent: true };
  if (diff === 0) return { label: "Hoy tenés que pagar", tone: "today", urgent: true };
  if (diff === 1) return { label: "Mañana vence", tone: "tomorrow", urgent: true };
  if (diff <= 5) return { label: `En ${diff} días`, tone: "soon", urgent: false };
  return {
    label: due.toLocaleDateString("es-PY", { day: "2-digit", month: "short" }),
    tone: "ok",
    urgent: false,
  };
}

/** Parse "20000 gasolina" or "comida 15.000" → { amount, description }. */
export function parseQuickInput(raw: string): { amount: number; description: string } {
  const text = raw.trim();
  if (!text) return { amount: 0, description: "" };
  // Find the longest run of digits (allowing . , spaces inside numbers)
  const match = text.match(/(\d[\d.,\s]*\d|\d)/);
  if (!match) return { amount: 0, description: text };
  const numStr = match[0];
  const amount = Number(numStr.replace(/[^\d]/g, "")) || 0;
  const description = (text.slice(0, match.index ?? 0) + text.slice((match.index ?? 0) + numStr.length))
    .replace(/\s+/g, " ")
    .trim();
  return { amount, description };
}
