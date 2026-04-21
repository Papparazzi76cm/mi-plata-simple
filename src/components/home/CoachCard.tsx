import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoachInsight } from "@/lib/coach";

const toneStyles: Record<CoachInsight["tone"], string> = {
  good: "from-primary/15 via-primary/5 to-card border-primary/30",
  fire: "from-streak/20 via-streak/5 to-card border-streak/40",
  info: "from-accent via-accent/40 to-card border-primary/20",
  neutral: "from-muted/40 via-muted/10 to-card border-border",
  warn: "from-warn/20 via-warn/5 to-card border-warn/40",
  bad: "from-destructive/15 via-destructive/5 to-card border-destructive/40",
};

const toneAccent: Record<CoachInsight["tone"], string> = {
  good: "text-primary",
  fire: "text-streak",
  info: "text-primary",
  neutral: "text-muted-foreground",
  warn: "text-warn",
  bad: "text-expense",
};

interface Props {
  insight: CoachInsight;
  greeting?: string;
}

export function CoachCard({ insight, greeting }: Props) {
  return (
    <section
      className={cn(
        "relative rounded-3xl border p-5 shadow-card animate-slide-up overflow-hidden",
        "bg-gradient-to-br",
        toneStyles[insight.tone],
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className={cn(
            "h-8 w-8 rounded-xl bg-background/70 backdrop-blur flex items-center justify-center",
            toneAccent[insight.tone],
          )}
        >
          <Sparkles className="h-4 w-4" strokeWidth={2.4} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Tu coach del día
          </p>
          {greeting && (
            <p className="text-xs text-muted-foreground truncate">{greeting}</p>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none shrink-0 mt-0.5" aria-hidden>
          {insight.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold leading-snug text-foreground">
            {insight.message}
          </p>
          {insight.detail && (
            <p className="text-sm text-muted-foreground mt-1.5 leading-snug">
              {insight.detail}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
