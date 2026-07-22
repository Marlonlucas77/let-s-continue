import React from "react";
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  amount?: string;
  referredEmail?: string;
  hasPix?: boolean;
  affiliateUrl?: string;
}

const Email = ({ amount = "R$ 0,00", referredEmail = "novo cliente", hasPix = true, affiliateUrl = "https://placarcerto.ia.br/affiliate" }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Você ganhou {amount} em comissão no PlacarCerto! 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎉 Nova comissão gerada!</Heading>
        <Text style={text}>
          Ótima notícia — o usuário <strong>{referredEmail}</strong> assinou um plano usando o seu link de indicação.
        </Text>
        <Section style={amountBox}>
          <Text style={amountLabel}>Sua comissão</Text>
          <Text style={amountValue}>{amount}</Text>
        </Section>
        {hasPix ? (
          <Text style={text}>
            O pagamento será feito via Pix no fechamento mensal. Você pode acompanhar todas as suas comissões no painel de afiliados.
          </Text>
        ) : (
          <Text style={warn}>
            ⚠️ Você ainda não cadastrou sua chave Pix. Cadastre agora para receber sua comissão no próximo fechamento.
          </Text>
        )}
        <Section style={{ textAlign: "center", margin: "28px 0" }}>
          <Button href={affiliateUrl} style={button}>Ver painel de afiliados</Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>PlacarCerto — Programa de Afiliados</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "🎉 Você ganhou uma comissão no PlacarCerto",
  displayName: "Comissão de afiliado",
  previewData: { amount: "R$ 7,50", referredEmail: "amigo@exemplo.com", hasPix: true },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" };
const container = { padding: "32px 28px", maxWidth: "560px", margin: "0 auto" };
const h1 = { color: "#065f46", fontSize: "26px", fontWeight: "700", margin: "0 0 16px" };
const text = { color: "#1f2937", fontSize: "16px", lineHeight: "1.6", margin: "12px 0" };
const warn = { color: "#92400e", backgroundColor: "#fef3c7", padding: "12px 16px", borderRadius: "8px", fontSize: "14px", lineHeight: "1.5" };
const amountBox = { backgroundColor: "#ecfdf5", border: "1px solid #10b981", borderRadius: "12px", padding: "20px", textAlign: "center" as const, margin: "20px 0" };
const amountLabel = { color: "#065f46", fontSize: "13px", textTransform: "uppercase" as const, letterSpacing: "0.5px", margin: "0 0 4px" };
const amountValue = { color: "#059669", fontSize: "32px", fontWeight: "800", margin: "0" };
const button = { backgroundColor: "#059669", color: "#ffffff", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: "600", fontSize: "15px" };
const hr = { borderColor: "#e5e7eb", margin: "28px 0 16px" };
const footer = { color: "#6b7280", fontSize: "12px", textAlign: "center" as const };
