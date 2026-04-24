// Conversión de moneda: pide la tasa a la edge function `fx-rate` y aplica
// la conversión sobre TODOS los montos guardados del usuario.
import { supabase } from "@/integrations/supabase/client";

export interface ConversionResult {
  rate: number;
  from: string;
  to: string;
  updated: {
    transactions: number;
    monthlyBudget: boolean;
    budgets: number;
  };
}

interface FixedExpense {
  name?: string;
  amount?: number;
  [k: string]: unknown;
}

/** Pide la tasa al edge function. Lanza error si falla. */
export async function fetchFxRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  const { data, error } = await supabase.functions.invoke("fx-rate", {
    method: "GET",
    // invoke no soporta query params directos → usamos body que la function ignora,
    // mejor reconstruimos URL manualmente.
  });
  // Workaround: invoke con GET ignora body, pero no permite query. Usamos fetch directo.
  if (error || !data) {
    return await fetchFxRateDirect(from, to);
  }
  if (typeof data === "object" && "rate" in data) {
    return Number((data as { rate: number }).rate);
  }
  return await fetchFxRateDirect(from, to);
}

async function fetchFxRateDirect(from: string, to: string): Promise<number> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const url = `${baseUrl}/functions/v1/fx-rate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const res = await fetch(url, {
    headers: token
      ? { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string }
      : { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
  });
  if (!res.ok) throw new Error(`No se pudo obtener tipo de cambio (${res.status})`);
  const json = await res.json();
  const rate = Number(json?.rate);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Tipo de cambio inválido");
  return rate;
}

/**
 * Convierte todos los montos del usuario `userId` de la moneda `from` a `to`.
 * Decimales: usa 0 para PYG/CLP/COP/ARS/VES, 2 para el resto.
 */
export async function convertAllUserAmounts(
  userId: string,
  from: string,
  to: string,
): Promise<ConversionResult> {
  const rate = await fetchFxRate(from, to);
  if (rate === 1) {
    return {
      rate: 1,
      from,
      to,
      updated: { transactions: 0, monthlyBudget: false, budgets: 0 },
    };
  }

  const decimals = ZERO_DECIMAL.has(to) ? 0 : 2;
  const round = (n: number) => {
    const factor = Math.pow(10, decimals);
    return Math.round(n * rate * factor) / factor;
  };

  // 1) Transacciones
  const { data: txs, error: txErr } = await supabase
    .from("transactions")
    .select("id,amount")
    .eq("user_id", userId);
  if (txErr) throw txErr;

  let txCount = 0;
  if (txs && txs.length > 0) {
    // Update individual (Supabase no soporta bulk update con valores distintos por fila).
    await Promise.all(
      txs.map(async (t) => {
        const newAmount = round(Number(t.amount));
        const { error } = await supabase
          .from("transactions")
          .update({ amount: newAmount })
          .eq("id", t.id);
        if (!error) txCount++;
      }),
    );
  }

  // 2) Monthly budget
  const { data: mb } = await supabase
    .from("monthly_budget")
    .select("id,total_amount,savings_goal,fixed_expenses")
    .eq("user_id", userId)
    .maybeSingle();

  let mbUpdated = false;
  if (mb) {
    const fixed = Array.isArray(mb.fixed_expenses)
      ? (mb.fixed_expenses as FixedExpense[]).map((f) => ({
          ...f,
          amount: f?.amount != null ? round(Number(f.amount)) : f?.amount,
        }))
      : mb.fixed_expenses;
    const { error } = await supabase
      .from("monthly_budget")
      .update({
        total_amount: round(Number(mb.total_amount ?? 0)),
        savings_goal: round(Number(mb.savings_goal ?? 0)),
        fixed_expenses: fixed,
      })
      .eq("id", mb.id);
    if (!error) mbUpdated = true;
  }

  // 3) Budgets por categoría
  const { data: buds } = await supabase
    .from("budgets")
    .select("id,amount")
    .eq("user_id", userId);
  let budCount = 0;
  if (buds) {
    await Promise.all(
      buds.map(async (b) => {
        const newAmount = round(Number(b.amount));
        const { error } = await supabase
          .from("budgets")
          .update({ amount: newAmount })
          .eq("id", b.id);
        if (!error) budCount++;
      }),
    );
  }

  return {
    rate,
    from,
    to,
    updated: { transactions: txCount, monthlyBudget: mbUpdated, budgets: budCount },
  };
}

const ZERO_DECIMAL = new Set(["PYG", "CLP", "COP", "ARS", "JPY", "KRW", "VND", "VES"]);
