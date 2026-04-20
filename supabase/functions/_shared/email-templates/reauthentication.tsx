/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de verificación de Mi Plata</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>Mi Plata</Heading>
        <Heading style={h1}>Tu código de verificación</Heading>
        <Text style={text}>Usá este código para confirmar tu identidad:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          El código expira en unos minutos. Si no lo pediste, ignorá este email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', system-ui, -apple-system, Arial, sans-serif",
}
const container = { padding: '32px 25px', maxWidth: '480px' }
const brand = {
  fontSize: '14px',
  fontWeight: 'bold' as const,
  color: 'hsl(152, 65%, 38%)',
  letterSpacing: '0.5px',
  margin: '0 0 24px',
  textTransform: 'uppercase' as const,
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: 'hsl(160, 25%, 12%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: 'hsl(160, 10%, 45%)',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const codeStyle = {
  fontFamily: "'SF Mono', Menlo, Courier, monospace",
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: 'hsl(152, 65%, 38%)',
  letterSpacing: '8px',
  margin: '8px 0 32px',
}
const footer = {
  fontSize: '12px',
  color: 'hsl(160, 10%, 55%)',
  margin: '36px 0 0',
}
