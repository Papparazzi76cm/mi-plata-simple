// Mi Plata — Motor de alertas contextuales del coach
// Combina riesgo (presupuesto, ritmo, categorías) y hábito (rachas, recordatorios).
// Cada alerta tiene un id estable para deduplicar el "ya te lo mostré hoy".

import type { TxLite } from "@/lib/insights";
import type { LiveBalance, SavingsProgress } from "@/lib/balance";
import { CATEGORIES, matchCategory, type Category } from "@/lib/categories";
import { sumExpensesOnDay, averageDailyExpense } from "@/lib/insights";

export type AlertSeverity = "critical" | "warn" | "info" | "habit";
export type AlertKind =
  | "budget-over"
  | "budget-pace"
  | "category-over"
  | "category-near"
  | "today-spike"
  | "savings-behind"
  | "savings-reached"
  | "no-activity-today"
  | "streak-broken"
  | "reminder-due"
  | "reminder-soon";

export interface CoachAlert {
  /** Estable por día — "{kind}:{ctx}:{YYYYMMDD}" para dedup. */
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  /** Título corto (≤ 50 chars). */
  title: string;
  /** Línea de detalle / acción. */
  detail: string;
  /** Emoji para reforzar el tono. */
  emoji: string;
  /** Ruta de acción opcional. */
  href?: string;
  /** CTA mostrado si hay href. */
  cta?: string;
  /** Score de prioridad. Mayor = se muestra primero. */
  priority: number;
}

export interface ReminderLite {
  id: string;
  title: string;
  due_date: string; // YYYY-MM-DD
  amount: number | null;
}

interface BuildAlertsInput {
  txs: TxLite[];
  balance: LiveBalance;
  savings: SavingsProgress;
  categoryBudgets: Record<string, number>;
  reminders: ReminderLite[];
  streak: number;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function fmtGsShort(n: number): string {
  // Formato corto para usar dentro de mensajes (sin "Gs.")
  return Math.round(n).toLocaleString("es-PY").replace(/,/g, ".");
}

export function buildCoachAlerts(input: BuildAlertsInput): CoachAlert[] {
  const { txs, balance, savings, categoryBudgets, reminders, streak } = input;
  const today = new Date();
  const todayKey = ymd(today);
  const alerts: CoachAlert[] = [];

  // 🔴 RIESGO 1 — Te pasaste del presupuesto
  if (balance.hasBudget && balance.status === "over") {
    const totalBudget = balance.spent + balance.available + balance.fixedPending;
    const overBy = Math.max(0, balance.spent + balance.fixedPending - totalBudget);
    alerts.push({
      id: `budget-over:${todayKey}`,
      kind: "budget-over",
      severity: "critical",
      emoji: "🚨",
      title: "Excediste tu presupuesto del mes",
      detail: overBy > 0 ? `Te pasaste por ${fmtGsShort(overBy)} Gs.` : "Estás sobre el límite mensual.",
      href: "/presupuesto-mensual",
      cta: "Revisar",
      priority: 100,
    });
  }

  // 🟠 RIESGO 2 — Vas a cerrar el mes por encima
  if (balance.hasBudget && balance.status !== "over") {
    const totalBudget = balance.spent + balance.available + balance.fixedPending;
    const projVsBudgetPct = totalBudget > 0
      ? Math.round((balance.projection / totalBudget) * 100)
      : 0;
    if (projVsBudgetPct >= 110 && balance.dayOfMonth >= 5) {
      alerts.push({
        id: `budget-pace:${todayKey}`,
        kind: "budget-pace",
        severity: "warn",
        emoji: "⚡",
        title: `A este ritmo cerrás ${projVsBudgetPct - 100}% sobre tu presupuesto`,
        detail: `Proyección: ${fmtGsShort(balance.projection)} Gs vs. ${fmtGsShort(totalBudget)} Gs`,
        priority: 80,
      });
    }
  }

  // 🟠 RIESGO 3 — Categorías sobre / cerca del límite
  // Calculamos gasto por categoría del mes en curso
  const monthKey = `${today.getFullYear()}-${today.getMonth()}`;
  const catTotals = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== "gasto") continue;
    const d = new Date(t.date);
    if (`${d.getFullYear()}-${d.getMonth()}` !== monthKey) continue;
    const cat = matchCategory(t.description ?? "");
    if (!cat) continue;
    catTotals.set(cat.id, (catTotals.get(cat.id) ?? 0) + Number(t.amount));
  }
  for (const [catId, limit] of Object.entries(categoryBudgets)) {
    const spent = catTotals.get(catId) ?? 0;
    if (spent === 0) continue;
    const pct = Math.round((spent / limit) * 100);
    const cat: Category | undefined = CATEGORIES.find((c) => c.id === catId);
    if (!cat) continue;
    if (pct >= 100) {
      alerts.push({
        id: `category-over:${catId}:${todayKey}`,
        kind: "category-over",
        severity: "critical",
        emoji: cat.emoji,
        title: `Pasaste el límite de ${cat.label}`,
        detail: `Llevás ${fmtGsShort(spent)} Gs de ${fmtGsShort(limit)} Gs (${pct}%).`,
        href: `/category/${cat.id}`,
        cta: "Ver detalle",
        priority: 90,
      });
    } else if (pct >= 85) {
      alerts.push({
        id: `category-near:${catId}:${todayKey}`,
        kind: "category-near",
        severity: "warn",
        emoji: cat.emoji,
        title: `${cat.label} cerca del límite`,
        detail: `Vas ${pct}% del presupuesto de la categoría.`,
        href: `/category/${cat.id}`,
        cta: "Ver",
        priority: 70,
      });
    }
  }

  // 🟠 RIESGO 4 — Pico de gasto hoy (≥ 2× el promedio diario)
  const todayTotal = sumExpensesOnDay(txs, today);
  const avg14 = averageDailyExpense(txs, 14);
  if (avg14 > 0 && todayTotal >= avg14 * 2 && todayTotal > 0) {
    const ratio = Math.round((todayTotal / avg14) * 10) / 10;
    alerts.push({
      id: `today-spike:${todayKey}`,
      kind: "today-spike",
      severity: "warn",
      emoji: "📈",
      title: "Día de gasto fuerte",
      detail: `Hoy llevás ${ratio}× tu promedio diario (${fmtGsShort(todayTotal)} Gs vs ${fmtGsShort(avg14)} Gs).`,
      priority: 60,
    });
  }

  // 🟢 LOGROS — Meta de ahorro
  if (savings.hasGoal && savings.status === "reached") {
    alerts.push({
      id: `savings-reached:${todayKey}`,
      kind: "savings-reached",
      severity: "info",
      emoji: "🎉",
      title: "¡Meta de ahorro cumplida!",
      detail: `Llevás ${fmtGsShort(savings.current)} Gs ahorrados este mes.`,
      priority: 75,
    });
  } else if (savings.hasGoal && savings.status === "behind" && balance.dayOfMonth >= 10) {
    alerts.push({
      id: `savings-behind:${todayKey}`,
      kind: "savings-behind",
      severity: "warn",
      emoji: "🐢",
      title: "Vas atrasado con tu meta de ahorro",
      detail: `${savings.percent}% logrado al día ${balance.dayOfMonth} del mes.`,
      href: "/presupuesto-mensual",
      cta: "Ajustar",
      priority: 50,
    });
  }

  // 🟣 HÁBITO 1 — Recordatorios próximos
  for (const r of reminders) {
    const due = new Date(r.due_date + "T00:00:00");
    const diffDays = Math.round((due.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
    if (diffDays === 0) {
      alerts.push({
        id: `reminder-due:${r.id}:${todayKey}`,
        kind: "reminder-due",
        severity: "warn",
        emoji: "🔔",
        title: `Hoy vence: ${r.title}`,
        detail: r.amount ? `Monto: ${fmtGsShort(r.amount)} Gs` : "No te olvides.",
        href: "/reminders",
        cta: "Ver pagos",
        priority: 85,
      });
    } else if (diffDays > 0 && diffDays <= 2) {
      alerts.push({
        id: `reminder-soon:${r.id}:${todayKey}`,
        kind: "reminder-soon",
        severity: "info",
        emoji: "📅",
        title: `${r.title} en ${diffDays} día${diffDays === 1 ? "" : "s"}`,
        detail: r.amount ? `Monto previsto: ${fmtGsShort(r.amount)} Gs` : "Tenés un pago próximo.",
        href: "/reminders",
        cta: "Ver",
        priority: 40,
      });
    }
  }

  // 🟣 HÁBITO 2 — Sin movimientos hoy (al final del día)
  const hour = today.getHours();
  if (hour >= 19 && todayTotal === 0 && txs.length > 0) {
    alerts.push({
      id: `no-activity-today:${todayKey}`,
      kind: "no-activity-today",
      severity: "habit",
      emoji: "📝",
      title: "¿Día sin gastos?",
      detail: "Si gastaste algo, registralo para mantener tu racha.",
      href: "/add",
      cta: "Registrar",
      priority: 30,
    });
  }

  // 🟣 HÁBITO 3 — Racha rota (tenía racha alta y hoy no hay nada)
  if (streak === 0 && txs.length > 0) {
    // Verificar si en los últimos 7 días hubo registros
    const cutoff = Date.now() - 7 * 86400000;
    const hadRecent = txs.some((t) => new Date(t.date).getTime() >= cutoff);
    if (hadRecent && hour >= 12) {
      alerts.push({
        id: `streak-broken:${todayKey}`,
        kind: "streak-broken",
        severity: "habit",
        emoji: "🔥",
        title: "Empezá una nueva racha",
        detail: "Registrá un movimiento hoy para arrancar.",
        href: "/add",
        cta: "Agregar",
        priority: 20,
      });
    }
  }

  // Orden por prioridad descendente
  return alerts.sort((a, b) => b.priority - a.priority);
}

// ---------- Dedup local: mostrar cada alerta como toast solo 1 vez por día ----------

const SHOWN_KEY = "miplata.alerts-shown.v1";

function loadShown(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SHOWN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    // Limpiar entradas viejas (> 3 días)
    const cutoff = Date.now() - 3 * 86400000;
    const cleaned: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "number" && v >= cutoff) cleaned[k] = v;
    }
    return cleaned;
  } catch {
    return {};
  }
}

function saveShown(map: Record<string, number>): void {
  try {
    localStorage.setItem(SHOWN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function wasShownToday(alertId: string): boolean {
  const map = loadShown();
  return Boolean(map[alertId]);
}

export function markShown(alertId: string): void {
  const map = loadShown();
  map[alertId] = Date.now();
  saveShown(map);
}
