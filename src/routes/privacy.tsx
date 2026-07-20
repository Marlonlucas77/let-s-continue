import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoWithName } from "@/components/Logo";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Placar Certo" },
      { name: "description", content: "Política de privacidade do Placar Certo." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/"><LogoWithName /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Voltar</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 prose-sm">
        <h1 className="font-display text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <p>
              Esta política explica quais dados o Placar Certo coleta, para que usa, com quem compartilha e quais
              direitos você tem sobre eles, em conformidade com a Lei Geral de Proteção de Dados (LGPD).
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold mb-2">1. Quais dados coletamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Dados de cadastro:</strong> nome, e-mail e senha (armazenada de forma criptografada, nunca em texto puro).</li>
              <li><strong>Dados de uso:</strong> ligas e times que você acompanha, previsões geradas e salvas, times favoritados, taxa de acertos.</li>
              <li><strong>Dados de pagamento:</strong> processados diretamente pela Stripe. Não armazenamos número completo de cartão — apenas o status da assinatura (plano, período, se está ativa) recebido da Stripe.</li>
              <li><strong>Dados técnicos básicos:</strong> data do último login, para fins de segurança da conta.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold mb-2">2. Para que usamos seus dados</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fornecer o serviço (gerar previsões, mostrar jogos das suas ligas, controlar seu plano e limites de uso);</li>
              <li>Processar pagamentos e gerenciar sua assinatura;</li>
              <li>Enviar e-mails que você solicitou explicitamente (código de confirmação de cadastro, alertas de jogos de times favoritos — se você ativar essa opção);</li>
              <li>Melhorar o serviço e corrigir problemas.</li>
            </ul>
            <p className="mt-2">
              Não vendemos seus dados pessoais a terceiros, nem os usamos para publicidade de terceiros.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold mb-2">3. Com quem compartilhamos dados</h2>
            <p>Usamos os seguintes fornecedores para operar o serviço, cada um recebendo apenas o necessário para sua função:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Stripe</strong> — processamento de pagamentos;</li>
              <li><strong>Supabase</strong> — banco de dados e autenticação;</li>
              <li><strong>Resend</strong> — envio dos e-mails que você solicita (confirmação de cadastro, alertas opcionais);</li>
              <li><strong>API-Sports</strong> — fornecedor dos dados públicos de times, ligas e jogos (não recebe seus dados pessoais, só consultamos informações públicas de futebol);</li>
              <li><strong>Provedor de IA generativa</strong> — recebe apenas nomes de times e liga para gerar a análise da previsão, sem dados pessoais identificáveis.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold mb-2">4. Seus direitos (LGPD)</h2>
            <p>Você pode, a qualquer momento:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Acessar os dados que temos sobre você;</li>
              <li>Corrigir dados incorretos;</li>
              <li>Solicitar a exclusão da sua conta e dos dados associados;</li>
              <li>Revogar o consentimento para alertas por e-mail (desative a qualquer momento em Minha Conta);</li>
              <li>Solicitar a portabilidade dos seus dados.</li>
            </ul>
            <p className="mt-2">
              Para exercer esses direitos, entre em contato pelo e-mail de suporte informado no app.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold mb-2">5. Retenção de dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Se você solicitar exclusão da conta, removemos
              seus dados pessoais em prazo razoável, exceto quando a lei exigir retenção (por exemplo, registros
              fiscais de pagamento).
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold mb-2">6. Segurança</h2>
            <p>
              Usamos práticas padrão de segurança (senhas criptografadas, controle de acesso por permissão,
              conexões HTTPS) para proteger seus dados. Nenhum sistema é 100% imune a falhas, mas trabalhamos para
              minimizar riscos continuamente.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold mb-2">7. Alterações nesta política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Mudanças relevantes serão comunicadas por e-mail ou
              aviso no app.
            </p>
          </section>

          <p className="text-xs text-muted-foreground pt-4 border-t border-border">
            Consulte também nossos <Link to="/terms" className="text-primary underline">Termos de Uso</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
