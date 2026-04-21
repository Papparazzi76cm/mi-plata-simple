import { Activity, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoachPattern } from "@/lib/coach";

const toneAccent: Record<CoachPattern["tone"], string> = {
  good: "text-primary bg-primary/10",
  fire: "text-streak bg-streak/10",
  info: "text-primary bg-accent",
  neutral: "text-muted-foreground bg-muted",
  warn: "text-warn bg-warn/15",
  bad: "text-expense bg-destructive/10",
};

interface Props {
  patterns: CoachPattern[];
}

export function PatternsCard({ patterns }: Props) {
  if (patterns.length === 0) return null;

  return (
    <section className="bg-card rounded-3xl p-5 shadow-soft animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-xl bg-accent flex items-center justify-center text-primary">
          <Activity className="h-4 w-4" strokeWidth={2.4} />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Patrones detectados
          </p>
          <p className="text-sm font-semibold">Lo que tu plata te dice</p>
        </div>
      </div>

      <ul className="space-y-2.5">
        {patterns.map((p) => (
          <li
            key={p.id}
            className="flex items-start gap-3 rounded-2xl bg-background/50 px-3 py-2.5"
          >
            <div
              className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-base",
                toneAccent[p.tone],
              )}
            >
              <span aria-hidden>{p.emoji}</span>
            </div>
            <p className="text-sm font-medium leading-snug pt-1.5">{p.message}</p>
          </li>
        ))}

        {/* Coming soon: comparativa social */}
        <li className="flex items-start gap-3 rounded-2xl border border-dashed border-border px-3 py-2.5 opacity-75">
          <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
            <Lock className="h-3.5 w-3.5" strokeWidth={2.4} />
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm font-medium leading-snug text-muted-foreground">
              Cómo gastás vs otros paraguayos
            </p>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              Próximamente · necesitamos más usuarios para comparar de forma justa
            </p>
          </div>
        </li>
      </ul>
    </section>
  );
}
