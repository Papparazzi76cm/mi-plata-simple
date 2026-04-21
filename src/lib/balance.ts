// Mi Plata — Saldo vivo y proyecciones del mes
import type { TxLite } from "@/lib/insights";

export interface FixedExpense {
  id: string;
  label: string;
  amount: number;
}

export interface MonthlyBudget {
  total_amount: number;
  fixed_expenses: FixedExpense[];
  savings_goal: number;
}

export interface SavingsProgress {
  /** Meta mensual fijada por el usuario (Gs). */
  goal: number;
  /** Ahorro actual estimado del mes = ingresos - gastos del mes. */
  current: number;
  /** % de la meta cubierto (0–999). */
  percent: number;
  /** Proyección de ahorro a fin de mes según ritmo actual. */
  projection: number;
  /** Estado emocional. */
  status: "none" | "behind" | "onTrack" | "ahead" | "reached";
  /** ¿Tiene meta configurada? */
  hasGoal: boolean;
}

export interface LiveBalance {
  /** Día del mes actual (1-31). */
  dayOfMonth: number;
  /** Días totales del mes. */
  daysInMonth: number;
  /** Días restantes hasta fin de mes (incluye hoy). */
  daysLeft: number;
  /** Suma de todos los gastos del mes calendario actual. */
  spent: number;
  /** Total de fijos previstos (suma simple). */
  fixedTotal: number;
  /** Cuántos fijos ya fueron registrados como gasto este mes. */
  fixedSpent: number;
  /** Fijos previstos aún no registrados (los reservamos del disponible). */
  fixedPending: number;
  /** Disponible real = presupuesto - gastado - fijos pendientes. */
  available: number;
  /** Cuánto se podría gastar por día con lo que queda. */
  dailyAllowance: number;
  /** Gasto promedio diario actual del mes. */
  dailyPace: number;
  /** Proyección de cierre de mes al ritmo actual. */
  projection: number;
  /** % del presupuesto consumido. */
  percentUsed: number;
  /** Estado emocional del saldo. */
  status: "healthy" | "warning" | "danger" | "over";
  /** Si el usuario aún no fijó presupuesto. */
  hasBudget: boolean;
}

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function startOfToday(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Heurística simple: ¿alguno de los fijos ya aparece como gasto del mes? */
function fixedAlreadyPaid(txs: TxLite[], fixed: FixedExpense): boolean {
  const start = startOfMonth().getTime();
  const end = endOfMonth().getTime();
  const labelNorm = fixed.label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (!labelNorm) return false;
  for (const t of txs) {
    if (t.type !== "gasto") continue;
    const ts = new Date(t.date).getTime();
    if (ts < start || ts > end) continue;
    const desc = (t.description ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    // Match si el label aparece como palabra dentro de la descripción
    if (desc.includes(labelNorm) && Number(t.amount) >= fixed.amount * 0.5) {
      return true;
    }
  }
  return false;
}

export function calcLiveBalance(
  txs: TxLite[],
  budget: MonthlyBudget | null,
): LiveBalance {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = endOfMonth(now).getDate();
  const daysLeft = Math.max(1, daysInMonth - dayOfMonth + 1);
  const monthStart = startOfMonth(now).getTime();
  const todayEnd = (() => {
    const d = startOfToday();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  })();

  let spent = 0;
  for (const t of txs) {
    if (t.type !== "gasto") continue;
    const ts = new Date(t.date).getTime();
    if (ts >= monthStart && ts <= todayEnd) spent += Number(t.amount);
  }

  const total = budget?.total_amount ?? 0;
  const fixed = budget?.fixed_expenses ?? [];
  const fixedTotal = fixed.reduce((a, f) => a + Number(f.amount || 0), 0);

  let fixedSpent = 0;
  let fixedPending = 0;
  for (const f of fixed) {
    if (fixedAlreadyPaid(txs, f)) fixedSpent += Number(f.amount || 0);
    else fixedPending += Number(f.amount || 0);
  }

  const available = Math.max(-total, total - spent - fixedPending);
  const dailyAllowance = available > 0 ? available / daysLeft : 0;
  const dailyPace = dayOfMonth > 0 ? spent / dayOfMonth : 0;
  const projection = Math.round(dailyPace * daysInMonth + fixedPending);
  const percentUsed = total > 0 ? Math.min(999, Math.round(((spent + fixedPending) / total) * 100)) : 0;

  let status: LiveBalance["status"] = "healthy";
  if (!total || total === 0) status = "healthy";
  else if (percentUsed >= 100) status = "over";
  else if (percentUsed >= 85) status = "danger";
  else if (percentUsed >= 65) status = "warning";

  return {
    dayOfMonth,
    daysInMonth,
    daysLeft,
    spent,
    fixedTotal,
    fixedSpent,
    fixedPending,
    available,
    dailyAllowance,
    dailyPace,
    projection,
    percentUsed,
    status,
    hasBudget: total > 0,
  };
}

// ---------- Vista semanal real ----------

export interface WeekLive {
  /** Lunes (00:00) de la semana en curso. */
  weekStart: Date;
  /** Domingo (23:59:59) de la semana en curso. */
  weekEnd: Date;
  /** Día (1-7) — lunes = 1. */
  dayInWeek: number;
  /** Gastado en esta semana. */
  spent: number;
  /** Disponible semanal sugerido (= dailyAllowance × 7). */
  weeklyAllowance: number;
  /** Lo que va quedando esta semana respecto a lo sugerido. */
  weeklyRemaining: number;
  /** % de uso de la semana. */
  percentUsed: number;
  status: "healthy" | "warning" | "danger" | "over";
}

export function calcWeekLive(txs: TxLite[], dailyAllowance: number): WeekLive {
  const today = startOfToday();
  const dow0 = (today.getDay() + 6) % 7; // lunes = 0
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dow0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  let spent = 0;
  for (const t of txs) {
    if (t.type !== "gasto") continue;
    const ts = new Date(t.date).getTime();
    if (ts >= weekStart.getTime() && ts <= weekEnd.getTime()) {
      spent += Number(t.amount);
    }
  }
  const weeklyAllowance = Math.max(0, dailyAllowance) * 7;
  const weeklyRemaining = weeklyAllowance > 0 ? weeklyAllowance - spent : 0;
  const percentUsed =
    weeklyAllowance > 0 ? Math.min(999, Math.round((spent / weeklyAllowance) * 100)) : 0;
  let status: WeekLive["status"] = "healthy";
  if (weeklyAllowance > 0) {
    if (percentUsed >= 100) status = "over";
    else if (percentUsed >= 85) status = "danger";
    else if (percentUsed >= 65) status = "warning";
  }
  return {
    weekStart,
    weekEnd,
    dayInWeek: dow0 + 1,
    spent,
    weeklyAllowance,
    weeklyRemaining,
    percentUsed,
    status,
  };
}

// ---------- Meta de ahorro mensual ----------

export function calcSavings(
  txs: TxLite[],
  budget: MonthlyBudget | null,
): SavingsProgress {
  const goal = Math.max(0, Number(budget?.savings_goal ?? 0));
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = endOfMonth(now).getDate();
  const monthStart = startOfMonth(now).getTime();
  const todayEnd = (() => {
    const d = startOfToday();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  })();

  let income = 0;
  let spent = 0;
  for (const t of txs) {
    const ts = new Date(t.date).getTime();
    if (ts < monthStart || ts > todayEnd) continue;
    if (t.type === "ingreso") income += Number(t.amount);
    else if (t.type === "gasto") spent += Number(t.amount);
  }

  const current = Math.max(0, income - spent);
  const percent = goal > 0 ? Math.min(999, Math.round((current / goal) * 100)) : 0;

  // Proyección: si seguís al mismo ritmo el resto del mes
  const dailyNet = dayOfMonth > 0 ? (income - spent) / dayOfMonth : 0;
  const projection = Math.round(Math.max(0, dailyNet * daysInMonth));

  let status: SavingsProgress["status"] = "none";
  if (goal > 0) {
    if (percent >= 100) status = "reached";
    else {
      // Comparar % de ahorro con % del mes transcurrido
      const monthPct = (dayOfMonth / daysInMonth) * 100;
      if (percent >= monthPct + 5) status = "ahead";
      else if (percent >= monthPct - 10) status = "onTrack";
      else status = "behind";
    }
  }

  return {
    goal,
    current,
    percent,
    projection,
    status,
    hasGoal: goal > 0,
  };
}
