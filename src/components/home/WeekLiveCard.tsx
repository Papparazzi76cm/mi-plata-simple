import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGs } from "@/lib/format";
import type { WeekLive } from "@/lib/balance";

const dayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const statusBar: Record<WeekLive["status"], string> = {
  healthy: "gradient-primary",
  warning: "bg-warn",
  danger: "bg-destructive",
  over: "bg-destructive",
};

const statusText: Record<WeekLive["status"], string> = {
  healthy: "Vas en buen ritmo esta semana",
  warning: "Vas algo apurado en gasto esta semana",
  danger: "Casi gastás todo lo de la semana",
  over: "Te pasaste del ritmo semanal",
};

interface Props {
  data: WeekLive;
}

export function WeekLiveCard({ data }: Props) {
  // Sin allowance (= sin presupuesto) → mostrar versión simple
  if (data.weeklyAllowance <= 0) {
    return (
      <section className="bg-card rounded-3xl p-5 shadow-soft animate-slide-up">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-xl bg-accent flex items-center justify-center text-primary">
            <CalendarRange className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Tu semana
            </p>
            <p className="text-sm font-semibold">Llevás gastado</p>
          </div>
        </div>
        <p className="text-2xl font-bold tabular-nums mt-1">{formatGs(data.spent)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Configurá tu presupuesto para ver cuánto te queda esta semana.
        </p>
      </section>
    );
  }

  const remaining = Math.max(0, data.weeklyRemaining);
  const isOver = data.status === "over";

  return (
    <section className="bg-card rounded-3xl p-5 shadow-soft animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-xl bg-accent flex items-center justify-center text-primary">
          <CalendarRange className="h-4 w-4" strokeWidth={2.4} />
        </div>
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Tu semana
          </p>
          <p className="text-sm font-semibold">{statusText[data.status]}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-accent/40 p-3">
          <p className="text-[11px] text-muted-foreground">Gastado esta semana</p>
          <p className="text-lg font-bold tabular-nums mt-0.5">{formatGs(data.spent)}</p>
        </div>
        <div className="rounded-2xl bg-accent/40 p-3">
          <p className="text-[11px] text-muted-foreground">
            {isOver ? "Excediste por" : "Te queda esta semana"}
          </p>
          <p
            className={cn(
              "text-lg font-bold tabular-nums mt-0.5",
              isOver ? "text-expense" : "text-primary",
            )}
          >
            {formatGs(isOver ? Math.abs(data.weeklyRemaining) : remaining)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", statusBar[data.status])}
            style={{ width: `${Math.min(100, data.percentUsed)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground tabular-nums">
          <span>{data.percentUsed}% del semanal</span>
          <span>
            {dayLabels[data.dayInWeek - 1]} · día {data.dayInWeek}/7
          </span>
        </div>
      </div>
    </section>
  );
}
