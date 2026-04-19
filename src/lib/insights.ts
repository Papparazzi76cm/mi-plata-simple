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
