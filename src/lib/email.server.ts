// Server-only. Envio de e-mail via Resend (resend.com) — API simples via
// fetch, sem precisar do SDK deles como dependência.
//
// PRECISA CONFIGURAR: variável de ambiente RESEND_API_KEY (Secrets do
// Lovable Cloud). Sem ela, sendEmail lança erro — o chamador decide se
// isso deve travar o fluxo ou só logar e seguir (pra alertas em massa,
// preferimos logar e seguir pros outros usuários).
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY não configurada — envio de e-mail desativado.");

  const from = process.env.RESEND_FROM_EMAIL || "Placar Certo <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend respondeu ${res.status}: ${body.slice(0, 300)}`);
  }
}

export function favoritesAlertHtml(games: { home: string; away: string; time: string; league: string }[]): string {
  const rows = games.map((g) =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #222;color:#fff;font-family:sans-serif;font-size:14px;">
        <strong>${g.home}</strong> x <strong>${g.away}</strong>
        <div style="color:#888;font-size:12px;margin-top:2px;">${g.league} · ${g.time}</div>
      </td>
    </tr>`
  ).join("");

  return `
  <div style="background:#0a0f0d;padding:32px 16px;font-family:sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#111815;border-radius:12px;padding:24px;border:1px solid #1f2b26;">
      <div style="color:#22c55e;font-size:20px;font-weight:bold;margin-bottom:4px;">Placar Certo</div>
      <div style="color:#fff;font-size:16px;font-weight:600;margin-bottom:16px;">Seus times favoritos jogam hoje ⚽</div>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <a href="https://placarcerto.lovable.app/dashboard" style="display:inline-block;margin-top:20px;background:#22c55e;color:#000;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600;">Ver no app</a>
      <p style="color:#666;font-size:11px;margin-top:24px;">Você recebeu isso porque ativou alertas por e-mail no Placar Certo. Pode desativar a qualquer momento em Minha Conta.</p>
    </div>
  </div>`;
}
