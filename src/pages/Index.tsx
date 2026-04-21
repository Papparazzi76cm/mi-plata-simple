import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatGs } from "@/lib/format";
import {
  averageDailyExpense,
  calcStreak,
  compareWithYesterday,
  getDailyStatus,
  getDailyTrigger,
  getWeeklySummary,
  getYesterdayClosure,
  reminderUrgency,
  streakMilestone,
  sumExpensesOnDay,
  type TxLite,
} from "@/lib/insights";
import { generateCoachInsights, detectPatterns, greetingByHour } from "@/lib/coach";
import { calcLiveBalance, calcWeekLive, calcSavings, type MonthlyBudget, type FixedExpense } from "@/lib/balance";
import { ArrowDownLeft, ArrowUpRight, Bell, Flame, Receipt, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { matchCategory, CATEGORIES, type Category } from "@/lib/categories";
import { DailyTriggerBanner } from "@/components/home/DailyTriggerBanner";
import { ClosureCard } from "@/components/home/ClosureCard";
import { CoachCard } from "@/components/home/CoachCard";
import { PatternsCard } from "@/components/home/PatternsCard";
import { WeeklySummary } from "@/components/home/WeeklySummary";
import { LiveBalanceCard } from "@/components/home/LiveBalanceCard";
import { WeekLiveCard } from "@/components/home/WeekLiveCard";
import { celebrateStreakIfMilestone } from "@/lib/celebrate";
import { CoachInbox } from "@/components/home/CoachInbox";
import { buildCoachAlerts, markShown, wasShownToday, type ReminderLite } from "@/lib/alerts";

interface Transaction {
  id: string;
  type: "gasto" | "ingreso";
  amount: number;
  description: string;
  date: string;
}

interface Reminder {
  id: string;
  title: string;
  due_date: string;
  amount: number | null;
}

export default function Index() {
  const { user } = useAuth();
  const [allTx, setAllTx] = useState<TxLite[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [nextReminder, setNextReminder] = useState<Reminder | null>(null);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [monthlyBudget, setMonthlyBudget] = useState<MonthlyBudget | null>(null);
  const [allReminders, setAllReminders] = useState<ReminderLite[]>([]);
  const [loading, setLoading] = useState(true);
  const toastFiredRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function load() {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const [recentRes, windowRes, remRes, budgetsRes, mBudgetRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id,type,amount,description,date")
          .order("date", { ascending: false })
          .limit(8),
        supabase
          .from("transactions")
          .select("type,amount,date,description")
          .gte("date", since.toISOString()),
        supabase
          .from("reminders")
          .select("id,title,due_date,amount")
          .gte("due_date", new Date().toISOString().slice(0, 10))
          .order("due_date", { ascending: true })
          .limit(10),
        supabase.from("budgets").select("category_id,amount"),
        supabase
          .from("monthly_budget")
          .select("total_amount,fixed_expenses,savings_goal")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (!mounted) return;
      setRecent((recentRes.data ?? []) as Transaction[]);
      setAllTx((windowRes.data ?? []) as TxLite[]);
      const reminderRows = (remRes.data ?? []) as ReminderLite[];
      setAllReminders(reminderRows);
      setNextReminder((reminderRows[0] as Reminder) ?? null);
      const bMap: Record<string, number> = {};
      for (const b of (budgetsRes.data ?? []) as { category_id: string; amount: number }[]) {
        bMap[b.category_id] = Number(b.amount);
      }
      setBudgets(bMap);
      if (mBudgetRes.data) {
        const fx = mBudgetRes.data.fixed_expenses as unknown as FixedExpense[];
        setMonthlyBudget({
          total_amount: Number(mBudgetRes.data.total_amount),
          fixed_expenses: Array.isArray(fx) ? fx : [],
          savings_goal: Number((mBudgetRes.data as { savings_goal?: number }).savings_goal ?? 0),
        });
      } else {
        setMonthlyBudget(null);
      }
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  const today = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }, []);

  const todayTotal = sumExpensesOnDay(allTx, today);
  const yesterdayTotal = sumExpensesOnDay(allTx, yesterday);
  const avg = averageDailyExpense(allTx, 14);
  const status = getDailyStatus(todayTotal, avg);
  const compare = compareWithYesterday(todayTotal, yesterdayTotal);
  const streak = calcStreak(allTx);
  const trigger = useMemo(() => getDailyTrigger(allTx), [allTx]);
  const closure = useMemo(() => getYesterdayClosure(allTx), [allTx]);
  const milestone = streakMilestone(streak);

  const grouped = useMemo(() => groupByDay(recent.slice(0, 6)), [recent]);

  // Monthly breakdown by category (gastos del mes calendario actual)
  const breakdown = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const totals = new Map<string, { cat: Category; total: number }>();
    let other = 0;
    let monthTotal = 0;
    for (const t of allTx) {
      if (t.type !== "gasto") continue;
      const d = new Date(t.date);
      if (`${d.getFullYear()}-${d.getMonth()}` !== monthKey) continue;
      const amt = Number(t.amount);
      monthTotal += amt;
      const cat = matchCategory(t.description ?? "");
      if (!cat) {
        other += amt;
        continue;
      }
      const cur = totals.get(cat.id);
      if (cur) cur.total += amt;
      else totals.set(cat.id, { cat, total: amt });
    }
    const items = [...totals.values()].sort((a, b) => b.total - a.total).slice(0, 5);
    return { items, other, monthTotal };
  }, [allTx]);

  const coachInsights = useMemo(
    () =>
      generateCoachInsights({
        txs: allTx,
        todayTotal,
        yesterdayTotal,
        avg14: avg,
        streak,
      }),
    [allTx, todayTotal, yesterdayTotal, avg, streak],
  );
  const topInsight = coachInsights[0] ?? null;
  const patterns = useMemo(() => detectPatterns(allTx), [allTx]);
  const greeting = useMemo(() => greetingByHour(), []);

  const weekly = useMemo(
    () => getWeeklySummary(allTx, (desc) => matchCategory(desc)),
    [allTx],
  );

  const liveBalance = useMemo(
    () => calcLiveBalance(allTx, monthlyBudget),
    [allTx, monthlyBudget],
  );
  const weekLive = useMemo(
    () => calcWeekLive(allTx, liveBalance.dailyAllowance),
    [allTx, liveBalance.dailyAllowance],
  );
  const savings = useMemo(
    () => calcSavings(allTx, monthlyBudget),
    [allTx, monthlyBudget],
  );

  // Top categorías cerca del límite (≥80%) — para mostrar en LiveBalanceCard
  const categoryAlerts = useMemo(() => {
    const items: { cat: Category; pct: number; spent: number; limit: number }[] = [];
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const totals = new Map<string, number>();
    for (const t of allTx) {
      if (t.type !== "gasto") continue;
      const d = new Date(t.date);
      if (`${d.getFullYear()}-${d.getMonth()}` !== monthKey) continue;
      const cat = matchCategory(t.description ?? "");
      if (!cat) continue;
      totals.set(cat.id, (totals.get(cat.id) ?? 0) + Number(t.amount));
    }
    for (const [catId, limit] of Object.entries(budgets)) {
      const spent = totals.get(catId) ?? 0;
      const pct = Math.round((spent / limit) * 100);
      if (pct < 80) continue;
      const cat = CATEGORIES.find((c) => c.id === catId);
      if (cat) items.push({ cat, pct, spent, limit });
    }
    return items.sort((a, b) => b.pct - a.pct).slice(0, 2);
  }, [allTx, budgets]);

  // 🔔 Motor de alertas del coach (riesgo + hábito)
  const coachAlerts = useMemo(
    () =>
      buildCoachAlerts({
        txs: allTx,
        balance: liveBalance,
        savings,
        categoryBudgets: budgets,
        reminders: allReminders,
        streak,
      }),
    [allTx, liveBalance, savings, budgets, allReminders, streak],
  );

  // Disparar el toast de la alerta más prioritaria que no se haya mostrado hoy.
  // Se ejecuta una sola vez por sesión (evitamos re-disparar al re-render).
  useEffect(() => {
    if (loading || toastFiredRef.current || coachAlerts.length === 0) return;
    const next = coachAlerts.find((a) => !wasShownToday(a.id));
    if (!next) return;
    toastFiredRef.current = true;
    const t = setTimeout(() => {
      toast(`${next.emoji} ${next.title}`, {
        description: next.detail,
        duration: next.severity === "critical" ? 7000 : 5000,
        action: next.href && next.cta
          ? { label: next.cta, onClick: () => { window.location.assign(next.href!); } }
          : undefined,
      });
      markShown(next.id);
    }, 800);
    return () => clearTimeout(t);
  }, [loading, coachAlerts]);

  // Subtle confetti when the user hits a streak milestone (3/7/14/30),
  // once per milestone per day. Only after the first data load.
  useEffect(() => {
    if (loading) return;
    void celebrateStreakIfMilestone(streak);
  }, [loading, streak]);
  // Persist 30-day category usage so the Add screen can rank chips by habit.
  useEffect(() => {
    if (allTx.length === 0) return;
    const cutoff = Date.now() - 30 * 86400000;
    const counts: Record<string, number> = {};
    for (const t of allTx) {
      if (t.type !== "gasto") continue;
      if (new Date(t.date).getTime() < cutoff) continue;
      const cat = matchCategory(t.description ?? "");
      if (cat) counts[cat.id] = (counts[cat.id] ?? 0) + 1;
    }
    try {
      localStorage.setItem("miplata.cat-usage.v1", JSON.stringify(counts));
    } catch {
      /* ignore quota errors */
    }
  }, [allTx]);

  return (
    <div className="px-5 pt-10 space-y-5">
      <header>
        <p className="text-muted-foreground text-sm">{greeting} · tu coach financiero</p>
        <h1 className="text-2xl font-bold tracking-tight mt-0.5">{status.headline}</h1>
        <p className="text-sm text-muted-foreground mt-1">{status.detail}</p>
      </header>

      {/* Reactive daily trigger — pulls the user back every day */}
      {!loading && <DailyTriggerBanner trigger={trigger} />}

      {/* 🔔 Bandeja del coach — alertas contextuales (riesgo + hábito) */}
      {!loading && coachAlerts.length > 0 && <CoachInbox alerts={coachAlerts} />}

      {/* Coach del día — insight protagonista, generado dinámicamente */}
      {!loading && topInsight && <CoachCard insight={topInsight} greeting={greeting} />}

      {/* End-of-day closure (yesterday) */}
      {!loading && closure && <ClosureCard data={closure} />}

      {/* LIVE BALANCE — protagonista */}
      {!loading && <LiveBalanceCard balance={liveBalance} todayTotal={todayTotal} savings={savings} categoryAlerts={categoryAlerts} />}

      {/* Vista semanal real */}
      {!loading && <WeekLiveCard data={weekLive} />}

      {/* Hoy en detalle (mini) — promedio + comparación con ayer */}
      <section className="bg-card rounded-2xl p-4 shadow-soft grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">📊 Promedio diario</p>
          <p className="font-semibold mt-1 tabular-nums">{formatGs(avg)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">🎯 Vs ayer</p>
          <p className="font-semibold mt-1 text-sm">
            {compare.label} {compare.emoji}
          </p>
        </div>
      </section>

      {/* Habit + Reminder row */}
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Flame className="h-3.5 w-3.5 text-streak" />
            Racha
          </div>
          <p className="text-2xl font-bold mt-1 tabular-nums">
            {streak}
            <span className="text-base font-medium text-muted-foreground ml-1">
              {streak === 1 ? "día" : "días"}
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight mt-1">
            {milestone ?? (streak === 0 ? "Empezá hoy tu racha" : "registrando movimientos")}
          </p>
        </div>

        <Link
          to="/reminders"
          className="bg-card rounded-2xl p-4 shadow-soft active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Bell className="h-3.5 w-3.5 text-primary" />
            Próximo pago
          </div>
          {nextReminder ? (
            <>
              <p className="font-semibold mt-1 truncate">{nextReminder.title}</p>
              <p
                className={cn(
                  "text-[11px] leading-tight mt-1 font-medium",
                  reminderUrgency(nextReminder.due_date).urgent
                    ? "text-expense"
                    : "text-muted-foreground",
                )}
              >
                {reminderUrgency(nextReminder.due_date).label}
                {reminderUrgency(nextReminder.due_date).urgent && " ⚠️"}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold mt-1">Sin pagos</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-1">
                Agregá un recordatorio
              </p>
            </>
          )}
        </Link>
      </section>

      {/* Weekly summary — habit-builder loop */}
      {!loading && weekly.hasData && <WeeklySummary data={weekly} />}

      {/* Patterns detected by the coach */}
      {!loading && patterns.length > 0 && <PatternsCard patterns={patterns} />}

      {/* Monthly breakdown by category */}
      {breakdown.monthTotal > 0 && (
        <section className="bg-card rounded-3xl p-5 shadow-soft animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Gastos del mes</h2>
            </div>
            <Link to="/budgets" className="text-xs font-medium text-primary">
              Presupuestos →
            </Link>
          </div>

          <p className="text-xs text-muted-foreground tabular-nums mb-3">
            Total: <span className="font-semibold text-foreground">{formatGs(breakdown.monthTotal)}</span>
          </p>

          {breakdown.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no podemos agrupar tus gastos. Probá usar palabras como "comida", "nafta" o "uber".
            </p>
          ) : (
            <ul className="space-y-3">
              {breakdown.items.map(({ cat, total }) => {
                const sharePct = Math.max(2, Math.round((total / breakdown.monthTotal) * 100));
                const budget = budgets[cat.id];
                const budgetPct = budget ? Math.round((total / budget) * 100) : 0;
                const overBudget = budget && budgetPct >= 100;
                const nearBudget = budget && budgetPct >= 80 && budgetPct < 100;
                const barClass = overBudget
                  ? "bg-destructive"
                  : nearBudget
                    ? "bg-warn"
                    : "gradient-primary";
                return (
                  <li key={cat.id}>
                    <Link
                      to={`/category/${cat.id}`}
                      className="block active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-base leading-none">{cat.emoji}</span>
                        <span className="text-sm font-medium flex-1 truncate">{cat.label}</span>
                        {budget ? (
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wide tabular-nums px-1.5 py-0.5 rounded-md",
                              overBudget
                                ? "bg-destructive/15 text-expense"
                                : nearBudget
                                  ? "bg-warn/20 text-warn"
                                  : "bg-accent text-accent-foreground",
                            )}
                          >
                            {budgetPct}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground tabular-nums">{sharePct}%</span>
                        )}
                        <span className="text-sm font-semibold tabular-nums shrink-0">
                          {formatGs(total)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", barClass)}
                          style={{
                            width: `${Math.min(100, budget ? budgetPct : sharePct)}%`,
                          }}
                        />
                      </div>
                      {budget && (
                        <p
                          className={cn(
                            "text-[10px] mt-1 tabular-nums",
                            overBudget
                              ? "text-expense font-semibold"
                              : nearBudget
                                ? "text-warn font-medium"
                                : "text-muted-foreground",
                          )}
                        >
                          {overBudget
                            ? `¡Pasaste el límite! · ${formatGs(budget)}`
                            : nearBudget
                              ? `Cerca del límite · ${formatGs(budget)}`
                              : `Límite: ${formatGs(budget)}`}
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
              {breakdown.other > 0 && (
                <li className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                  <span>Otros (sin categoría)</span>
                  <span className="tabular-nums">{formatGs(breakdown.other)}</span>
                </li>
              )}
            </ul>
          )}
        </section>
      )}

      {/* Recent activity */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-semibold">Movimientos recientes</h2>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="bg-card rounded-3xl p-8 text-center shadow-soft">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-accent flex items-center justify-center mb-3">
              <Receipt className="h-7 w-7 text-accent-foreground" />
            </div>
            <p className="font-medium">Aún no hay movimientos</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tocá el botón <span className="font-semibold text-primary">+</span> para agregar el primero.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                  {group.label}
                </p>
                <ul className="bg-card rounded-3xl shadow-soft overflow-hidden divide-y divide-border">
                  {group.items.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                      <div
                        className={cn(
                          "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0",
                          t.type === "ingreso"
                            ? "bg-accent text-income"
                            : "bg-destructive/10 text-expense",
                        )}
                      >
                        {t.type === "ingreso" ? (
                          <ArrowDownLeft className="h-5 w-5" strokeWidth={2.4} />
                        ) : (
                          <ArrowUpRight className="h-5 w-5" strokeWidth={2.4} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {t.description || (t.type === "ingreso" ? "Ingreso" : "Gasto")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatTime(t.date)}</p>
                      </div>
                      <p
                        className={cn(
                          "font-semibold tabular-nums shrink-0",
                          t.type === "ingreso" ? "text-income" : "text-expense",
                        )}
                      >
                        {t.type === "ingreso" ? "+" : "-"}
                        {formatGs(t.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
}

function groupByDay(items: Transaction[]) {
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const todayItems: Transaction[] = [];
  const yestItems: Transaction[] = [];
  const olderItems: Transaction[] = [];
  for (const t of items) {
    const d = new Date(t.date);
    if (sameDay(d, today)) todayItems.push(t);
    else if (sameDay(d, yest)) yestItems.push(t);
    else olderItems.push(t);
  }

  const groups: { label: string; items: Transaction[] }[] = [];
  if (todayItems.length) groups.push({ label: "Hoy", items: todayItems });
  if (yestItems.length) groups.push({ label: "Ayer", items: yestItems });
  if (olderItems.length) groups.push({ label: "Anteriores", items: olderItems });
  return groups;
}
