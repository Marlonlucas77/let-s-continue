import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoWithName } from "@/components/Logo";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Termos de Uso — Placar Certo" },
      { name: "description", content: "Termos de uso do Placar Certo." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/"><LogoWithName /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Voltar</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 prose-sm">
        <h1 className="font-display text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="font-display text-lg font-semibold mb-2">1. O que é o Placar Certo</h2>
            <p>
              O Placar Certo é uma ferramenta de análise esportiva que usa inteligência artificial generativa para
              estimar probabilidades de resultado, gols, escanteios e cartões em partidas de futebol, com base em
              informações públicas sobre os times envolvidos. Também oferece acompanhamento de jogos, placar ao vivo
              e histórico de acertos das previsões salvas pelo usuário.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold mb-2">2. Não é garantia de resultado</h2>
            <p>
              As previsões geradas pelo Placar Certo são estimativas probabilísticas baseadas em inteligência
              artificial e dados disponíveis publicamente. Elas <strong>não constituem garantia, promessa ou
              certeza de resultado</strong> de qualquer partida. Futebol é um esporte com resultados imprevisíveis
              por natureza, e nenhuma ferramenta — inclusive esta — pode eliminar esse risco.
            </p>
            <p className="mt-2">
              O Placar Certo não é uma casa de apostas, não processa apostas, não gerencia banca de apostas e não
              recomenda que o usuário aposte dinheiro com base nas informações fornecidas. O uso das previsões para
              qualquer finalidade, incluindo apostas esportivas, é de responsabilidade exclusiva do usuário. Se você
              considerar que possui uma relação problemática com apostas, procure ajuda especializada.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold mb-2">3. Cadastro e conta</h2>
            <p>
              Para usar o Placar Certo, você precisa criar uma conta com e-mail e senha válidos, e confirmar seu
              e-mail através do código enviado no cadastro. Você é responsável por manter a confidencialidade da sua
              senha e por todas as atividades realizadas na sua conta. Avise-nos imediatamente se suspeitar de uso
              não autorizado.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold mb-2">4. Planos, cobrança e cancelamento</h2>
            <p>
              O Placar Certo oferece um plano gratuito com funcionalidades limitadas e planos pagos (Básico, Pro e
              Elite) cobrados mensalmente, com valores exibidos na página de Planos dentro do app. Os pagamentos são
              processados pela Stripe; não armazenamos dados completos do seu cartão.
            </p>
            <p className="mt-2">
              Você pode cancelar sua assinatura a qualquer momento, diretamente no app (Minha Conta → Gerenciar
              plano). O cancelamento interrompe cobranças futuras, mas você mantém acesso aos recursos do plano pago
              até o fim do período já pago — não há reembolso proporcional pelo tempo não utilizado, salvo quando
              exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold mb-2">5. Uso adequado</h2>
            <p>Ao usar o Placar Certo, você concorda em não:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Tentar acessar, sobrecarregar ou interferir na infraestrutura do serviço (incluindo os endpoints internos de sincronização de dados);</li>
              <li>Revender, redistribuir ou disponibilizar publicamente as previsões geradas para terceiros de forma comercial sem autorização;</li>
              <li>Utilizar contas automatizadas (bots) para consumir o serviço além do uso pessoal normal;</li>
              <li>Utilizar o serviço para fins ilegais.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold mb-2">6. Dados de terceiros</h2>
            <p>
              As informações sobre times, ligas e jogos são obtidas de fornecedores externos de dados esportivos.
              Não garantimos a exatidão, completude ou atualização em tempo real desses dados, embora nos
              esforcemos para mantê-los corretos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold mb-2">7. Limitação de responsabilidade</h2>
            <p>
              O Placar Certo é fornecido "como está". Na máxima extensão permitida pela lei, não nos
              responsabilizamos por perdas financeiras, diretas ou indiretas, decorrentes de decisões tomadas com
              base nas informações ou previsões fornecidas pelo serviço.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold mb-2">8. Alterações nestes termos</h2>
            <p>
              Podemos atualizar estes termos periodicamente. Mudanças relevantes serão comunicadas por e-mail ou
              aviso no app. O uso continuado do serviço após uma atualização representa aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold mb-2">9. Contato</h2>
            <p>
              Dúvidas sobre estes termos podem ser enviadas para o e-mail de suporte informado no app.
            </p>
          </section>

          <p className="text-xs text-muted-foreground pt-4 border-t border-border">
            Consulte também nossa <Link to="/privacy" className="text-primary underline">Política de Privacidade</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
