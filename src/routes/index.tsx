import { createFileRoute, Link } from "@tanstack/react-router";
import { Wand2, Target, Trophy, TrendingUp, Radio, Globe2, LineChart, Check, ShieldCheck, Sparkles, Search, BarChart3, Star, Zap, Clock, Users, MessageCircle, Brain, Rocket, ArrowRight, X } from "lucide-react";
import { LogoWithName } from "@/components/Logo";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Placar Certo — Previsões de futebol com IA | Comece grátis" },
      { name: "description", content: "Pare de chutar no escuro. Analise qualquer jogo do mundo com IA em segundos: probabilidades de gols, escanteios, cartões e resultado. +1.100 ligas cobertas. Comece grátis, sem cartão." },
      { property: "og:title", content: "Placar Certo — Previsões de futebol com IA" },
      { property: "og:description", content: "Analise qualquer jogo com IA. Gols, escanteios, cartões e resultado — na hora, com nível de confiança. Comece grátis." },
      { property: "og:url", content: "/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
    tagline: "Pra testar sem risco",
    features: ["1 liga monitorada", "2 previsões de IA por dia", "Placar ao vivo e painel completo", "Histórico de acertos"],
    cta: "Criar conta grátis",
    highlight: false,
  },
  {
    id: "basic",
    name: "Básico",
    price: "R$ 19,99",
    period: "por mês",
    tagline: "Pra quem acompanha alguns campeonatos",
    features: ["3 ligas monitoradas", "8 previsões de IA por dia", "Estatísticas por time e liga", "Suporte por e-mail"],
    cta: "Assinar Básico",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 34,99",
    period: "por mês",
    tagline: "O plano mais escolhido",
    features: ["15 ligas monitoradas", "25 previsões de IA por dia", "Nível de confiança da IA", "Ligas extras por R$5/mês cada"],
    cta: "Assinar Pro",
    highlight: true,
  },
  {
    id: "elite",
    name: "Elite",
    price: "R$ 64,99",
    period: "por mês",
    tagline: "Sem limites, pra profissional",
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
    q: "Como pago? Aceita Pix?",
    a: "Sim. Aceitamos cartão de crédito e Pix, com processamento seguro via Stripe. Você recebe acesso imediato assim que o pagamento é confirmado.",
  },
  {
    q: "Preciso importar os times manualmente?",
    a: "Não. As ligas que você habilitar são atualizadas automaticamente em segundo plano. E mesmo um time fora da sua lista pode ser comparado na hora, digitando o nome.",
  },
  {
    q: "Como funciona a taxa de acerto?",
    a: "Toda previsão que você salva é conferida automaticamente contra o resultado real assim que o jogo termina. Sua taxa de acerto fica visível no Histórico — sem maquiagem, é o resultado de verdade.",
  },
  {
    q: "Posso trocar de plano depois?",
    a: "Pode. Você começa no Grátis, evolui pro Básico, Pro ou Elite quando quiser, e volta pra baixo também. A cobrança é ajustada proporcionalmente.",
  },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Placar Certo",
  applicationCategory: "SportsApplication",
  operatingSystem: "Web",
  description: "Previsões de futebol geradas por IA — compare qualquer time do mundo e receba probabilidades de gols, escanteios e cartões na hora.",
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "0",
    highPrice: "64.99",
    priceCurrency: "BRL",
    offerCount: "4",
  },
};

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />

      {/* Barra de urgência no topo */}
      <div className="bg-primary/10 border-b border-primary/20 py-2 text-center text-xs md:text-sm">
        <span className="inline-flex items-center gap-2 text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline">Novo por aqui?</span> Crie sua conta grátis em 30 segundos e gere sua primeira previsão com IA.
          <Link to="/auth" className="ml-1 font-semibold text-primary hover:underline">Começar →</Link>
        </span>
      </div>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <LogoWithName />
          <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">Como funciona</a>
            <a href="#features" className="hover:text-foreground">Recursos</a>
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
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.18),_transparent_60%)]" />
          <div className="mx-auto max-w-6xl px-6 pt-16 pb-12 text-center md:pt-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> IA generativa • +1.100 ligas • qualquer time do mundo
            </div>
            <h1 className="mt-6 font-display text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
              Pare de chutar no escuro.
              <br />
              <span className="text-primary">Analise futebol com IA.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Digite dois times — de qualquer liga do mundo — e receba na hora as probabilidades de <strong className="text-foreground">resultado, gols, escanteios e cartões</strong>. Sem precisar importar nada, sem planilha, sem achismo.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth" className="group inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:opacity-90 md:text-base">
                Criar conta grátis <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <a href="#how" className="rounded-md border border-border px-6 py-3.5 text-sm font-semibold hover:bg-card md:text-base">
                Ver como funciona
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Sem cartão pra começar</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Cancele quando quiser</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Pix ou cartão</span>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-6 pb-16">
            <div className="grid grid-cols-2 gap-6 border-y border-border py-8 md:grid-cols-4">
              {[
                { k: "1.100+", v: "Ligas cobertas no mundo" },
                { k: "< 5s", v: "Análise instantânea da IA" },
                { k: "Tempo real", v: "Placares e odds ao vivo" },
                { k: "Sem fidelidade", v: "Cancele quando quiser" },
              ].map((s) => (
                <div key={s.v} className="text-center">
                  <div className="font-display text-2xl font-bold text-primary md:text-3xl">{s.k}</div>
                  <div className="mt-1 text-xs text-muted-foreground md:text-sm">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROBLEMA vs SOLUÇÃO */}
        <section className="border-t border-border py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Por que Placar Certo</span>
              <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Menos achismo. Mais decisão informada.</h2>
              <p className="mt-3 text-muted-foreground">A diferença entre torcer no escuro e apostar/palpitar com base em dados reais.</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <div className="card-surface border-destructive/20 p-8">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                  <X className="h-3.5 w-3.5" /> Sem o Placar Certo
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" /> Você acompanha 5 sites diferentes e ainda fica na dúvida</li>
                  <li className="flex items-start gap-2"><X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" /> Depende de "achismo", grupo de palpite duvidoso e sorte</li>
                  <li className="flex items-start gap-2"><X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" /> Não sabe qual é a sua taxa de acerto de verdade</li>
                  <li className="flex items-start gap-2"><X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" /> Perde tempo abrindo tabela, histórico e H2H em cada jogo</li>
                </ul>
              </div>
              <div className="card-surface border-primary/40 p-8 ring-1 ring-primary/20">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Check className="h-3.5 w-3.5" /> Com o Placar Certo
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" /> Tudo num só lugar: jogos, previsões, ao vivo e histórico</li>
                  <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" /> IA analisa os dois times em segundos, com nível de confiança</li>
                  <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" /> Sua taxa de acerto real, sem maquiagem, atualizada automaticamente</li>
                  <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" /> Economia de horas: você olha o jogo, aperta um botão e decide</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="how" className="border-t border-border bg-card/10 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Como funciona</span>
              <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Da dúvida à decisão em 3 passos</h2>
              <p className="mt-3 text-muted-foreground">Simples, rápido e feito pra quem gosta de futebol de verdade.</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                { icon: Search, step: "01", title: "Escolha os times", desc: "Digite dois times de qualquer liga do mundo. Não precisa importar nada — a IA já conhece." },
                { icon: Brain, step: "02", title: "A IA analisa na hora", desc: "Em segundos, você recebe probabilidades para resultado, gols, escanteios e cartões, com o nível de confiança de cada previsão." },
                { icon: Star, step: "03", title: "Acompanhe seus acertos", desc: "Salve suas previsões favoritas e veja sua taxa de acerto real, conferida automaticamente após cada jogo." },
              ].map((s) => (
                <div key={s.step} className="card-surface relative p-6">
                  <div className="absolute right-5 top-5 font-display text-4xl font-bold text-primary/20">{s.step}</div>
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90">
                Testar agora, é grátis <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* PARA QUEM É */}
        <section className="border-t border-border py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Pra quem é</span>
              <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Feito pra quem leva futebol a sério</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { icon: Trophy, title: "Apostador esportivo", desc: "Compare odds com a probabilidade real da IA e encontre valor onde os outros não veem." },
                { icon: MessageCircle, title: "Bolão com amigos", desc: "Chegue no bolão sabendo o que a IA aponta pra cada jogo — nada de palpite no chute." },
                { icon: BarChart3, title: "Fã que curte estatística", desc: "Veja força de elenco, forma recente e comparativos que ninguém mais te mostra." },
              ].map((p) => (
                <div key={p.title} className="card-surface p-6">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RECURSOS */}
        <section id="features" className="border-t border-border bg-card/20 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Tudo num só app</span>
              <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Tudo pra analisar futebol com dados</h2>
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
                { icon: Zap, title: "Resposta em segundos", desc: "Análise pronta em menos de 5 segundos. Sem esperar, sem carregar planilha." },
                { icon: Clock, title: "Histórico completo", desc: "Todas as suas previsões passadas ficam salvas com o resultado real de cada jogo." },
                { icon: Users, title: "Times favoritos", desc: "Marque seus times e receba destaque no painel sempre que jogarem." },
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

        {/* PREVIEW DOS MÓDULOS */}
        <section id="screenshots" className="py-20">
          <div className="mx-auto max-w-6xl space-y-16 px-6">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="card-surface p-8">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Painel</span>
                <h2 className="mt-2 font-display text-2xl font-bold">Uma visão completa, todo dia</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Jogos de hoje das suas ligas, times favoritos, resumo das suas previsões salvas e sua taxa de acerto — tudo à sua frente assim que você entra.
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {["Jogos do dia das ligas que você acompanha", "Times favoritos com próximos confrontos", "Sua taxa de acerto real, sem maquiagem"].map((i) => (
                    <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" /> {i}</li>
                  ))}
                </ul>
              </div>

              <div className="card-surface p-8">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Previsão com IA</span>
                <h2 className="mt-2 font-display text-2xl font-bold">Probabilidades pra qualquer confronto</h2>
                <p className="mt-3 text-sm text-muted-foreground">
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

        {/* PROVA SOCIAL */}
        <section className="border-t border-border bg-card/10 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">O que dizem os usuários</span>
              <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Quem usa não volta mais pro achismo</h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                { name: "Rafael M.", role: "Apostador esportivo", text: "Uso todo fim de semana antes do bolão. A parte de escanteios e cartões me pegou — não achava isso em nenhum outro lugar tão fácil." },
                { name: "Camila S.", role: "Fã de futebol europeu", text: "Digitei dois times da Bundesliga que nem estavam na minha lista e a IA já respondeu na hora. Simples e rápido do jeito que precisa ser." },
                { name: "João P.", role: "Bolão com amigos", text: "Minha taxa de acerto subiu bastante desde que comecei a checar a previsão antes. E o histórico não deixa mentir, é acompanhado automático." },
              ].map((t) => (
                <div key={t.name} className="card-surface p-6">
                  <div className="flex gap-0.5 text-primary">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-foreground">"{t.text}"</p>
                  <div className="mt-4 border-t border-border pt-3">
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PLANOS */}
        <section id="pricing" className="border-t border-border bg-card/20 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Planos</span>
              <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Comece grátis. Evolua quando fizer sentido.</h2>
              <p className="mt-3 text-muted-foreground">Sem cobrança para começar. Sem fidelidade. Cartão ou Pix, cancela quando quiser.</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {PLANS.map((p) => (
                <div
                  key={p.id}
                  className={`card-surface relative p-6 text-left flex flex-col ${p.highlight ? "border-primary/40 ring-1 ring-primary/30 md:scale-[1.02]" : ""}`}
                >
                  {p.highlight && (
                    <span className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/30">Mais popular</span>
                  )}
                  <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
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
                    className={`mt-6 block rounded-md px-4 py-2.5 text-center text-sm font-semibold ${
                      p.highlight
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90"
                        : "border border-border hover:bg-card"
                    }`}
                  >
                    {p.cta}
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Pagamento seguro via Stripe</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Cartão de crédito e Pix</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Cancele quando quiser</span>
            </div>
          </div>
        </section>

        {/* GARANTIA */}
        <section className="border-t border-border py-16">
          <div className="mx-auto max-w-3xl px-6">
            <div className="card-surface p-8 text-center border-primary/30 ring-1 ring-primary/20">
              <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-4 font-display text-2xl font-bold">Sem risco pra começar</h3>
              <p className="mt-3 text-muted-foreground">
                Você começa <strong className="text-foreground">grátis, sem cartão de crédito</strong>. Se decidir assinar depois e não gostar, é só cancelar direto no app — sem multa, sem burocracia, sem falar com atendimento.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-border py-20">
          <div className="mx-auto max-w-3xl px-6">
            <div className="text-center mb-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Dúvidas</span>
              <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Perguntas frequentes</h2>
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

        {/* CTA FINAL */}
        <section className="border-t border-border bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.15),_transparent_70%)] py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <Rocket className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 font-display text-3xl font-bold md:text-5xl">Pronto pra analisar seu próximo jogo?</h2>
            <p className="mt-3 text-lg text-muted-foreground">Crie sua conta grátis e gere sua primeira previsão com IA em menos de 30 segundos.</p>
            <Link to="/auth" className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90">
              <TrendingUp className="h-5 w-5" /> Começar grátis agora
            </Link>
            <p className="mt-4 text-xs text-muted-foreground">Sem cartão de crédito • Cancele quando quiser</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground md:flex-row">
          <LogoWithName size={24} />
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/terms" className="hover:text-foreground">Termos de Uso</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacidade</Link>
            <a href="mailto:suporte@placarcerto.ia.br" className="hover:text-foreground">Suporte</a>
          </div>
          <p>© {new Date().getFullYear()} Placar Certo. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
