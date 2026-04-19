import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGs } from "@/lib/format";
import { parseQuickInput } from "@/lib/insights";
import {
  suggestCategories,
  hasCategoryEmoji,
  matchCategory,
  rankCategoriesByUsage,
  topUsedCategories,
  type Category,
} from "@/lib/categories";

const USAGE_KEY = "miplata.cat-usage.v1";
const LAST_CAT_KEY = "miplata.last-cat.v1";
const ABANDONED_KEY = "miplata.add-abandoned.v1";

function readLastCategory(): string | null {
  try {
    return localStorage.getItem(LAST_CAT_KEY);
  } catch {
    return null;
  }
}

function setLastCategory(id: string) {
  try {
    localStorage.setItem(LAST_CAT_KEY, id);
  } catch {
    /* ignore */
  }
}

function readAbandoned(): boolean {
  try {
    return localStorage.getItem(ABANDONED_KEY) === "1";
  } catch {
    return false;
  }
}

function markAbandoned() {
  try {
    localStorage.setItem(ABANDONED_KEY, "1");
  } catch {
    /* ignore */
  }
}

function clearAbandoned() {
  try {
    localStorage.removeItem(ABANDONED_KEY);
  } catch {
    /* ignore */
  }
}

function readUsage(): Record<string, number> {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function bumpUsage(catId: string) {
  const cur = readUsage();
  cur[catId] = (cur[catId] ?? 0) + 1;
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(cur));
  } catch {
    /* ignore */
  }
}

/**
 * Checks whether this just-saved expense pushed the category above 80% or 100%
 * of its monthly budget, and shows an emotional toast only on the crossing.
 */
async function checkBudgetAlert(userId: string, cat: Category, amount: number) {
  const { data: budgetRow } = await supabase
    .from("budgets")
    .select("amount")
    .eq("user_id", userId)
    .eq("category_id", cat.id)
    .maybeSingle();
  if (!budgetRow) return;
  const budget = Number(budgetRow.amount);
  if (budget <= 0) return;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { data: rows } = await supabase
    .from("transactions")
    .select("amount,description")
    .eq("user_id", userId)
    .eq("type", "gasto")
    .gte("date", monthStart.toISOString());
  if (!rows) return;

  let after = 0;
  for (const r of rows) {
    if (matchCategory(r.description ?? "")?.id === cat.id) after += Number(r.amount);
  }
  const before = after - amount;
  const pctBefore = (before / budget) * 100;
  const pctAfter = (after / budget) * 100;

  if (pctBefore < 100 && pctAfter >= 100) {
    toast.error(`🚨 Ya superaste tu presupuesto de ${cat.label.toLowerCase()}`, {
      description: `Llevás ${Math.round(pctAfter)}% del límite mensual.`,
    });
  } else if (pctBefore < 80 && pctAfter >= 80) {
    toast.warning(`⚠️ Te queda poco en ${cat.label.toLowerCase()}`, {
      description: `Vas en el ${Math.round(pctAfter)}% del presupuesto del mes.`,
    });
  }
}

export default function AddTransaction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [type, setType] = useState<"gasto" | "ingreso">("gasto");
  const [saving, setSaving] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  const parsed = useMemo(() => parseQuickInput(text), [text]);
  const usage = useMemo(() => readUsage(), []);
  const lastCat = useMemo(() => readLastCategory(), []);
  const showHint = useMemo(() => readAbandoned(), []);
  const topUsed = useMemo(() => topUsedCategories(usage, 2), [usage]);

  // Mark this session as "opened but not saved" so next visit shows the hint.
  // Cleared on successful save (handleSubmit) — runs only when component unmounts
  // without saving.
  useEffect(() => {
    return () => {
      if (!savedSuccessfully) markAbandoned();
    };
  }, [savedSuccessfully]);

  const suggestions = useMemo(() => {
    const desc = parsed.description || text;
    // While the user is typing, prefer keyword matches; otherwise show
    // habit-ranked chips with the last-used category pinned first.
    if (desc.trim()) return suggestCategories(desc, 4);
    return rankCategoriesByUsage(usage, 5, lastCat);
  }, [parsed.description, text, usage, lastCat]);

  function applyCategory(cat: Category) {
    if (hasCategoryEmoji(text, cat)) return;
    // If the text already mentions a keyword for this category, just prepend the emoji.
    // Otherwise insert "<emoji> <label>" so the user gets a useful description.
    const hasKeyword = suggestions.some((s) => s.id === cat.id) && parsed.description.length > 0;
    const next = hasKeyword
      ? `${cat.emoji} ${text.trim()}`
      : text.trim()
        ? `${text.trim()} ${cat.emoji} ${cat.label.toLowerCase()}`
        : `${cat.emoji} ${cat.label.toLowerCase()}`;
    setText(next.slice(0, 140));
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (parsed.amount <= 0) {
      toast.error("Escribí un monto, ej: 15000 comida");
      return;
    }
    if (parsed.amount > 1_000_000_000) {
      toast.error("Monto demasiado grande");
      return;
    }
    const description = parsed.description.slice(0, 120);
    setSaving(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      amount: parsed.amount,
      description,
      type,
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    // Track habit so chips reorder over time.
    const cat = type === "gasto" ? matchCategory(description) : null;
    if (cat) bumpUsage(cat.id);
    toast.success(type === "gasto" ? "Gasto registrado ✓" : "Ingreso registrado ✓");

    // Emotional budget alert — fires only when this transaction crosses 80% / 100%.
    if (cat && type === "gasto") {
      void checkBudgetAlert(user.id, cat, parsed.amount);
    }

    navigate("/");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col animate-slide-up">
      <div className="mx-auto w-full max-w-md px-5 pt-6 pb-6 flex-1 flex flex-col">
        <header className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="h-11 w-11 rounded-full bg-card shadow-soft flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs text-muted-foreground">Rápido y simple</p>
            <h1 className="text-xl font-bold leading-tight">Añadir movimiento</h1>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          {/* Type toggle */}
          <div className="bg-card rounded-2xl p-1.5 shadow-soft grid grid-cols-2 gap-1 mb-5">
            {(["gasto", "ingreso"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "py-3 rounded-xl font-semibold text-sm transition-all",
                  type === t
                    ? t === "gasto"
                      ? "bg-destructive text-destructive-foreground shadow-soft"
                      : "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground",
                )}
              >
                {t === "gasto" ? "Gasto" : "Ingreso"}
              </button>
            ))}
          </div>

          {/* Live preview */}
          <div className="bg-card rounded-3xl p-6 shadow-soft text-center mb-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Monto</p>
            <p
              className={cn(
                "text-4xl font-bold mt-2 tabular-nums tracking-tight transition-colors",
                parsed.amount === 0
                  ? "text-muted-foreground/40"
                  : type === "gasto"
                    ? "text-expense"
                    : "text-income",
              )}
            >
              {parsed.amount > 0 ? formatGs(parsed.amount) : "0 Gs"}
            </p>
            {parsed.description && (
              <p className="mt-2 text-sm text-muted-foreground truncate">
                {parsed.description}
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground mb-2 px-1">
            Escribí monto y descripción juntos. Ej: <span className="font-medium">"15000 comida"</span>
          </p>

          {/* Chat-style input */}
          <div className="relative mb-5">
            <Input
              autoFocus
              placeholder="Ej: 15000 comida"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={140}
              className="h-16 text-base rounded-2xl pl-5 pr-16 bg-card shadow-soft border-transparent"
            />
            <button
              type="submit"
              disabled={saving || parsed.amount === 0}
              aria-label="Guardar"
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40",
                type === "gasto" ? "bg-destructive text-destructive-foreground" : "gradient-primary text-primary-foreground",
              )}
            >
              <Send className="h-5 w-5" strokeWidth={2.3} />
            </button>
          </div>

          {/* Category suggestions */}
          {suggestions.length > 0 && (
            <div className="mb-5 -mx-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-2">
                {parsed.description
                  ? "Sugerencias"
                  : Object.keys(usage).length > 0
                    ? "Tus más usadas"
                    : "Rápidas"}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {suggestions.map((cat) => {
                  const active = hasCategoryEmoji(text, cat);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => applyCategory(cat)}
                      className={cn(
                        "shrink-0 h-10 px-3.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all active:scale-95 border",
                        active
                          ? "bg-primary text-primary-foreground border-primary shadow-soft"
                          : "bg-card text-foreground border-border hover:border-primary/40",
                      )}
                    >
                      <span className="text-base leading-none">{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={saving || parsed.amount === 0}
            className={cn(
              "w-full h-16 text-lg font-semibold rounded-2xl shadow-fab mt-auto",
              type === "gasto" ? "bg-destructive hover:bg-destructive/90" : "gradient-primary",
            )}
          >
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
