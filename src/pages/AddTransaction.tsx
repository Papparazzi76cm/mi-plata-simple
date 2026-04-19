import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGs } from "@/lib/format";
import { z } from "zod";

const schema = z.object({
  amount: z.number().positive({ message: "Ingresá un monto mayor a 0" }).max(1_000_000_000),
  description: z.string().trim().max(120, { message: "Descripción muy larga" }),
  type: z.enum(["gasto", "ingreso"]),
});

export default function AddTransaction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"gasto" | "ingreso">("gasto");
  const [saving, setSaving] = useState(false);

  const numericAmount = Number(amount.replace(/\D/g, "")) || 0;

  function handleAmountChange(v: string) {
    // strip non-digits, cap length
    const digits = v.replace(/\D/g, "").slice(0, 12);
    setAmount(digits);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ amount: numericAmount, description, type });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      amount: parsed.data.amount,
      description: parsed.data.description,
      type: parsed.data.type,
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    toast.success(type === "gasto" ? "Gasto registrado" : "Ingreso registrado");
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pt-6 pb-10">
        <header className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="h-11 w-11 rounded-full bg-card shadow-soft flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Añadir movimiento</h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type toggle */}
          <div className="bg-card rounded-2xl p-1.5 shadow-soft grid grid-cols-2 gap-1">
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

          {/* Big amount display */}
          <div className="bg-card rounded-3xl p-6 shadow-soft text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Monto</p>
            <p
              className={cn(
                "text-4xl font-bold mt-2 tabular-nums tracking-tight",
                numericAmount === 0 && "text-muted-foreground/40",
              )}
            >
              {numericAmount > 0 ? formatGs(numericAmount) : "0 Gs"}
            </p>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              placeholder="Ej: 15000"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="mt-4 h-14 text-center text-lg rounded-2xl border-border bg-background"
            />
          </div>

          {/* Description */}
          <div>
            <Input
              type="text"
              placeholder="¿En qué gastaste?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
              className="h-14 text-base rounded-2xl px-5 bg-card shadow-soft border-transparent"
            />
          </div>

          <Button
            type="submit"
            disabled={saving || numericAmount === 0}
            className={cn(
              "w-full h-16 text-lg font-semibold rounded-2xl shadow-fab",
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
