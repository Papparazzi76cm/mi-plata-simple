import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyTrigger } from "@/lib/insights";

const toneStyles: Record<DailyTrigger["tone"], string> = {
  info: "bg-accent text-accent-foreground border-primary/20",
  good: "bg-accent text-accent-foreground border-primary/20",
  fire: "bg-streak/15 text-foreground border-streak/40",
  warn: "bg-warn/15 text-foreground border-warn/40",
};

interface Props {
  trigger: DailyTrigger;
}

export function DailyTriggerBanner({ trigger }: Props) {
  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-soft animate-slide-up",
        toneStyles[trigger.tone],
      )}
    >
      <span className="text-2xl leading-none shrink-0" aria-hidden>
        {trigger.emoji}
      </span>
      <p className="flex-1 text-sm font-medium leading-snug">{trigger.message}</p>
      {trigger.cta && (
        <span className="flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
          {trigger.cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );

  if (trigger.cta) {
    return (
      <Link to="/add" className="block active:scale-[0.99] transition-transform">
        {inner}
      </Link>
    );
  }
  return inner;
}
