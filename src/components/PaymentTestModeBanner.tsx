const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken) return null;
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-orange-500/10 border-b border-orange-500/30 px-4 py-2 text-center text-xs text-orange-300">
        Modo de teste: nenhum pagamento real é processado no preview.
      </div>
    );
  }
  return null;
}
