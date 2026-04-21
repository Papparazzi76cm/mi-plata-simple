const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("test_")) return null;

  return (
    <div className="w-full bg-warn/15 border-b border-warn/30 px-4 py-2 text-center text-xs text-warn-foreground/90">
      Pagos en modo prueba — usá la tarjeta <span className="font-mono font-semibold">4242 4242 4242 4242</span> para testear.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        Saber más
      </a>
    </div>
  );
}
