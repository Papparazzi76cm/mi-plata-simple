import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatGs, formatRelativeDate } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  type: "gasto" | "ingreso";
  amount: number;
  description: string;
  date: string;
}

export default function Index() {
  const { user } = useAuth();
  const [todayTotal, setTodayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function load() {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [recentRes, todayRes, monthRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id,type,amount,description,date")
          .order("date", { ascending: false })
          .limit(5),
        supabase
          .from("transactions")
          .select("amount")
          .eq("type", "gasto")
          .gte("date", startOfDay),
        supabase
          .from("transactions")
          .select("amount")
          .eq("type", "gasto")
          .gte("date", startOfMonth),
      ]);

      if (!mounted) return;
      setRecent((recentRes.data ?? []) as Transaction[]);
      setTodayTotal((todayRes.data ?? []).reduce((a, t: any) => a + Number(t.amount), 0));
      setMonthTotal((monthRes.data ?? []).reduce((a, t: any) => a + Number(t.amount), 0));
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <div className="px-5 pt-10">
      <header className="mb-6">
        <p className="text-muted-foreground text-sm">¡Hola! 👋</p>
        <h1 className="text-2xl font-bold tracking-tight">Mi Plata</h1>
      </header>

      {/* Hero summary card */}
      <section className="gradient-card rounded-3xl p-6 text-primary-foreground shadow-card animate-slide-up">
        <p className="text-sm/none opacity-80 font-medium">Gastaste hoy</p>
        <p className="text-4xl font-bold mt-2 tracking-tight">{formatGs(todayTotal)}</p>
        <div className="mt-5 pt-5 border-t border-primary-foreground/20 flex items-center justify-between">
          <span className="text-sm opacity-80">Este mes</span>
          <span className="text-base font-semibold">{formatGs(monthTotal)}</span>
        </div>
      </section>

      {/* Recent activity */}
      <section className="mt-8">
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
          <ul className="bg-card rounded-3xl shadow-soft overflow-hidden divide-y divide-border">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                <div
                  className={cn(
                    "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0",
                    t.type === "ingreso" ? "bg-accent text-income" : "bg-destructive/10 text-expense",
                  )}
                >
                  {t.type === "ingreso" ? (
                    <ArrowDownLeft className="h-5 w-5" strokeWidth={2.4} />
                  ) : (
                    <ArrowUpRight className="h-5 w-5" strokeWidth={2.4} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{t.description || (t.type === "ingreso" ? "Ingreso" : "Gasto")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeDate(t.date)}</p>
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
        )}
      </section>
    </div>
  );
}
