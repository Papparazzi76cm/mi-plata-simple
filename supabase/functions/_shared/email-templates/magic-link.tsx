/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu link de acceso a {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>Mi Plata</Heading>
        <Heading style={h1}>Tu link de acceso</Heading>
        <Text style={text}>
          Tocá el botón para entrar a {siteName}. El link expira en unos minutos.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Entrar
        </Button>
        <Text style={footer}>
          Si no pediste este link, podés ignorar este email tranqui.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
  margin: '0 0 28px',
}
const button = {
  backgroundColor: 'hsl(152, 65%, 38%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '20px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '12px',
  color: 'hsl(160, 10%, 55%)',
  margin: '36px 0 0',
}
