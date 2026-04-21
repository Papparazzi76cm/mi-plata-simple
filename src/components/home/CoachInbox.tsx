import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoachAlert, AlertSeverity } from "@/lib/alerts";

const sevStyle: Record<AlertSeverity, string> = {
  critical: "border-l-destructive bg-destructive/5",
  warn: "border-l-warn bg-warn/5",
  info: "border-l-primary bg-primary/5",
  habit: "border-l-streak bg-streak/5",
};

const sevDot: Record<AlertSeverity, string> = {
  critical: "bg-destructive",
  warn: "bg-warn",
  info: "bg-primary",
  habit: "bg-streak",
};

interface Props {
  alerts: CoachAlert[];
}

export function CoachInbox({ alerts }: Props) {
  const [open, setOpen] = useState(false);
  if (alerts.length === 0) return null;

  const critical = alerts.filter((a) => a.severity === "critical").length;
  const visible = open ? alerts : alerts.slice(0, 1);

  return (
    <section className="bg-card rounded-3xl shadow-soft overflow-hidden animate-slide-up">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 active:bg-accent/40 transition"
      >
        <div className="relative">
          <div className="h-9 w-9 rounded-2xl bg-accent flex items-center justify-center">
            <Bell className="h-4 w-4 text-primary" strokeWidth={2.4} />
          </div>
          {critical > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {critical}
            </span>
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Bandeja del coach
          </p>
          <p className="text-sm font-semibold truncate">
            {alerts.length === 1
              ? "1 alerta para vos"
              : `${alerts.length} alertas para vos`}
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      <ul className="border-t border-border divide-y divide-border">
        {visible.map((a) => {
          const content = (
            <div
              className={cn(
                "px-5 py-3.5 border-l-[3px] flex gap-3 items-start",
                sevStyle[a.severity],
              )}
            >
              <span className="text-xl leading-none mt-0.5 shrink-0">{a.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", sevDot[a.severity])} />
                  <p className="text-sm font-semibold leading-tight truncate">{a.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                  {a.detail}
                </p>
                {a.href && a.cta && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary mt-1.5">
                    {a.cta}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
          );
          return (
            <li key={a.id}>
              {a.href ? (
                <Link to={a.href} className="block active:bg-accent/40 transition">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>

      {!open && alerts.length > 1 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full px-5 py-2.5 text-xs font-semibold text-primary border-t border-border hover:bg-accent/30 transition"
        >
          Ver {alerts.length - 1} más
        </button>
      )}
    </section>
  );
}
