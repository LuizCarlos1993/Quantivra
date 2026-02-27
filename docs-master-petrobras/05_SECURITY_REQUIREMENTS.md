# SECURITY REQUIREMENTS

## Authentication

- SSO via Microsoft Entra (SAML or OAuth)
- MFA required
- No local generic users
- Session timeout after inactivity

## Authorization

- RBAC enforced at database level (RLS)
- Role-based permissions
- Station-level data segregation

## Encryption

- TLS 1.2+
- Encryption at rest
- NIST-compliant algorithms

## Logging

- Full audit trail
- Login history
- Data validation history
- Retention: 5 years

## Infrastructure Security

- WAF protection (OWASP Top 10)
- Production isolated from development
- Daily backups
- 30-day retention