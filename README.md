# Quantivra

Sistema de monitoramento de qualidade do ar para refinarias, desenvolvido com React + TypeScript + Supabase.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Estilizacao**: Tailwind CSS 4
- **UI**: Radix UI, Lucide Icons
- **Graficos**: Recharts
- **Mapas**: Leaflet
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Notificacoes**: Sonner

## Pre-requisitos

- Node.js 18+
- Conta no Supabase com projeto configurado

## Setup

1. Instale as dependencias:

```bash
npm install
```

2. Configure as variaveis de ambiente copiando `.env.example` para `.env`:

```bash
cp .env.example .env
```

Preencha os valores:

| Variavel | Descricao |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave publica (anon) do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de servico (para scripts de seed) |

3. Execute o SQL de setup no Supabase Dashboard > SQL Editor:

```bash
# O arquivo esta em:
scripts/setup-database.sql
```

Este script cria/corrige tabelas, insere estacoes, sensores, dados de medicao e configura RLS policies.

4. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

## Estrutura do Projeto

```
src/
  components/     # Componentes compartilhados (Header, Sidebar, etc.)
  config/         # Constantes e configuracoes (parametros, periodos)
  hooks/          # React hooks (useDataSegregation, usePermissions)
  lib/            # Cliente Supabase
  modules/        # Paginas organizadas por feature
    auth/         # Login e contexto de autenticacao
    dashboard/    # Painel de monitoramento
    consistency/  # Validacao e consistencia de dados
    map/          # Mapa georreferenciado (Leaflet)
    reports/      # Relatorios e exportacao
    users/        # Gestao de usuarios (Admin)
    settings/     # Configuracoes do sistema (Admin)
  services/       # Camada de acesso a dados (Supabase queries)
  types/          # TypeScript types e interfaces
  styles/         # CSS global e tema
scripts/          # Scripts de setup e seed do banco
supabase/         # Migrations SQL
```

## Funcionalidades

- **Dashboard**: Monitoramento em tempo real com IQAr, rosa dos ventos, timeline de poluentes
- **Consistencia**: Validacao e invalidacao de medicoes com justificativa
- **Mapa**: Visualizacao georreferenciada das estacoes com Leaflet
- **Relatorios**: Graficos analiticos e exportacao CSV/XLSX
- **Usuarios**: CRUD completo com perfis e segregacao por unidade
- **Alertas**: Notificacoes em tempo real do banco de dados

## Perfis de Acesso

| Perfil | Permissoes |
|--------|-----------|
| **Administrador** | Acesso total, gestao de usuarios, configuracoes |
| **Analista** | Visualizar, validar dados, exportar CSV |
| **Consulta** | Somente leitura |

## Segregacao de Dados

Usuarios so veem dados das estacoes da sua unidade, controlado por Row Level Security (RLS) no Supabase.

## Scripts

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de producao
npm run preview      # Preview do build
```
