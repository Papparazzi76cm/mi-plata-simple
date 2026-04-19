import { Sparkles } from "lucide-react";

interface Props {
  text: string;
}

export function RotatingInsight({ text }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-accent/60 text-accent-foreground text-xs font-medium w-fit">
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      <span>{text}</span>
    </div>
  );
}
