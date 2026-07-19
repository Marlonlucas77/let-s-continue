import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Target, Trophy, TrendingUp, Zap, Shield, Upload, LineChart, Check } from "lucide-react";
import { LogoWithName } from "@/components/Logo";
import heroDashboard from "@/assets/hero-dashboard.jpg";
import heroPredictions from "@/assets/hero-predictions.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Placar Certo — Previsões de futebol" },
      { name: "description", content: "Analise times, importe jogos automaticamente e gere previsões de gols, escanteios e cartões com base em histórico real. Comece grátis." },
      { property: "og:title", content: "Placar Certo — Previsões de futebol" },
      { property: "og:description", content: "Analise times, importe jogos automaticamente e gere previsões de gols, escanteios e cartões com base em histórico real. Comece grátis." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
});

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
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Análise estatística de futebol
            </div>
            <h1 className="mt-6 font-display text-5xl font-bold leading-tight tracking-tight md:text-6xl">
              Preveja jogos com <span className="text-primary">dados reais</span>,
              <br className="hidden md:block" /> não com achismo.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Importe jogos automaticamente, acompanhe estatísticas detalhadas e gere previsões calculadas de gols, escanteios e cartões — tudo em um só lugar.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth" className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90">
                Criar conta grátis
              </Link>
              <a href="#screenshots" className="rounded-md border border-border px-6 py-3 text-sm font-semibold hover:bg-card">
                Ver como funciona
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Sem cartão de crédito • Comece em segundos</p>
          </div>

          <div className="mx-auto max-w-6xl px-6 pb-20">
            <div className="rounded-xl border border-border bg-card/50 p-2 shadow-2xl shadow-primary/5">
              <img
                src={heroDashboard}
                alt="Painel do Placar Certo com gráficos de gols e estatísticas por temporada"
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
              <h2 className="font-display text-3xl font-bold md:text-4xl">Tudo o que você precisa para analisar futebol</h2>
              <p className="mt-3 text-muted-foreground">Da coleta de dados à previsão do próximo jogo.</p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                { icon: Upload, title: "Importação automática", desc: "Puxe temporadas inteiras da API-Sports com um clique — ou importe via CSV." },
                { icon: BarChart3, title: "Estatísticas detalhadas", desc: "Médias de gols, escanteios, cartões, BTTS, Over/Under por time e liga." },
                { icon: Target, title: "Previsões calculadas", desc: "Probabilidades de vitória, gols esperados e escanteios com base no histórico." },
                { icon: Shield, title: "Confronto direto (H2H)", desc: "Compare dois times: retrospecto, forma recente e previsão do próximo duelo." },
                { icon: LineChart, title: "Gráficos ao longo do tempo", desc: "Visualize a evolução de gols e escanteios em uma linha do tempo." },
                { icon: Zap, title: "Verificação de acertos", desc: "O sistema cruza suas previsões com resultados reais automaticamente." },
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
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Dashboard</span>
                <h2 className="mt-2 font-display text-3xl font-bold">Uma visão completa da temporada</h2>
                <p className="mt-3 text-muted-foreground">
                  Gols por partida, taxa de acerto das suas previsões, próximos jogos e evolução do desempenho — tudo à sua frente.
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {["Gráfico de gols dos últimos 20 jogos", "Média de gols marcados e sofridos por time", "Taxa global de acurácia das previsões"].map((i) => (
                    <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" /> {i}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-card/50 p-2">
                <img src={heroDashboard} alt="Dashboard com KPIs e gráficos" loading="lazy" width={1600} height={1008} className="rounded-lg" />
              </div>
            </div>

            <div className="grid items-center gap-12 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card/50 p-2 md:order-2">
                <img src={heroPredictions} alt="Tela de previsão de partida com probabilidades" loading="lazy" width={1600} height={1008} className="rounded-lg" />
              </div>
              <div className="md:order-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Previsões</span>
                <h2 className="mt-2 font-display text-3xl font-bold">Probabilidades transparentes para cada jogo</h2>
                <p className="mt-3 text-muted-foreground">
                  Selecione dois times e receba na hora as chances de vitória, empate, gols esperados, escanteios e cartões — com base no histórico real.
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {["Probabilidade de vitória / empate / derrota", "Expected goals (xG) e escanteios previstos", "BTTS e Over/Under 2.5"].map((i) => (
                    <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" /> {i}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-border bg-card/20 py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Comece grátis, evolua quando quiser</h2>
            <p className="mt-3 text-muted-foreground">Sem cobrança para começar. Faça upgrade quando precisar de mais.</p>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="card-surface p-6 text-left">
                <h3 className="font-display text-xl font-semibold">Grátis</h3>
                <p className="mt-1 text-sm text-muted-foreground">Para começar a testar suas previsões.</p>
                <p className="mt-4 text-3xl font-bold">R$ 0</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {["Cadastro de times e jogos", "Importação manual e CSV", "Previsões básicas", "Histórico de acertos"].map((i) => (
                    <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /> {i}</li>
                  ))}
                </ul>
                <Link to="/auth" className="mt-6 block rounded-md border border-border px-4 py-2 text-center text-sm font-medium hover:bg-card">
                  Criar conta
                </Link>
              </div>
              <div className="card-surface relative border-primary/40 p-6 text-left ring-1 ring-primary/30">
                <span className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">Recomendado</span>
                <h3 className="font-display text-xl font-semibold">Premium</h3>
                <p className="mt-1 text-sm text-muted-foreground">Análises completas e importação automática.</p>
                <p className="mt-4 text-3xl font-bold">R$ 29<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                <ul className="mt-4 space-y-2 text-sm">
                  {["Tudo do Grátis", "Importação automática via API", "Estatísticas de escanteios e cartões", "Confronto direto (H2H)", "Gráficos avançados", "Suporte prioritário"].map((i) => (
                    <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /> {i}</li>
                  ))}
                </ul>
                <Link to="/auth" className="mt-6 block rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground hover:opacity-90">
                  Assinar Premium
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <Trophy className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">Pronto para prever com dados?</h2>
            <p className="mt-3 text-muted-foreground">Crie sua conta grátis e importe sua primeira temporada em minutos.</p>
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
