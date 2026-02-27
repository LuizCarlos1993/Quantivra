# SYSTEM ARCHITECTURE

## Stack

Frontend:
- React
- TypeScript
- Strict typing
- Component modularization

Backend:
- Supabase (PostgreSQL)
- PostGIS enabled
- Edge Functions for logic

Auth:
- Supabase + SAML integration

Realtime:
- Supabase Realtime

Storage:
- Supabase Storage

---

## Architectural Layers

1. Presentation Layer (React)
2. Application Layer (Services)
3. Domain Layer (Business logic)
4. Data Layer (Postgres + RLS)
5. Integration Layer (Edge functions)

No business logic inside components.