// Quick-pick categories for Mi Plata. Used as suggestion chips in
// Add Transaction. Matches are case-insensitive and accent-insensitive.

export interface Category {
  /** Stable id, used for keys. */
  id: string;
  /** Visible emoji. */
  emoji: string;
  /** Short label shown on the chip. */
  label: string;
  /** Keywords that trigger this category from typed text. First entry
   * is also the canonical word inserted when picking from defaults. */
  keywords: string[];
}

export const CATEGORIES: Category[] = [
  { id: "comida", emoji: "🍔", label: "Comida", keywords: ["comida", "almuerzo", "cena", "desayuno", "merienda", "hamburguesa", "pizza", "lomito", "empanada", "asado", "delivery", "pedidos ya", "pedidosya", "rappi", "mcdonald", "burger"] },
  { id: "super", emoji: "🛒", label: "Súper", keywords: ["super", "súper", "supermercado", "mercado", "biggie", "stock", "real", "salemma", "casa rica", "despensa"] },
  { id: "nafta", emoji: "⛽", label: "Nafta", keywords: ["nafta", "gasolina", "combustible", "petrobras", "puma", "copetrol", "shell", "barcos", "estacion"] },
  { id: "transporte", emoji: "🚗", label: "Transporte", keywords: ["uber", "bolt", "muv", "taxi", "colectivo", "bus", "pasaje", "transporte"] },
  { id: "cafe", emoji: "☕", label: "Café", keywords: ["cafe", "café", "starbucks", "capuchino", "cappuccino", "espresso"] },
  { id: "salud", emoji: "💊", label: "Salud", keywords: ["farmacia", "remedio", "medico", "médico", "doctor", "salud", "punto farma", "catedral"] },
  { id: "luz", emoji: "💡", label: "Luz", keywords: ["luz", "ande", "electricidad"] },
  { id: "agua", emoji: "💧", label: "Agua", keywords: ["agua", "essap"] },
  { id: "internet", emoji: "📶", label: "Internet", keywords: ["internet", "tigo", "personal", "claro", "copaco", "wifi"] },
  { id: "alquiler", emoji: "🏠", label: "Alquiler", keywords: ["alquiler", "renta", "casa", "departamento"] },
  { id: "ropa", emoji: "👕", label: "Ropa", keywords: ["ropa", "remera", "pantalon", "pantalón", "zapatilla", "zapato", "vestido"] },
  { id: "ocio", emoji: "🎬", label: "Ocio", keywords: ["cine", "netflix", "spotify", "youtube", "disney", "hbo", "max", "juego", "salida", "fiesta", "cerveza", "trago"] },
  { id: "educacion", emoji: "📚", label: "Educación", keywords: ["libro", "curso", "universidad", "colegio", "cuota"] },
  { id: "regalo", emoji: "🎁", label: "Regalo", keywords: ["regalo", "cumple", "cumpleaños"] },
  { id: "mascota", emoji: "🐶", label: "Mascota", keywords: ["mascota", "perro", "gato", "veterinaria", "vet"] },
];

/** Default chips shown when there is no text yet. */
export const DEFAULT_CHIPS: Category[] = [
  CATEGORIES.find((c) => c.id === "comida")!,
  CATEGORIES.find((c) => c.id === "nafta")!,
  CATEGORIES.find((c) => c.id === "super")!,
  CATEGORIES.find((c) => c.id === "transporte")!,
  CATEGORIES.find((c) => c.id === "cafe")!,
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Suggest categories based on the typed description.
 * - Matches whole-word keywords inside the text.
 * - Returns up to `limit` unique categories.
 * - Falls back to DEFAULT_CHIPS when text is empty.
 */
export function suggestCategories(text: string, limit = 4): Category[] {
  const clean = normalize(text);
  if (!clean.trim()) return DEFAULT_CHIPS.slice(0, limit);

  const matched = new Set<string>();
  const out: Category[] = [];
  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      const k = normalize(kw);
      // word-boundary match (works for multi-word keywords too)
      const re = new RegExp(`(^|[^\\p{L}])${escapeRegex(k)}([^\\p{L}]|$)`, "u");
      if (re.test(clean)) {
        if (!matched.has(cat.id)) {
          matched.add(cat.id);
          out.push(cat);
        }
        break;
      }
    }
    if (out.length >= limit) break;
  }

  // If nothing matched, show default chips so the UI keeps feeling alive.
  if (out.length === 0) return DEFAULT_CHIPS.slice(0, limit);
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Returns true if the text already starts with the category's emoji. */
export function hasCategoryEmoji(text: string, cat: Category): boolean {
  return text.trim().startsWith(cat.emoji);
}
