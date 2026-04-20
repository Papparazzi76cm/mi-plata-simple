/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirmá el cambio de email en {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>Mi Plata</Heading>
        <Heading style={h1}>Confirmá el cambio de email</Heading>
        <Text style={text}>
          Pediste cambiar tu email en {siteName} de{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          a{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>Tocá el botón para confirmar:</Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar cambio
        </Button>
        <Text style={footer}>
          Si no pediste este cambio, asegurá tu cuenta cuanto antes.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const link = { color: 'hsl(152, 65%, 38%)', textDecoration: 'underline' }
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
