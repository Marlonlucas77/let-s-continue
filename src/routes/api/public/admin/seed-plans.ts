import { createFileRoute } from "@tanstack/react-router";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";

const PLANS = [
  {
    lookup_key: "basic_monthly",
    name: "PlacarCerto Básico",
    description: "3 ligas + 20 previsões IA/mês",
    amount: 1499,
  },
  {
    lookup_key: "pro_monthly",
    name: "PlacarCerto Pro",
    description: "15 ligas + 150 previsões IA/mês + H2H + bolões",
    amount: 2999,
  },
  {
    lookup_key: "elite_monthly",
    name: "PlacarCerto Elite",
    description: "Ilimitado + escanteios/cartões + API + suporte 24/7",
    amount: 5999,
  },
];

async function seed(env: StripeEnv) {
  const stripe = createStripeClient(env);
  const results: any[] = [];
  for (const plan of PLANS) {
    const existing = await stripe.prices.list({ lookup_keys: [plan.lookup_key], limit: 1 });
    if (existing.data.length) {
      results.push({ lookup_key: plan.lookup_key, status: "exists", price_id: existing.data[0].id });
      continue;
    }
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
    });
    const price = await stripe.prices.create({
      product: product.id,
      currency: "brl",
      unit_amount: plan.amount,
      recurring: { interval: "month" },
      lookup_key: plan.lookup_key,
      transfer_lookup_key: true,
    });
    results.push({ lookup_key: plan.lookup_key, status: "created", price_id: price.id, product_id: product.id });
  }
  return results;
}

export const Route = createFileRoute("/api/public/admin/seed-plans")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.SEED_PLANS_SECRET;
        const provided = request.headers.get("x-seed-secret");
        if (!secret || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") ?? "sandbox") as StripeEnv;
        try {
          const results = await seed(env);
          return Response.json({ env, results });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "failed" }, { status: 500 });
        }
      },
    },
  },
});
