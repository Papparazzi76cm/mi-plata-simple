import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatGs } from "@/lib/format";
import type { FixedExpense } from "@/lib/balance";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function parseAmount(s: string): number {
  return Number(s.replace(/[^\d]/g, "")) || 0;
}

const FIXED_SUGGESTIONS = [
  "Alquiler",
  "Internet",
  "Luz",
  "Agua",
  "Streaming",
  "Cuota",
  "Gimnasio",
];

export default function MonthlyBudget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalStr, setTotalStr] = useState("");
  const [fixed, setFixed] = useState<FixedExpense[]>([]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("monthly_budget")
        .select("total_amount,fixed_expenses")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!mounted) return;
      if (data) {
        setTotalStr(data.total_amount > 0 ? String(Math.round(Number(data.total_amount))) : "");
        const fx = (data.fixed_expenses ?? []) as FixedExpense[];
        setFixed(Array.isArray(fx) ? fx : []);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  const total = parseAmount(totalStr);
  const fixedTotal = fixed.reduce((a, f) => a + Number(f.amount || 0), 0);
  const remaining = total - fixedTotal;

  function addFixed(label = "") {
    setFixed((prev) => [...prev, { id: uid(), label, amount: 0 }]);
  }

  function updateFixed(id: string, patch: Partial<FixedExpense>) {
    setFixed((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeFixed(id: string) {
    setFixed((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleSave() {
    if (!user) return;
    if (total <= 0) {
      toast.error("Ingresá un presupuesto mensual");
      return;
    }
    setSaving(true);
    const cleanFixed = fixed
      .filter((f) => f.label.trim() && f.amount > 0)
      .map((f) => ({ id: f.id, label: f.label.trim(), amount: Number(f.amount) }));

    const { error } = await supabase
      .from("monthly_budget")
      .upsert(
        {
          user_id: user.id,
          total_amount: total,
          fixed_expenses: cleanFixed,
        },
        { onConflict: "user_id" },
      );
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar. Intentalo de nuevo.");
      return;
    }
    toast.success("Presupuesto actualizado");
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2 px-4 py-3 max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-accent active:scale-95 transition"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Saldo del mes</p>
            <h1 className="text-base font-semibold">Tu presupuesto mensual</h1>
          </div>
        </div>
      </header>

      <main className="px-5 pt-6 space-y-6 max-w-md mx-auto">
        {loading ? (
          <div className="h-40 rounded-3xl bg-muted animate-pulse" />
        ) : (
          <>
            {/* Total mensual */}
            <section className="bg-card rounded-3xl p-5 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-xl bg-accent flex items-center justify-center text-primary">
                  <Wallet className="h-4 w-4" strokeWidth={2.4} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Paso 1
                  </p>
                  <p className="text-sm font-semibold">¿Cuánto tenés disponible al mes?</p>
                </div>
              </div>
              <Input
                inputMode="numeric"
                placeholder="3.000.000"
                value={totalStr ? Number(totalStr).toLocaleString("es-PY").replace(/,/g, ".") : ""}
                onChange={(e) => setTotalStr(e.target.value.replace(/[^\d]/g, ""))}
                className="h-14 text-2xl font-bold rounded-2xl tabular-nums px-5"
              />
              <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
                Sumá tu sueldo y cualquier ingreso fijo. Si varía, poné un promedio realista.
              </p>
            </section>

            {/* Gastos fijos previstos */}
            <section className="bg-card rounded-3xl p-5 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-xl bg-accent flex items-center justify-center text-primary text-sm font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Paso 2 · opcional
                  </p>
                  <p className="text-sm font-semibold">Tus gastos fijos del mes</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-snug mb-4">
                Los reservamos del saldo disponible para que veas cuánto te queda <em>de verdad</em> para
                el día a día.
              </p>

              {fixed.length > 0 && (
                <ul className="space-y-2 mb-3">
                  {fixed.map((f) => (
                    <li key={f.id} className="flex items-center gap-2">
                      <Input
                        placeholder="Concepto"
                        value={f.label}
                        onChange={(e) => updateFixed(f.id, { label: e.target.value })}
                        className="h-11 rounded-xl text-sm flex-1 min-w-0"
                      />
                      <Input
                        inputMode="numeric"
                        placeholder="Monto"
                        value={
                          f.amount > 0
                            ? Number(f.amount).toLocaleString("es-PY").replace(/,/g, ".")
                            : ""
                        }
                        onChange={(e) =>
                          updateFixed(f.id, { amount: parseAmount(e.target.value) })
                        }
                        className="h-11 rounded-xl text-sm w-28 tabular-nums text-right"
                      />
                      <button
                        type="button"
                        onClick={() => removeFixed(f.id)}
                        className="h-11 w-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-expense hover:bg-destructive/10 active:scale-95 transition shrink-0"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Sugerencias rápidas */}
              <div className="flex flex-wrap gap-2 mb-3">
                {FIXED_SUGGESTIONS.filter(
                  (s) => !fixed.some((f) => f.label.toLowerCase() === s.toLowerCase()),
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addFixed(s)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-accent text-accent-foreground hover:bg-accent/80 active:scale-95 transition"
                  >
                    + {s}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addFixed("")}
                className="w-full h-11 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="h-4 w-4" />
                Agregar otro
              </button>
            </section>

            {/* Resumen */}
            {total > 0 && (
              <section className="rounded-3xl p-5 gradient-card text-primary-foreground shadow-card">
                <p className="text-[11px] uppercase tracking-wider opacity-85 font-semibold">
                  Vista previa
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="opacity-90">Presupuesto mensual</span>
                    <span className="font-semibold tabular-nums">{formatGs(total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-90">Fijos previstos</span>
                    <span className="font-semibold tabular-nums">- {formatGs(fixedTotal)}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-[11px] opacity-85">Disponible para el día a día</p>
                  <p
                    className={`text-2xl font-bold tabular-nums mt-1 ${
                      remaining < 0 ? "text-destructive-foreground" : ""
                    }`}
                  >
                    {formatGs(remaining)}
                  </p>
                </div>
                {remaining < 0 && (
                  <p className="mt-2 text-[11px] font-medium opacity-90">
                    ⚠️ Tus fijos superan tu presupuesto. Revisá los montos.
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {!loading && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border">
          <div className="max-w-md mx-auto">
            <Button
              onClick={handleSave}
              disabled={saving || total <= 0}
              className="w-full h-14 text-base font-semibold rounded-2xl gradient-primary shadow-fab"
            >
              {saving ? "Guardando..." : "Guardar presupuesto"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
