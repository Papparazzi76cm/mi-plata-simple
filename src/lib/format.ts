export function formatGs(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return "0 Gs";
  // Guaraní uses dot as thousands separator, no decimals
  return `${Math.round(n).toLocaleString("es-PY").replace(/,/g, ".")} Gs`;
}

export function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `Hoy · ${d.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return "Ayer";
  }
  return d.toLocaleDateString("es-PY", { day: "2-digit", month: "short" });
}
