import { getCurrentCountry } from "./currencyStore";
import { currencyDecimals } from "./locales";

/**
 * Formatea un monto en la moneda configurada por el usuario.
 * El nombre se mantiene como `formatGs` por compatibilidad con el resto de la app:
 * el monto se muestra tal cual (sin conversión), solo cambia símbolo y formato.
 */
export function formatGs(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  const country = getCurrentCountry();
  if (!Number.isFinite(n)) {
    return formatZero(country.locale, country.currency);
  }
  const decimals = currencyDecimals(country.currency);
  try {
    return new Intl.NumberFormat(country.locale, {
      style: "currency",
      currency: country.currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  } catch {
    return `${n.toLocaleString(country.locale)} ${country.currency}`;
  }
}

function formatZero(locale: string, currency: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: currencyDecimals(currency),
      maximumFractionDigits: currencyDecimals(currency),
    }).format(0);
  } catch {
    return `0 ${currency}`;
  }
}

export function formatRelativeDate(iso: string): string {
  const locale = getCurrentCountry().locale;
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `Hoy · ${d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;
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
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short" });
}
