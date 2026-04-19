import { CalendarDays } from "lucide-react";
import { formatGs } from "@/lib/format";
import type { WeeklySummary as WeeklyData } from "@/lib/insights";

interface Props {
  data: WeeklyData;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function WeeklySummary({ data }: Props) {
  return (
    <section className="bg-card rounded-3xl p-5 shadow-soft animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-xl bg-accent flex items-center justify-center text-primary">
          <CalendarDays className="h-4 w-4" strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Resumen de tu semana
          </p>
          <p className="text-sm font-semibold">Últimos 7 días</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl bg-accent/40 p-3">
          <p className="text-[11px] text-muted-foreground">Total semana</p>
          <p className="text-lg font-bold tabular-nums mt-0.5">{formatGs(data.total)}</p>
        </div>
        <div className="rounded-2xl bg-accent/40 p-3">
          <p className="text-[11px] text-muted-foreground">Día con más gasto</p>
          <p className="text-lg font-bold mt-0.5 capitalize">{data.topDayLabel}</p>
          {data.topDayAmount > 0 && (
            <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
              {formatGs(data.topDayAmount)}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {data.topCategoryLabel && (
          <p className="text-sm font-medium">
            <span className="mr-1">{data.topCategoryEmoji}</span>
            Tu mayor gasto fue en {data.topCategoryLabel.toLowerCase()}
          </p>
        )}
        {data.topDayAmount > 0 && (
          <p className="text-sm text-muted-foreground">
            Tu día más caro fue el {data.topDayLabel.toLowerCase()} 👀
          </p>
        )}
      </div>
    </section>
  );
}
