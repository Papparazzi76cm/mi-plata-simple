import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Bell, Plus, Repeat, Trash2, X, Calendar as CalendarIcon } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { formatGs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { z } from "zod";

interface Reminder {
  id: string;
  title: string;
  amount: number | null;
  due_date: string;
  repeat: "none" | "monthly";
}

const schema = z.object({
  title: z.string().trim().min(1, "Ponele un título").max(80),
  amount: z.number().nonnegative().max(1_000_000_000).nullable(),
  due_date: z.string().min(1, "Elegí una fecha"),
  repeat: z.enum(["none", "monthly"]),
});

function daysUntil(dateStr: string): { label: string; tone: "soon" | "ok" | "past" } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `Vencido hace ${Math.abs(diff)}d`, tone: "past" };
  if (diff === 0) return { label: "Vence hoy", tone: "soon" };
  if (diff === 1) return { label: "Mañana", tone: "soon" };
  if (diff <= 5) return { label: `En ${diff} días`, tone: "soon" };
  return { label: due.toLocaleDateString("es-PY", { day: "2-digit", month: "short" }), tone: "ok" };
}

export default function Reminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [repeat, setRepeat] = useState<"none" | "monthly">("none");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("reminders")
      .select("id,title,amount,due_date,repeat")
      .order("due_date", { ascending: true });
    setReminders((data ?? []) as Reminder[]);
    setLoading(false);
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  function reset() {
    setTitle("");
    setAmount("");
    setDueDate("");
    setRepeat("none");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const numAmount = amount ? Number(amount.replace(/\D/g, "")) : null;
    const parsed = schema.safeParse({ title, amount: numAmount, due_date: dueDate, repeat });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("reminders").insert({
      user_id: user.id,
      title: parsed.data.title,
      amount: parsed.data.amount,
      due_date: parsed.data.due_date,
      repeat: parsed.data.repeat,
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    toast.success("Recordatorio creado");
    setOpen(false);
    reset();
    load();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("reminders").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar");
      return;
    }
    setReminders((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="px-5 pt-10">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-muted-foreground text-sm">No olvides pagar</p>
          <h1 className="text-2xl font-bold tracking-tight">Recordatorios</h1>
        </div>
      </header>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : reminders.length === 0 ? (
        <div className="bg-card rounded-3xl p-8 text-center shadow-soft mb-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-accent flex items-center justify-center mb-3">
            <Bell className="h-7 w-7 text-accent-foreground" />
          </div>
          <p className="font-medium">Sin recordatorios</p>
          <p className="text-sm text-muted-foreground mt-1">
            Agregá tus pagos recurrentes (luz, agua, alquiler...).
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5 mb-4">
          {reminders.map((r) => {
            const d = daysUntil(r.due_date);
            return (
              <li
                key={r.id}
                className="bg-card rounded-2xl p-4 shadow-soft flex items-center gap-3 animate-slide-up"
              >
                <div
                  className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                    d.tone === "past"
                      ? "bg-destructive/10 text-expense"
                      : d.tone === "soon"
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{r.title}</p>
                    {r.repeat === "monthly" && (
                      <Repeat className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        d.tone === "past"
                          ? "text-expense"
                          : d.tone === "soon"
                            ? "text-primary"
                            : "text-muted-foreground",
                      )}
                    >
                      {d.label}
                    </span>
                    {r.amount != null && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs font-medium tabular-nums">{formatGs(r.amount)}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive flex items-center justify-center"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Drawer open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DrawerTrigger asChild>
          <Button className="w-full h-14 rounded-2xl gradient-primary shadow-fab text-base font-semibold">
            <Plus className="h-5 w-5 mr-2" />
            Añadir recordatorio
          </Button>
        </DrawerTrigger>
        <DrawerContent className="px-5 pb-8 max-w-md mx-auto">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-xl">Nuevo recordatorio</DrawerTitle>
          </DrawerHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Título</label>
              <Input
                placeholder="Ej: Luz ANDE"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Monto (opcional)</label>
              <Input
                inputMode="numeric"
                placeholder="Ej: 250000"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 12))}
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Fecha de vencimiento</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Repetir</label>
              <div className="grid grid-cols-2 gap-2">
                {(["none", "monthly"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRepeat(r)}
                    className={cn(
                      "h-12 rounded-xl font-medium text-sm transition-all border",
                      repeat === r
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border",
                    )}
                  >
                    {r === "none" ? "Una vez" : "Mensual"}
                  </button>
                ))}
              </div>
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="w-full h-14 rounded-2xl gradient-primary shadow-fab text-base font-semibold mt-2"
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
