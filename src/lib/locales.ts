// Catálogo de países (España, Hispanoamérica y USA) con su moneda y locale.
// El monto se muestra tal cual lo cargó el usuario, solo cambia el formato/símbolo.

export interface CountryInfo {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  flag: string;
  currency: string; // ISO 4217
  locale: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: "PY", name: "Paraguay", flag: "🇵🇾", currency: "PYG", locale: "es-PY" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", currency: "ARS", locale: "es-AR" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴", currency: "BOB", locale: "es-BO" },
  { code: "CL", name: "Chile", flag: "🇨🇱", currency: "CLP", locale: "es-CL" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", currency: "COP", locale: "es-CO" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷", currency: "CRC", locale: "es-CR" },
  { code: "CU", name: "Cuba", flag: "🇨🇺", currency: "CUP", locale: "es-CU" },
  { code: "DO", name: "República Dominicana", flag: "🇩🇴", currency: "DOP", locale: "es-DO" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨", currency: "USD", locale: "es-EC" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻", currency: "USD", locale: "es-SV" },
  { code: "ES", name: "España", flag: "🇪🇸", currency: "EUR", locale: "es-ES" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹", currency: "GTQ", locale: "es-GT" },
  { code: "HN", name: "Honduras", flag: "🇭🇳", currency: "HNL", locale: "es-HN" },
  { code: "MX", name: "México", flag: "🇲🇽", currency: "MXN", locale: "es-MX" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮", currency: "NIO", locale: "es-NI" },
  { code: "PA", name: "Panamá", flag: "🇵🇦", currency: "PAB", locale: "es-PA" },
  { code: "PE", name: "Perú", flag: "🇵🇪", currency: "PEN", locale: "es-PE" },
  { code: "PR", name: "Puerto Rico", flag: "🇵🇷", currency: "USD", locale: "es-PR" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾", currency: "UYU", locale: "es-UY" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", currency: "VES", locale: "es-VE" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", currency: "USD", locale: "en-US" },
];

export const DEFAULT_COUNTRY: CountryInfo = COUNTRIES[0]; // Paraguay

export function findCountry(code: string | null | undefined): CountryInfo {
  if (!code) return DEFAULT_COUNTRY;
  return COUNTRIES.find((c) => c.code === code.toUpperCase()) ?? DEFAULT_COUNTRY;
}

/** Detecta país a partir del idioma del navegador. Fallback: Paraguay. */
export function detectCountry(): CountryInfo {
  if (typeof navigator === "undefined") return DEFAULT_COUNTRY;
  const lang = navigator.language || (navigator.languages?.[0] ?? "");
  const region = lang.split("-")[1]?.toUpperCase();
  if (!region) return DEFAULT_COUNTRY;
  return COUNTRIES.find((c) => c.code === region) ?? DEFAULT_COUNTRY;
}

/** Define cuántos decimales mostrar según la moneda. */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "PYG", "CLP", "COP", "ARS", "JPY", "KRW", "VND", "VES",
]);

export function currencyDecimals(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}
