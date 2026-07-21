import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteName,
  recipient,
  token,
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{`Seu código de confirmação ${siteName}: ${token ?? ''}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirme seu e-mail</Heading>
        <Text style={text}>
          Olá! Recebemos seu cadastro no <strong>{siteName}</strong> com o e-mail{' '}
          <strong>{recipient}</strong>.
        </Text>
        <Text style={text}>Use o código abaixo para confirmar sua conta:</Text>
        <Section style={codeBox}>
          <Text style={code}>{token}</Text>
        </Section>
        <Text style={text}>
          O código é válido por 1 hora. Se você não criou esta conta, pode ignorar este e-mail.
        </Text>
        <Text style={footer}>— Equipe {siteName}</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 20px',
}
const codeBox = {
  background: '#f4f4f5',
  borderRadius: '8px',
  padding: '18px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const code = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  color: '#111111',
  margin: 0,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
