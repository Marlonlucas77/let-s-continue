import { createFileRoute, Link } from "@tanstack/react-router";
import { Wand2, Target, Trophy, TrendingUp, Zap, Radio, Globe2, LineChart, Check, ShieldCheck, Sparkles } from "lucide-react";
import { LogoWithName } from "@/components/Logo";
import heroDashboard from "@/assets/hero-dashboard.jpg";
import heroPredictions from "@/assets/hero-predictions.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Placar Certo — Previsões de futebol com IA" },
      { name: "description", content: "Compare qualquer time do mundo com IA generativa e receba probabilidades de gols, escanteios e cartões na hora. Acompanhe sua taxa de acerto real. Comece grátis." },
      { property: "og:title", content: "Placar Certo — Previsões de futebol com IA" },
      { property: "og:description", content: "Compare qualquer time do mundo com IA generativa e receba probabilidades de gols, escanteios e cartões na hora. Comece grátis." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
});

const PLANS = [
  {
    id: "free",
    name: "Grátis",
    price: "R$ 0",
    period: "pra sempre",
    features: ["1 liga monitorada", "2 previsões de IA por dia", "Placar ao vivo e painel completo", "Histórico de acertos"],
    cta: "Criar conta grátis",
    highlight: false,
  },
  {
    id: "basic",
    name: "Básico",
    price: "R$ 14,99",
    period: "por mês",
    features: ["3 ligas monitoradas", "8 previsões de IA por dia", "Estatísticas por time e liga", "Alertas de jogos do dia"],
    cta: "Assinar Básico",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 29,99",
    period: "por mês",
    features: ["15 ligas monitoradas", "25 previsões de IA por dia", "Nível de confiança da IA", "Previsões de escanteios e cartões"],
    cta: "Assinar Pro",
    highlight: true,
  },
  {
    id: "elite",
    name: "Elite",
    price: "R$ 59,99",
    period: "por mês",
    features: ["Ligas e previsões ilimitadas", "Odds ao vivo e valor esperado", "Análises comparativas ilimitadas", "Suporte prioritário 24/7"],
    cta: "Assinar Elite",
    highlight: false,
  },
];

const FAQS = [
  {
    q: "Como a IA gera as previsões?",
    a: "Nossa IA generativa analisa o conhecimento disponível sobre os dois times — força do elenco, momento na competição, histórico — e estima probabilidades para resultado, gols, escanteios e cartões. Funciona até para times que você ainda não importou: é só digitar o nome.",
  },
  {
    q: "As previsões são garantidas?",
    a: "Não. Nenhuma ferramenta de previsão esportiva pode garantir resultados — futebol tem imprevisibilidade real. O Placar Certo existe para te dar uma base de dados e probabilidades mais informada, não uma certeza. Use com responsabilidade.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, a qualquer momento, direto no app — sem fidelidade e sem multa. Você mantém acesso até o fim do período já pago.",
  },
  {
    q: "Preciso importar os times manualmente?",
    a: "Não. As ligas que você habilitar são atualizadas automaticamente em segundo plano. E mesmo um time fora da sua lista pode ser comparado na hora, digitando o nome.",
  },
  {
    q: "Como funciona a taxa de acerto?",
    a: "Toda previsão que você salva é conferida automaticamente contra o resultado real assim que o jogo termina. Sua taxa de acerto fica visível no Histórico — sem maquiagem, é o resultado de verdade.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <LogoWithName />
          <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Recursos</a>
            <a href="#screenshots" className="hover:text-foreground">Preview</a>
            <a href="#pricing" className="hover:text-foreground">Planos</a>
            <a href="#faq" className="hover:text-foreground">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Entrar</Link>
            <Link to="/auth" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Começar grátis</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.15),_transparent_60%)]" />
          <div className="mx-auto max-w-6xl px-6 pt-20 pb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Previsões geradas por IA — qualquer time, na hora
            </div>
            <h1 className="mt-6 font-display text-5xl font-bold leading-tight tracking-tight md:text-6xl">
              Analise qualquer jogo com <span className="text-primary">IA</span>,
              <br className="hidden md:block" /> não com achismo.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Digite dois times — de qualquer liga do mundo — e receba na hora as probabilidades de resultado, gols, escanteios e cartões. Sem precisar importar nada antes.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth" className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90">
                Criar conta grátis
              </Link>
              <a href="#screenshots" className="rounded-md border border-border px-6 py-3 text-sm font-semibold hover:bg-card">
                Ver como funciona
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Sem cartão de crédito para começar • Cancele quando quiser</p>
          </div>

          <div className="mx-auto max-w-6xl px-6 pb-20">
            <div className="rounded-xl border border-border bg-card/50 p-2 shadow-2xl shadow-primary/5">
              <img
                src={heroDashboard}
                alt="Painel do Placar Certo com estatísticas e jogos do dia"
                width={1600}
                height={1008}
                className="rounded-lg"
              />
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-border bg-card/20 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold md:text-4xl">Tudo pra analisar futebol com dados</h2>
              <p className="mt-3 text-muted-foreground">Da previsão instantânea ao acompanhamento automático das suas ligas.</p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                { icon: Wand2, title: "IA generativa pra qualquer time", desc: "Compare dois times de qualquer lugar do mundo, mesmo sem estarem na sua lista — é só digitar o nome." },
                { icon: Target, title: "Gols, escanteios e cartões", desc: "Probabilidades detalhadas por mercado, com nível de confiança da IA em cada previsão." },
                { icon: Globe2, title: "Ligas sempre atualizadas", desc: "Habilite as ligas que você acompanha e o sistema atualiza os jogos automaticamente, sem esforço manual." },
                { icon: Radio, title: "Placar ao vivo", desc: "Acompanhe os jogos em andamento com atualização automática, direto no painel." },
                { icon: LineChart, title: "Painel completo", desc: "Jogos do dia, times favoritos, resumo de previsões e estatísticas num só lugar." },
                { icon: ShieldCheck, title: "Taxa de acerto real", desc: "Salve suas previsões e veja sua taxa de acerto de verdade, conferida automaticamente contra o resultado." },
              ].map((f) => (
                <div key={f.title} className="card-surface p-6">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="screenshots" className="py-20">
          <div className="mx-auto max-w-6xl space-y-24 px-6">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Painel</span>
                <h2 className="mt-2 font-display text-3xl font-bold">Uma visão completa, todo dia</h2>
                <p className="mt-3 text-muted-foreground">
                  Jogos de hoje das suas ligas, times favoritos, resumo das suas previsões salvas e sua taxa de acerto — tudo à sua frente assim que você entra.
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {["Jogos do dia das ligas que você acompanha", "Times favoritos com próximos confrontos", "Sua taxa de acerto real, sem maquiagem"].map((i) => (
                    <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" /> {i}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-card/50 p-2">
                <img src={heroDashboard} alt="Dashboard com jogos do dia e estatísticas" loading="lazy" width={1600} height={1008} className="rounded-lg" />
              </div>
            </div>

            <div className="grid items-center gap-12 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card/50 p-2 md:order-2">
                <img src={heroPredictions} alt="Tela de previsão de partida com probabilidades geradas por IA" loading="lazy" width={1600} height={1008} className="rounded-lg" />
              </div>
              <div className="md:order-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Previsão com IA</span>
                <h2 className="mt-2 font-display text-3xl font-bold">Probabilidades pra qualquer confronto</h2>
                <p className="mt-3 text-muted-foreground">
                  Escolha dois times — de qualquer liga do mundo, mesmo fora da sua lista — e receba na hora as chances de vitória, gols esperados, escanteios e cartões, com a análise da IA pra cada time.
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {["Probabilidade de vitória / empate / derrota", "Escanteios e cartões estimados", "Palpites por mercado com nível de confiança"].map((i) => (
                    <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" /> {i}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-border bg-card/20 py-20">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Comece grátis, evolua quando quiser</h2>
            <p className="mt-3 text-muted-foreground">Sem cobrança para começar. Sem fidelidade — cancele quando quiser.</p>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {PLANS.map((p) => (
                <div
                  key={p.id}
                  className={`card-surface relative p-6 text-left flex flex-col ${p.highlight ? "border-primary/40 ring-1 ring-primary/30" : ""}`}
                >
                  {p.highlight && (
                    <span className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">Mais popular</span>
                  )}
                  <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                  <p className="mt-4">
                    <span className="text-3xl font-bold">{p.price}</span>
                    <span className="text-sm text-muted-foreground"> {p.period !== "pra sempre" ? `/${p.period.replace("por ", "")}` : ""}</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm flex-1">
                    {p.features.map((i) => (
                      <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" /> {i}</li>
                    ))}
                  </ul>
                  <Link
                    to="/auth"
                    className={`mt-6 block rounded-md px-4 py-2 text-center text-sm font-semibold ${
                      p.highlight
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "border border-border hover:bg-card"
                    }`}
                  >
                    {p.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="py-20">
          <div className="mx-auto max-w-3xl px-6">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold md:text-4xl">Perguntas frequentes</h2>
            </div>
            <div className="space-y-4">
              {FAQS.map((f) => (
                <details key={f.q} className="card-surface p-5 group">
                  <summary className="flex cursor-pointer items-center justify-between font-medium marker:content-none">
                    {f.q}
                    <span className="ml-4 text-muted-foreground transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <Trophy className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">Pronto pra analisar seu próximo jogo?</h2>
            <p className="mt-3 text-muted-foreground">Crie sua conta grátis e gere sua primeira previsão com IA em segundos.</p>
            <Link to="/auth" className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90">
              <TrendingUp className="h-4 w-4" /> Começar grátis
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground md:flex-row">
          <LogoWithName size={24} />
          <p>© {new Date().getFullYear()} Placar Certo. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
