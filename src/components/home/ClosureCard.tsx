import { Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGs } from "@/lib/format";
import type { ClosureCard as ClosureData } from "@/lib/insights";

const toneStyles: Record<ClosureData["tone"], string> = {
  good: "bg-card border-primary/30",
  neutral: "bg-card border-border",
  warn: "bg-warn/10 border-warn/40",
  bad: "bg-destructive/10 border-destructive/40",
};

const toneAccent: Record<ClosureData["tone"], string> = {
  good: "text-primary",
  neutral: "text-muted-foreground",
  warn: "text-warn",
  bad: "text-expense",
};

interface Props {
  data: ClosureData;
}

export function ClosureCard({ data }: Props) {
  return (
    <section
      className={cn(
        "rounded-3xl border p-5 shadow-soft animate-slide-up",
        toneStyles[data.tone],
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className={cn(
            "h-8 w-8 rounded-xl bg-background/60 flex items-center justify-center",
            toneAccent[data.tone],
          )}
        >
          <Moon className="h-4 w-4" strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Así cerraste tu día
          </p>
          <p className="text-sm font-semibold">Ayer</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-muted-foreground">Total gastado</p>
          <p className="text-xl font-bold tabular-nums mt-0.5">{formatGs(data.total)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Promedio 14d</p>
          <p className="text-xl font-bold tabular-nums mt-0.5 text-muted-foreground">
            {formatGs(data.avg)}
          </p>
        </div>
      </div>

      <p className={cn("mt-3 text-sm font-medium flex items-center gap-1.5", toneAccent[data.tone])}>
        <span>{data.emoji}</span>
        <span>{data.message}</span>
      </p>
    </section>
  );
}
