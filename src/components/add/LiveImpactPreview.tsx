import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { matchCategory, type Category } from "@/lib/categories";
import { calcLiveBalance, calcSavings, type MonthlyBudget } from "@/lib/balance";
import type { TxLite } from "@/lib/insights";
import { formatGs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TrendingDown, Target, AlertTriangle } from "lucide-react";

interface Props {
  /** Monto del gasto que está escribiendo (Gs). 0 = nada. */
  amount: number;
  /** Texto libre para inferir categoría. */
  description: string;
  /** "gasto" | "ingreso" — solo gastos impactan negativo. */
  type: "gasto" | "ingreso";
}

interface MonthData {
  txs: TxLite[];
  budget: MonthlyBudget | null;
  catBudget: Map<string, number>;
}

/**
 * Predicción en tiempo real del impacto del movimiento que el usuario está
 * escribiendo. Carga los datos del mes una sola vez y los usa para simular
 * el estado del saldo y la meta de ahorro DESPUÉS del gasto.
 */
export function LiveImpactPreview({ amount, description, type }: Props) {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const [data, setData] = useState<MonthData | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [txRes, budRes, catBudRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("type,amount,date,description")
          .eq("user_id", user.id)
          .gte("date", monthStart.toISOString()),
        supabase
          .from("monthly_budget")
          .select("total_amount,fixed_expenses,savings_goal")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("budgets")
          .select("category_id,amount")
          .eq("user_id", user.id),
      ]);

      if (cancelled) return;

      const txs: TxLite[] = (txRes.data ?? []).map((t) => ({
        type: t.type as "gasto" | "ingreso",
        amount: Number(t.amount),
        date: t.date as string,
        description: (t.description as string) ?? "",
      }));

      const budget: MonthlyBudget | null = budRes.data
        ? {
            total_amount: Number(budRes.data.total_amount ?? 0),
            fixed_expenses: Array.isArray(budRes.data.fixed_expenses)
              ? (budRes.data.fixed_expenses as unknown as MonthlyBudget["fixed_expenses"])
              : [],
            savings_goal: Number(budRes.data.savings_goal ?? 0),
          }
        : null;

      const catBudget = new Map<string, number>();
      for (const row of catBudRes.data ?? []) {
        catBudget.set(row.category_id as string, Number(row.amount));
      }

      setData({ txs, budget, catBudget });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!data || amount <= 0 || type !== "gasto") return null;

  const cat: Category | null = matchCategory(description);

  // Simulamos: agregamos la transacción "futura" a la lista del mes.
  const futureTx: TxLite = {
    type: "gasto",
    amount,
    date: new Date().toISOString(),
    description,
  };
  const txsAfter = [...data.txs, futureTx];

  const liveBefore = calcLiveBalance(data.txs, data.budget);
  const liveAfter = calcLiveBalance(txsAfter, data.budget);
  const savingsBefore = calcSavings(data.txs, data.budget);
  const savingsAfter = calcSavings(txsAfter, data.budget);

  // ---------- Línea 1: impacto en saldo del mes ----------
  let line1: { text: string; tone: "good" | "warn" | "bad" } | null = null;
  if (liveAfter.hasBudget) {
    const remaining = Math.max(0, liveAfter.available);
    const dailyAfter = liveAfter.dailyAllowance;
    if (liveAfter.status === "over") {
      line1 = {
        text: `Te pasás del presupuesto del mes`,
        tone: "bad",
      };
    } else if (liveAfter.status === "danger" && liveBefore.status !== "danger") {
      line1 = {
        text: `Quedarías al ${liveAfter.percentUsed}% del presupuesto`,
        tone: "warn",
      };
    } else {
      line1 = {
        text: `Te quedarían ${formatGs(remaining)} (${formatGs(Math.round(dailyAfter))}/día)`,
        tone: dailyAfter > 0 ? "good" : "warn",
      };
    }
  }

  // ---------- Línea 2: impacto en categoría ----------
  let line2: { text: string; tone: "good" | "warn" | "bad" } | null = null;
  if (cat) {
    const catLimit = data.catBudget.get(cat.id) ?? 0;
    if (catLimit > 0) {
      let spentInCat = 0;
      for (const t of data.txs) {
        if (t.type !== "gasto") continue;
        if (matchCategory(t.description ?? "")?.id === cat.id) {
          spentInCat += Number(t.amount);
        }
      }
      const after = spentInCat + amount;
      const pct = Math.round((after / catLimit) * 100);
      if (pct >= 100) {
        line2 = { text: `${cat.emoji} Te pasás del límite de ${cat.label.toLowerCase()}`, tone: "bad" };
      } else if (pct >= 80) {
        line2 = { text: `${cat.emoji} Quedarías al ${pct}% en ${cat.label.toLowerCase()}`, tone: "warn" };
      } else {
        line2 = {
          text: `${cat.emoji} ${formatGs(catLimit - after)} restantes en ${cat.label.toLowerCase()}`,
          tone: "good",
        };
      }
    }
  }

  // ---------- Línea 3: impacto en meta de ahorro (solo PRO) ----------
  let line3: { text: string; tone: "good" | "warn" | "bad" } | null = null;
  if (isPro && savingsAfter.hasGoal) {
    const drop = savingsBefore.percent - savingsAfter.percent;
    if (drop > 0) {
      line3 = {
        text: `Reduce tu ahorro mensual en ${drop}%`,
        tone: drop >= 5 ? "warn" : "good",
      };
    }
  }

  const lines = [line1, line2, line3].filter(Boolean) as Array<{
    text: string;
    tone: "good" | "warn" | "bad";
  }>;

  if (lines.length === 0) return null;

  return (
    <div className="mb-4 bg-card rounded-2xl shadow-soft overflow-hidden animate-slide-up">
      <div className="px-4 py-2.5 bg-accent/40 flex items-center gap-2">
        <span className="text-sm">🧠</span>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Impacto previsto
        </p>
      </div>
      <ul className="divide-y divide-border">
        {lines.map((l, i) => {
          const Icon = l.tone === "bad" ? AlertTriangle : i === 0 ? TrendingDown : Target;
          return (
            <li
              key={i}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm",
                l.tone === "bad" && "text-destructive",
                l.tone === "warn" && "text-warn",
                l.tone === "good" && "text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="font-medium leading-tight">{l.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
