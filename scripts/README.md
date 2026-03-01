# Scripts

## setup-database.sql

Script SQL principal para configurar o banco de dados Supabase. Execute no **Supabase Dashboard > SQL Editor**.

O script e idempotente (pode ser executado multiplas vezes sem problemas) e faz:

1. Corrige a tabela `roles` (adiciona coluna `name` se ausente)
2. Adiciona colunas `status` e `created_at` na tabela `users`
3. Adiciona colunas `message` e `severity` na tabela `alerts`
4. Insere 3 redes de monitoramento (SP, RJ, MG)
5. Insere 6 estacoes de monitoramento
6. Insere sensores (12 parametros por estacao)
7. Gera dados de medicao para os ultimos 7 dias (hourly)
8. Gera metricas de disponibilidade para os ultimos 30 dias
9. Gera resultados de IQAr para os ultimos 7 dias
10. Insere 4 alertas iniciais
11. Configura politicas RLS para todas as tabelas

## seed-mockup-data.sql

Script para popular o Supabase com dados fictícios do mockup Figma **Plataforma Monitoramento Ar**. **NÃO altera** usuários, roles ou user_roles.

Execute no Supabase Dashboard > SQL Editor. Pré-requisito: `setup-database.sql` (ou migrations equivalentes).

Inclui:
- 3 redes, 6 estações, sensores (brand/model/serial do mockup)
- raw_data (7 dias), availability_metrics (30 dias), iqair_results (7 dias)
- Lógica realista: ~99% dos dados validados (VÁLIDO); ~5–6 por dia pendentes (dados fora da curva)
- 2–3 alertas (refletem os poucos pendentes para o analista)

## seed-daily-fictitious-data.sql

Script que cria a função `seed_daily_fictitious_data(p_target_date)` e gera dados fictícios para o dia especificado (raw_data, iqair_results, availability_metrics). Valores variam por dia (aleatório determinístico). Segue a lógica realista: maioria validada automaticamente, ~5–6 pendentes/dia (dados fora da curva).

**Execução manual:**
```sql
SELECT seed_daily_fictitious_data();                    -- hoje
SELECT seed_daily_fictitious_data('2026-02-28'::date);  -- data específica
```

**Agendamento diário (pg_cron):**

1. Habilitar pg_cron: Supabase Dashboard > Integrations > Cron
2. Executar no SQL Editor:
```sql
SELECT cron.schedule(
  'seed-daily-quantivra',
  '5 0 * * *',
  $$SELECT seed_daily_fictitious_data(CURRENT_DATE)$$
);
```

**Alternativa sem pg_cron (cron externo):**

1. Fazer deploy da Edge Function `seed-daily-data`:
   ```bash
   supabase functions deploy seed-daily-data --no-verify-jwt
   ```

2. Definir secrets:
   ```bash
   supabase secrets set CRON_SECRET=seu-token-secreto
   ```

3. Agendar em [cron-job.org](https://cron-job.org) (grátis):
   - URL: `https://<project_ref>.supabase.co/functions/v1/seed-daily-data`
   - Método: POST
   - Header: `Authorization: Bearer seu-token-secreto`
   - Cron: todo dia às 00:05

## seed-consistency-demo.sql

Garante alertas não lidos para o sino no header. Execute após seed-mockup-data e seed-daily-fictitious-data.

## Scripts legados

Os seguintes scripts foram usados durante o desenvolvimento inicial e podem ser ignorados:

- `create-users-tables.ts` / `create-users-table.sql` - Criacao das tabelas users/user_roles
- `seed-users.ts` - Seed de usuarios de teste
- `ensure-roles.ts` / `fix-roles-schema.sql` - Correcao da tabela roles
- `check-roles-schema.ts` / `init-schema-for-seed.sql` - Verificacao de schema

Todos esses cenarios sao cobertos pelo `setup-database.sql`.
