import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES, type Category } from "@/lib/categories";
import { formatGs } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ArrowLeft, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Budget {
  id: string;
  category_id: string;
  amount: number;
}

interface SpentRow {
  amount: number;
  description: string | null;
}

export default function Budgets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spentByCat, setSpentByCat] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Category | null>(null);
  const [amountText, setAmountText] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [bRes, tRes] = await Promise.all([
      supabase.from("budgets").select("id,category_id,amount"),
      supabase
        .from("transactions")
        .select("amount,description")
        .eq("type", "gasto")
        .gte("date", startOfMonth.toISOString()),
    ]);

    setBudgets((bRes.data ?? []) as Budget[]);

    // Compute spent per category from descriptions
    const { matchCategory } = await import("@/lib/categories");
    const counts: Record<string, number> = {};
    for (const r of (tRes.data ?? []) as SpentRow[]) {
      const cat = matchCategory(r.description ?? "");
      if (!cat) continue;
      counts[cat.id] = (counts[cat.id] ?? 0) + Number(r.amount);
    }
    setSpentByCat(counts);
    setLoading(false);
  }

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const usedIds = useMemo(() => new Set(budgets.map((b) => b.category_id)), [budgets]);
  const available = useMemo(() => CATEGORIES.filter((c) => !usedIds.has(c.id)), [usedIds]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !picked) return;
    const amount = Number(amountText.replace(/\D/g, ""));
    if (!amount || amount <= 0) {
      toast.error("Ingresá un monto mayor a 0");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("budgets")
      .upsert(
        { user_id: user.id, category_id: picked.id, amount },
        { onConflict: "user_id,category_id" },
      );
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    toast.success(`Presupuesto de ${picked.label} guardado`);
    setOpen(false);
    setPicked(null);
    setAmountText("");
    load();
  }

  async function handleDelete(b: Budget) {
    const { error } = await supabase.from("budgets").delete().eq("id", b.id);
    if (error) {
      toast.error("No se pudo eliminar");
      return;
    }
    setBudgets((prev) => prev.filter((x) => x.id !== b.id));
  }

  function pctTone(pct: number) {
    if (pct >= 100) return { bar: "bg-destructive", text: "text-expense", label: "¡Pasaste el límite!" };
    if (pct >= 80) return { bar: "bg-warn", text: "text-warn", label: "Cerca del límite ⚠️" };
    return { bar: "gradient-primary", text: "text-primary", label: "Vas bien 👍" };
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
        <div>
          <p className="text-xs text-muted-foreground">Tus límites mensuales</p>
          <h1 className="text-xl font-bold leading-tight">Presupuestos</h1>
        </div>
      </header>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-card rounded-3xl p-8 text-center shadow-soft mb-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-accent flex items-center justify-center mb-3">
            <Target className="h-7 w-7 text-accent-foreground" />
          </div>
          <p className="font-medium">Sin presupuestos aún</p>
          <p className="text-sm text-muted-foreground mt-1">
            Definí cuánto querés gastar al mes en cada categoría.
          </p>
        </div>
      ) : (
        <ul className="space-y-3 mb-4">
          {budgets.map((b) => {
            const cat = CATEGORIES.find((c) => c.id === b.category_id);
            if (!cat) return null;
            const spent = spentByCat[b.category_id] ?? 0;
            const pct = Math.min(999, Math.round((spent / b.amount) * 100));
            const tone = pctTone(pct);
            return (
              <li key={b.id} className="bg-card rounded-2xl p-4 shadow-soft animate-slide-up">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl leading-none">{cat.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold leading-tight">{cat.label}</p>
                    <p className={cn("text-xs font-medium mt-0.5", tone.text)}>{tone.label}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(b)}
                    className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive flex items-center justify-center"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-baseline justify-between text-sm mb-1.5">
                  <span className="tabular-nums font-semibold">{formatGs(spent)}</span>
                  <span className="text-muted-foreground tabular-nums">de {formatGs(b.amount)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", tone.bar)}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 tabular-nums">
                  {pct}% usado
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <Drawer
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setPicked(null);
            setAmountText("");
          }
        }}
      >
        <DrawerTrigger asChild>
          <Button
            disabled={available.length === 0}
            className="w-full h-14 rounded-2xl gradient-primary shadow-fab text-base font-semibold"
          >
            <Plus className="h-5 w-5 mr-2" />
            {available.length === 0 ? "Todas las categorías tienen presupuesto" : "Añadir presupuesto"}
          </Button>
        </DrawerTrigger>
        <DrawerContent className="px-5 pb-8 max-w-md mx-auto">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-xl">Nuevo presupuesto</DrawerTitle>
          </DrawerHeader>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Categoría</label>
              <div className="flex flex-wrap gap-2">
                {available.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPicked(c)}
                    className={cn(
                      "h-10 px-3.5 rounded-full text-sm font-medium flex items-center gap-1.5 border transition-all active:scale-95",
                      picked?.id === c.id
                        ? "bg-primary text-primary-foreground border-primary shadow-soft"
                        : "bg-card text-foreground border-border",
                    )}
                  >
                    <span className="text-base leading-none">{c.emoji}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Monto mensual</label>
              <Input
                inputMode="numeric"
                placeholder="Ej: 300000"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value.replace(/\D/g, "").slice(0, 12))}
                className="h-12 rounded-xl"
              />
              {Number(amountText) > 0 && (
                <p className="text-sm text-muted-foreground mt-1.5 tabular-nums">
                  = {formatGs(Number(amountText))}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={saving || !picked || !amountText}
              className="w-full h-14 rounded-2xl gradient-primary shadow-fab text-base font-semibold"
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
