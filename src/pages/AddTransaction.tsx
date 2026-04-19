import { useMemo, useState } from "react";
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
import { suggestCategories, hasCategoryEmoji, type Category } from "@/lib/categories";

export default function AddTransaction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [type, setType] = useState<"gasto" | "ingreso">("gasto");
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => parseQuickInput(text), [text]);

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
    toast.success(type === "gasto" ? "Gasto registrado ✓" : "Ingreso registrado ✓");
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
