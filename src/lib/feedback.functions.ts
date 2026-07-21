import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FEEDBACK_TO = "placarcerto.ia@gmail.com";
const SITE_NAME = "PlacarCerto";
const SENDER_DOMAIN = "notify.placarcerto.ia.br";
const FROM = `${SITE_NAME} <noreply@${SENDER_DOMAIN}>`;

const feedbackSchema = z.object({
  name: z.string().trim().max(100).optional().default(""),
  email: z.string().trim().email("E-mail inválido").max(255).optional().or(z.literal("")),
  category: z.enum(["sugestao", "reclamacao", "elogio", "bug", "outro"]),
  message: z
    .string()
    .trim()
    .min(10, "Descreva com um pouco mais de detalhes (mínimo 10 caracteres)")
    .max(4000, "Mensagem muito longa (máx. 4000 caracteres)"),
});

const categoryLabels: Record<string, string> = {
  sugestao: "Sugestão",
  reclamacao: "Reclamação",
  elogio: "Elogio",
  bug: "Bug / Problema técnico",
  outro: "Outro",
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => feedbackSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const { sendLovableEmail } = await import("@lovable.dev/email-js");

    const category = categoryLabels[data.category] ?? data.category;
    const nameLine = data.name ? escapeHtml(data.name) : "(anônimo)";
    const emailLine = data.email ? escapeHtml(data.email) : "(não informado)";
    const msgHtml = escapeHtml(data.message).replace(/\n/g, "<br/>");

    const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;background:#f6f7f9;padding:24px;color:#111">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb">
    <h2 style="margin:0 0 12px">Novo feedback — ${escapeHtml(category)}</h2>
    <p style="margin:4px 0"><b>Nome:</b> ${nameLine}</p>
    <p style="margin:4px 0"><b>E-mail:</b> ${emailLine}</p>
    <p style="margin:4px 0"><b>Categoria:</b> ${escapeHtml(category)}</p>
    <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb"/>
    <div style="white-space:pre-wrap;line-height:1.5">${msgHtml}</div>
  </div>
</body></html>`;

    const text = `Novo feedback — ${category}
Nome: ${data.name || "(anônimo)"}
E-mail: ${data.email || "(não informado)"}
Categoria: ${category}

${data.message}`;

    await sendLovableEmail(
      {
        to: FEEDBACK_TO,
        from: FROM,
        sender_domain: SENDER_DOMAIN,
        subject: `[Feedback][${category}] ${data.name || data.email || "Anônimo"}`,
        html,
        text,
        reply_to: data.email || undefined,
        purpose: "transactional",
        label: "user-feedback",
      },
      { apiKey, sendUrl: process.env.LOVABLE_SEND_URL },
    );

    return { ok: true as const };
  });
