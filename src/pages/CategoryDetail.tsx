import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES, matchCategory } from "@/lib/categories";
import { formatGs } from "@/lib/format";
import { ArrowLeft, ArrowUpRight, Receipt, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tx {
  id: string;
  amount: number;
  description: string;
  date: string;
}

interface Budget {
  amount: number;
}

export default function CategoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);

  const cat = useMemo(() => CATEGORIES.find((c) => c.id === id), [id]);

  useEffect(() => {
    if (!user || !cat) return;
    let mounted = true;

    async function load() {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [tRes, bRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id,amount,description,date")
          .eq("type", "gasto")
          .gte("date", startOfMonth.toISOString())
          .order("date", { ascending: false }),
        supabase
          .from("budgets")
          .select("amount")
          .eq("category_id", cat!.id)
          .maybeSingle(),
      ]);

      if (!mounted) return;
      const filtered = ((tRes.data ?? []) as Tx[]).filter(
        (t) => matchCategory(t.description ?? "")?.id === cat!.id,
      );
      setTxs(filtered);
      setBudget((bRes.data as Budget | null) ?? null);
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [user, cat]);

  const total = txs.reduce((a, t) => a + Number(t.amount), 0);
  const pct = budget ? Math.round((total / budget.amount) * 100) : 0;
  const tone =
    !budget ? "primary"
    : pct >= 100 ? "bad"
    : pct >= 80 ? "warn"
    : "good";

  if (!cat) {
    return (
      <div className="px-5 pt-10 text-center">
        <p>Categoría no encontrada</p>
        <Link to="/" className="text-primary underline mt-2 inline-block">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-10">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="h-11 w-11 rounded-full bg-card shadow-soft flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{cat.emoji}</span>
          <div>
            <p className="text-xs text-muted-foreground">Este mes</p>
            <h1 className="text-xl font-bold leading-tight">{cat.label}</h1>
          </div>
        </div>
      </header>

      {/* Summary */}
      <section
        className={cn(
          "rounded-3xl p-6 shadow-card mb-6",
          tone === "bad"
            ? "bg-destructive text-destructive-foreground"
            : tone === "warn"
              ? "bg-warn text-warn-foreground"
              : "gradient-card text-primary-foreground",
        )}
      >
        <p className="text-sm opacity-80 font-medium">Gastaste en {cat.label}</p>
        <p className="text-4xl font-bold mt-2 tracking-tight tabular-nums">{formatGs(total)}</p>

        {budget ? (
          <>
            <div className="flex items-baseline justify-between text-sm mt-5 opacity-90">
              <span className="tabular-nums">{pct}% del presupuesto</span>
              <span className="tabular-nums">de {formatGs(budget.amount)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-current/20 overflow-hidden mt-2">
              <div
                className="h-full bg-current/80 rounded-full transition-all"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </>
        ) : (
          <Link
            to="/budgets"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold underline opacity-90"
          >
            <Target className="h-3.5 w-3.5" />
            Definir presupuesto
          </Link>
        )}
      </section>

      <h2 className="text-base font-semibold mb-3 px-1">
        {txs.length} {txs.length === 1 ? "movimiento" : "movimientos"}
      </h2>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : txs.length === 0 ? (
        <div className="bg-card rounded-3xl p-8 text-center shadow-soft">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-accent flex items-center justify-center mb-3">
            <Receipt className="h-7 w-7 text-accent-foreground" />
          </div>
          <p className="font-medium">Sin movimientos este mes</p>
          <p className="text-sm text-muted-foreground mt-1">
            Cuando registrés un gasto de {cat.label}, aparecerá acá.
          </p>
        </div>
      ) : (
        <ul className="bg-card rounded-3xl shadow-soft overflow-hidden divide-y divide-border">
          {txs.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 bg-destructive/10 text-expense">
                <ArrowUpRight className="h-5 w-5" strokeWidth={2.4} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{t.description || cat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(t.date).toLocaleDateString("es-PY", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <p className="font-semibold tabular-nums shrink-0 text-expense">
                -{formatGs(t.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
