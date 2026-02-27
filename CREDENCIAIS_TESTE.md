# Credenciais de Teste (Supabase Auth)

Usuarios cadastrados no Supabase Auth para testes:

| Email | Senha | Perfil | Unidade |
|-------|-------|--------|---------|
| carlos.silva@petrobras.com.br | admin123 | Administrador | Unidade SP |
| ana.santos@petrobras.com.br | analista123 | Analista | Unidade SP |
| mariana.costa@petrobras.com.br | consulta123 | Consulta | Unidade SP |

## Setup do Banco

Antes de usar, execute o SQL de setup no Supabase Dashboard > SQL Editor:

```
scripts/setup-database.sql
```

Este script cria tabelas, insere estacoes, sensores, dados de medicao e configura as politicas de seguranca (RLS).
