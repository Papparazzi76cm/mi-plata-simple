// Edge function: devuelve el tipo de cambio entre dos monedas usando exchangerate.host.
// Cachea en memoria por 6 horas para minimizar llamadas externas.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CacheEntry {
  rate: number;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 6 * 60 * 60 * 1000; // 6h

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const from = (url.searchParams.get("from") ?? "").toUpperCase();
    const to = (url.searchParams.get("to") ?? "").toUpperCase();

    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
      return json({ error: "Invalid 'from' or 'to' currency code" }, 400);
    }

    if (from === to) {
      return json({ rate: 1, from, to, cached: false });
    }

    const key = `${from}_${to}`;
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && now - cached.fetchedAt < TTL_MS) {
      return json({ rate: cached.rate, from, to, cached: true });
    }

    // exchangerate.host devuelve tasas gratuitas sin API key.
    const apiUrl = `https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=1`;
    const res = await fetch(apiUrl);
    if (!res.ok) {
      return json({ error: `FX provider error ${res.status}` }, 502);
    }
    const data = await res.json();
    const rate = Number(data?.result ?? data?.info?.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      // Fallback: probamos endpoint /latest
      const fallback = await fetch(`https://api.exchangerate.host/latest?base=${from}&symbols=${to}`);
      const fb = await fallback.json();
      const fbRate = Number(fb?.rates?.[to]);
      if (!Number.isFinite(fbRate) || fbRate <= 0) {
        return json({ error: "Could not resolve FX rate" }, 502);
      }
      cache.set(key, { rate: fbRate, fetchedAt: now });
      return json({ rate: fbRate, from, to, cached: false });
    }

    cache.set(key, { rate, fetchedAt: now });
    return json({ rate, from, to, cached: false });
  } catch (err) {
    console.error("fx-rate error:", err);
    return json({ error: "Unexpected error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
