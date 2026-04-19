import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatGs } from "@/lib/format";
import {
  averageDailyExpense,
  calcStreak,
  compareWithYesterday,
  getDailyStatus,
  reminderUrgency,
  sumExpensesOnDay,
  type TxLite,
} from "@/lib/insights";
import { ArrowDownLeft, ArrowUpRight, Bell, Flame, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

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

const moodStyles: Record<string, string> = {
  good: "gradient-card text-primary-foreground",
  warn: "bg-warn text-warn-foreground",
  bad: "bg-destructive text-destructive-foreground",
  neutral: "gradient-card text-primary-foreground",
};

export default function Index() {
  const { user } = useAuth();
  const [allTx, setAllTx] = useState<TxLite[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [nextReminder, setNextReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function load() {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const [recentRes, windowRes, remRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id,type,amount,description,date")
          .order("date", { ascending: false })
          .limit(8),
        supabase
          .from("transactions")
          .select("type,amount,date")
          .gte("date", since.toISOString()),
        supabase
          .from("reminders")
          .select("id,title,due_date,amount")
          .gte("due_date", new Date().toISOString().slice(0, 10))
          .order("due_date", { ascending: true })
          .limit(1),
      ]);

      if (!mounted) return;
      setRecent((recentRes.data ?? []) as Transaction[]);
      setAllTx((windowRes.data ?? []) as TxLite[]);
      setNextReminder(((remRes.data ?? [])[0] as Reminder) ?? null);
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

  const grouped = useMemo(() => groupByDay(recent.slice(0, 6)), [recent]);

  return (
    <div className="px-5 pt-10 space-y-6">
      <header>
        <p className="text-muted-foreground text-sm">Hoy con tu plata 👇</p>
        <h1 className="text-2xl font-bold tracking-tight mt-0.5">{status.headline}</h1>
        <p className="text-sm text-muted-foreground mt-1">{status.detail}</p>
      </header>

      {/* Smart summary card */}
      <section
        className={cn(
          "rounded-3xl p-6 shadow-card animate-slide-up",
          moodStyles[status.mood] ?? moodStyles.neutral,
        )}
      >
        <p className="text-sm/none opacity-80 font-medium">💰 Hoy gastaste</p>
        <p className="text-4xl font-bold mt-2 tracking-tight tabular-nums">{formatGs(todayTotal)}</p>

        <div className="mt-5 pt-5 border-t border-current/20 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="opacity-75 text-xs">📊 Promedio diario</p>
            <p className="font-semibold mt-1 tabular-nums">{formatGs(avg)}</p>
          </div>
          <div>
            <p className="opacity-75 text-xs">🎯 Vs ayer</p>
            <p className="font-semibold mt-1">
              {compare.label} {compare.emoji}
            </p>
          </div>
        </div>
      </section>

      {/* Habit + Reminder row */}
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            Racha
          </div>
          <p className="text-2xl font-bold mt-1 tabular-nums">
            {streak}
            <span className="text-base font-medium text-muted-foreground ml-1">
              {streak === 1 ? "día" : "días"}
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight mt-1">
            {streak === 0 ? "Empezá hoy tu racha" : "registrando movimientos"}
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
