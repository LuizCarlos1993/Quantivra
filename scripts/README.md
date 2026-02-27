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
- 8 alertas do Header do mockup (SO2, MP10, O3 flatline, CO, NOx calibração)

## Scripts legados

Os seguintes scripts foram usados durante o desenvolvimento inicial e podem ser ignorados:

- `create-users-tables.ts` / `create-users-table.sql` - Criacao das tabelas users/user_roles
- `seed-users.ts` - Seed de usuarios de teste
- `ensure-roles.ts` / `fix-roles-schema.sql` - Correcao da tabela roles
- `check-roles-schema.ts` / `init-schema-for-seed.sql` - Verificacao de schema

Todos esses cenarios sao cobertos pelo `setup-database.sql`.
