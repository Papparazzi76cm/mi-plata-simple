// Mi Plata — Motor de "coach financiero"
// Genera frases inteligentes con datos reales del usuario.
// El tono es de un coach cercano, no un dashboard.

import type { TxLite } from "@/lib/insights";
import { matchCategory, type Category } from "@/lib/categories";

// ---------- Helpers de fechas ----------

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function weekRange(offset = 0): { start: Date; end: Date } {
  // Semana de lunes a domingo (Paraguay).
  const today = startOfDay(new Date());
  const dow = (today.getDay() + 6) % 7; // lunes = 0
  const start = new Date(today);
  start.setDate(today.getDate() - dow - offset * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
function monthRange(offset = 0): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}
function sumExpenses(txs: TxLite[], from: Date, to: Date): number {
  return txs
    .filter((t) => t.type === "gasto")
    .filter((t) => {
      const d = new Date(t.date).getTime();
      return d >= from.getTime() && d <= to.getTime();
    })
    .reduce((a, t) => a + Number(t.amount), 0);
}
function sumByCategory(
  txs: TxLite[],
  from: Date,
  to: Date,
): Map<string, { cat: Category; total: number }> {
  const out = new Map<string, { cat: Category; total: number }>();
  for (const t of txs) {
    if (t.type !== "gasto") continue;
    const ts = new Date(t.date).getTime();
    if (ts < from.getTime() || ts > to.getTime()) continue;
    const cat = matchCategory(t.description ?? "");
    if (!cat) continue;
    const cur = out.get(cat.id);
    if (cur) cur.total += Number(t.amount);
    else out.set(cat.id, { cat, total: Number(t.amount) });
  }
  return out;
}

// ---------- Tipos ----------

export type CoachTone = "good" | "warn" | "bad" | "neutral" | "fire" | "info";

export interface CoachInsight {
  id: string;
  /** Mensaje principal — el "headline" que ve el usuario. */
  message: string;
  /** Frase secundaria opcional. */
  detail?: string;
  emoji: string;
  tone: CoachTone;
  /** Prioridad — más alta = más relevante. Usado para elegir el principal. */
  priority: number;
}

export interface CoachPattern {
  id: string;
  message: string;
  emoji: string;
  tone: CoachTone;
}

// ---------- Generador de insights ----------

interface Ctx {
  txs: TxLite[];
  todayTotal: number;
  yesterdayTotal: number;
  avg14: number;
  streak: number;
}

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

/** Saludo según hora del día. */
export function greetingByHour(date = new Date()): string {
  const h = date.getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buen día";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Genera todos los insights candidatos y los devuelve ordenados por prioridad. */
export function generateCoachInsights(ctx: Ctx): CoachInsight[] {
  const out: CoachInsight[] = [];
  const { txs, todayTotal, yesterdayTotal, avg14, streak } = ctx;

  // 1. Comparativa categoría top: esta semana vs semana pasada
  const w0 = weekRange(0);
  const w1 = weekRange(1);
  const catsW0 = sumByCategory(txs, w0.start, w0.end);
  const catsW1 = sumByCategory(txs, w1.start, w1.end);
  let topCatJump: { cat: Category; pct: number; w0: number } | null = null;
  for (const { cat, total } of catsW0.values()) {
    const prev = catsW1.get(cat.id)?.total ?? 0;
    if (prev > 0 && total > 0) {
      const pct = pctChange(total, prev);
      if (Math.abs(pct) >= 20 && (!topCatJump || Math.abs(pct) > Math.abs(topCatJump.pct))) {
        topCatJump = { cat, pct, w0: total };
      }
    }
  }
  if (topCatJump) {
    const up = topCatJump.pct > 0;
    out.push({
      id: "cat-week-jump",
      emoji: up ? "📈" : "📉",
      message: up
        ? `Tu gasto en ${topCatJump.cat.label.toLowerCase()} subió ${topCatJump.pct}% vs la semana pasada`
        : `Bajaste ${Math.abs(topCatJump.pct)}% en ${topCatJump.cat.label.toLowerCase()} esta semana`,
      detail: up ? "¿Querés ponerle un límite?" : "Buen trabajo manteniéndolo bajo.",
      tone: up ? "warn" : "good",
      priority: up ? 90 : 70,
    });
  }

  // 2. Predicción fin de mes (basada en ritmo del mes actual vs días transcurridos)
  const m0 = monthRange(0);
  const today = startOfDay(new Date());
  const daysElapsed = Math.max(1, today.getDate());
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const monthSpent = sumExpenses(txs, m0.start, today);
  if (monthSpent > 0 && daysElapsed >= 5) {
    const projection = Math.round((monthSpent / daysElapsed) * daysInMonth);
    const m1 = monthRange(1);
    const lastMonth = sumExpenses(txs, m1.start, m1.end);
    if (lastMonth > 0) {
      const pct = pctChange(projection, lastMonth);
      if (Math.abs(pct) >= 10) {
        const up = pct > 0;
        out.push({
          id: "month-projection",
          emoji: up ? "🔮" : "🎯",
          message: up
            ? `Si seguís este ritmo, vas a cerrar el mes ${pct}% más alto que el anterior`
            : `A este ritmo cerrarías el mes ${Math.abs(pct)}% más bajo que el anterior`,
          detail: `Proyección: ${formatShortGs(projection)} · Mes pasado: ${formatShortGs(lastMonth)}`,
          tone: up ? "warn" : "good",
          priority: up ? 85 : 65,
        });
      }
    }
  }

  // 3. Categoría dominante del mes
  const monthCats = sumByCategory(txs, m0.start, today);
  const monthTotal = monthSpent;
  let topMonthCat: { cat: Category; total: number } | null = null;
  for (const v of monthCats.values()) {
    if (!topMonthCat || v.total > topMonthCat.total) topMonthCat = v;
  }
  if (topMonthCat && monthTotal > 0) {
    const share = Math.round((topMonthCat.total / monthTotal) * 100);
    if (share >= 35) {
      out.push({
        id: "dominant-cat",
        emoji: topMonthCat.cat.emoji,
        message: `${topMonthCat.cat.label} es el ${share}% de tus gastos este mes`,
        detail: "¿Es lo que querés que sea tu prioridad?",
        tone: share >= 50 ? "warn" : "info",
        priority: share >= 50 ? 75 : 55,
      });
    }
  }

  // 4. Esta semana vs semana pasada (total)
  const w0Total = sumExpenses(txs, w0.start, w0.end);
  const w1Total = sumExpenses(txs, w1.start, w1.end);
  const dayInWeek = (today.getDay() + 6) % 7; // 0 = lunes
  if (w1Total > 0 && w0Total >= w1Total && dayInWeek < 6) {
    out.push({
      id: "week-pace-warn",
      emoji: "⚠️",
      message: "Esta semana ya gastaste lo mismo que toda la semana pasada",
      detail: `Y aún ${6 - dayInWeek === 1 ? "queda 1 día" : `quedan ${6 - dayInWeek} días`}.`,
      tone: "bad",
      priority: 95,
    });
  }

  // 5. Hoy vs promedio
  if (avg14 > 0 && todayTotal > 0) {
    const ratio = todayTotal / avg14;
    if (ratio >= 1.5) {
      out.push({
        id: "today-overspend",
        emoji: "🚨",
        message: `Hoy ya gastaste ${Math.round((ratio - 1) * 100)}% más que tu día promedio`,
        detail: `Promedio: ${formatShortGs(avg14)} · Hoy: ${formatShortGs(todayTotal)}`,
        tone: "bad",
        priority: 92,
      });
    } else if (ratio <= 0.5) {
      out.push({
        id: "today-underspend",
        emoji: "🟢",
        message: "Hoy estás gastando bien por debajo de tu promedio",
        detail: `Llevás ${formatShortGs(todayTotal)} vs ${formatShortGs(avg14)} habitual.`,
        tone: "good",
        priority: 60,
      });
    }
  }

  // 6. Hoy vs ayer
  if (yesterdayTotal > 0 && todayTotal > 0) {
    const pct = pctChange(todayTotal, yesterdayTotal);
    if (pct >= 50) {
      out.push({
        id: "vs-yesterday-up",
        emoji: "📊",
        message: `Hoy gastaste ${pct}% más que ayer`,
        tone: "warn",
        priority: 50,
      });
    } else if (pct <= -40) {
      out.push({
        id: "vs-yesterday-down",
        emoji: "👏",
        message: `Hoy gastaste ${Math.abs(pct)}% menos que ayer`,
        tone: "good",
        priority: 55,
      });
    }
  }

  // 7. Racha
  if (streak >= 7) {
    out.push({
      id: "streak-milestone",
      emoji: "🔥",
      message: `Llevás ${streak} días seguidos registrando — sos consistente`,
      detail: "La consistencia es lo que separa a quien controla de quien no.",
      tone: "fire",
      priority: 65,
    });
  } else if (streak >= 3) {
    out.push({
      id: "streak-building",
      emoji: "💪",
      message: `${streak} días seguidos — estás construyendo el hábito`,
      tone: "fire",
      priority: 45,
    });
  }

  // 8. Sin actividad hoy (motivacional)
  if (todayTotal === 0 && avg14 > 0) {
    out.push({
      id: "no-spend-today",
      emoji: "✨",
      message: "Aún no registraste gastos hoy",
      detail: "Anotalos cuando ocurran — es lo que mantiene viva la foto real.",
      tone: "info",
      priority: 30,
    });
  }

  // 9. Día barato (cuando hoy es claramente el más barato de la semana)
  const todayKey = dayKey(today);
  const dayTotalsThisWeek = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== "gasto") continue;
    const d = startOfDay(new Date(t.date));
    if (d.getTime() < w0.start.getTime() || d.getTime() > today.getTime()) continue;
    const k = dayKey(d);
    dayTotalsThisWeek.set(k, (dayTotalsThisWeek.get(k) ?? 0) + Number(t.amount));
  }
  if (dayTotalsThisWeek.size >= 3 && todayTotal > 0) {
    const totals = [...dayTotalsThisWeek.entries()];
    const todayEntry = totals.find(([k]) => k === todayKey);
    const min = Math.min(...totals.map(([, v]) => v));
    if (todayEntry && todayEntry[1] === min) {
      out.push({
        id: "cheapest-day",
        emoji: "🟢",
        message: "Hoy es tu día más barato de la semana",
        tone: "good",
        priority: 40,
      });
    }
  }

  // 10. Fallback genérico (nunca dejar la card vacía)
  if (out.length === 0) {
    out.push({
      id: "fallback",
      emoji: "🌱",
      message: "Seguí registrando — en pocos días vas a ver tus patrones reales",
      detail: "Tu coach se vuelve más útil con cada gasto que anotás.",
      tone: "info",
      priority: 10,
    });
  }

  return out.sort((a, b) => b.priority - a.priority);
}

/** Patrones más calmados y descriptivos para mostrar como lista. */
export function detectPatterns(txs: TxLite[]): CoachPattern[] {
  const out: CoachPattern[] = [];
  const m0 = monthRange(0);
  const m1 = monthRange(1);
  const today = startOfDay(new Date());

  // Patrón 1: día de la semana más caro en últimas 4 semanas
  const w4Start = new Date(today);
  w4Start.setDate(today.getDate() - 27);
  const dayOfWeekTotals = new Map<number, number>();
  const dayOfWeekCounts = new Map<number, number>();
  for (const t of txs) {
    if (t.type !== "gasto") continue;
    const d = new Date(t.date);
    if (d.getTime() < w4Start.getTime()) continue;
    const dow = d.getDay();
    dayOfWeekTotals.set(dow, (dayOfWeekTotals.get(dow) ?? 0) + Number(t.amount));
    dayOfWeekCounts.set(dow, (dayOfWeekCounts.get(dow) ?? 0) + 1);
  }
  if (dayOfWeekTotals.size >= 4) {
    let topDow = -1;
    let topAvg = 0;
    for (const [dow, total] of dayOfWeekTotals) {
      const cnt = dayOfWeekCounts.get(dow) ?? 1;
      const avg = total / cnt;
      if (avg > topAvg) {
        topAvg = avg;
        topDow = dow;
      }
    }
    if (topDow >= 0) {
      const fmt = new Intl.DateTimeFormat("es-PY", { weekday: "long" });
      const dummy = new Date(2024, 0, 1 + ((topDow - 1 + 7) % 7));
      out.push({
        id: "weekday-pattern",
        emoji: "📅",
        message: `Los ${fmt.format(dummy)} suelen ser tus días más caros`,
        tone: "info",
      });
    }
  }

  // Patrón 2: comparativa mes vs mes anterior
  const monthCurr = sumExpenses(txs, m0.start, today);
  const monthPrev = sumExpenses(txs, m1.start, m1.end);
  if (monthPrev > 0 && monthCurr > 0) {
    const daysElapsed = today.getDate();
    const daysInMonthPrev = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    const prevPaceToDate = (monthPrev / daysInMonthPrev) * daysElapsed;
    const pct = pctChange(monthCurr, prevPaceToDate);
    if (Math.abs(pct) >= 10) {
      const up = pct > 0;
      out.push({
        id: "vs-last-month",
        emoji: up ? "📈" : "📉",
        message: up
          ? `Vas ${pct}% por encima del ritmo del mes pasado`
          : `Vas ${Math.abs(pct)}% por debajo del ritmo del mes pasado`,
        tone: up ? "warn" : "good",
      });
    }
  }

  // Patrón 3: categoría que más creció vs mes anterior
  const catsM0 = sumByCategory(txs, m0.start, today);
  const catsM1 = sumByCategory(txs, m1.start, m1.end);
  let bigGrower: { cat: Category; pct: number } | null = null;
  for (const { cat, total } of catsM0.values()) {
    const prev = catsM1.get(cat.id)?.total ?? 0;
    if (prev >= 20000 && total >= 20000) {
      const pct = pctChange(total, prev);
      if (pct >= 30 && (!bigGrower || pct > bigGrower.pct)) {
        bigGrower = { cat, pct };
      }
    }
  }
  if (bigGrower) {
    out.push({
      id: "category-grower",
      emoji: bigGrower.cat.emoji,
      message: `${bigGrower.cat.label} creció ${bigGrower.pct}% respecto al mes pasado`,
      tone: "warn",
    });
  }

  return out.slice(0, 3);
}

// ---------- Format helpers ----------

function formatShortGs(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M Gs`;
  if (n >= 1000) return `${Math.round(n / 1000)}k Gs`;
  return `${Math.round(n)} Gs`;
}
