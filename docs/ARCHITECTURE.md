# Arquitetura do Quantivra

## Visao Geral

O Quantivra e uma SPA (Single Page Application) React que consome dados de um backend Supabase (PostgreSQL). Toda a logica de acesso a dados esta na camada de services, que usa o cliente Supabase JS.

## Fluxo de Dados

```
Navegador (React)
  |
  +-- Services (src/services/)
  |     |
  |     +-- supabase client (src/lib/supabase.ts)
  |           |
  |           +-- Supabase Cloud (PostgreSQL + Auth + RLS)
  |
  +-- Hooks (src/hooks/)
  |     |
  |     +-- useDataSegregation: filtra estacoes por unidade do usuario
  |     +-- usePermissions: verifica permissoes baseadas no perfil
  |
  +-- Components (src/components/)
        |
        +-- Header: alertas, perfil do usuario
        +-- Sidebar: navegacao entre modulos
        +-- MainLayout: orquestra paginas e estado global
```

## Camada de Services

Cada service encapsula as queries ao Supabase para um dominio:

| Service | Tabelas | Responsabilidade |
|---------|---------|-----------------|
| `authService` | auth.users, users, user_roles, roles | Login, logout, sessao |
| `stationsService` | stations, sensors, raw_data, iqair_results | Estacoes e dados recentes |
| `dashboardService` | stations, sensors, raw_data, iqair_results, availability_metrics | Dados do painel |
| `consistencyService` | raw_data, validated_data, sensors, stations | Validacao de medicoes |
| `usersService` | users, user_roles, roles | CRUD de usuarios |
| `alertsService` | alerts, stations | Alertas do sistema |
| `auditService` | audit_logs | Log de auditoria |

## Autenticacao

1. Usuario faz login com email/senha via `supabase.auth.signInWithPassword()`
2. O `authService.fetchUserProfile()` busca o perfil do usuario nas tabelas `users` + `user_roles` + `roles`
3. O perfil (Administrador/Analista/Consulta) e armazenado no contexto React (`AuthContext`)
4. O `usePermissions` hook retorna flags booleanas de permissao baseadas no perfil

## Segregacao por Unidade

- Cada usuario pertence a uma `unit` (ex: "Unidade SP", "Unidade RJ")
- Estacoes pertencem a uma `unit`
- RLS policies no Supabase filtram dados automaticamente: `WHERE unit IN (SELECT unit FROM users WHERE id = auth.uid())`
- O hook `useDataSegregation` fornece funcoes para verificar acesso a estacoes no frontend

## Modulos

### Dashboard (`modules/dashboard/`)
- Exibe IQAr, rosa dos ventos, rosa de poluentes, timeline, parametros
- Dados vem do `dashboardService.getDashboardData(station, date)`

### Consistencia (`modules/consistency/`)
- Tabela supervisoria com dados brutos e validados
- Permite invalidar medicoes com justificativa
- Dados vem do `consistencyService.generateConsistencyData()`

### Mapa (`modules/map/`)
- Leaflet com marcadores para cada estacao
- Popup mostra dados recentes e link para consistencia
- Suporta camadas WMS (topografia, queimadas)

### Relatorios (`modules/reports/`)
- Graficos de evolucao temporal, IQAr, box plot, rosa dos ventos
- Exportacao CSV com dados filtrados
- Dados vem das queries ao raw_data e iqair_results

### Usuarios (`modules/users/`)
- CRUD completo de usuarios
- Atribuicao de perfil (role) e unidade
- Somente Administradores tem acesso

### Configuracoes (`modules/settings/`)
- Parametros de aquisicao de dados
- Configuracoes de validacao automatica
- Somente Administradores tem acesso
