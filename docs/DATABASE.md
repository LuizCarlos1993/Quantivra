# Schema do Banco de Dados

## Tabelas

### `networks`
Redes de monitoramento.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID (PK) | Identificador unico |
| name | TEXT | Nome da rede |

### `stations`
Estacoes de monitoramento de qualidade do ar.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID (PK) | Identificador unico |
| network_id | UUID (FK -> networks) | Rede a que pertence |
| name | TEXT | Nome completo (ex: "Estacao REPLAN (Paulinia - SP)") |
| code | TEXT (UNIQUE) | Codigo curto (ex: "#294") |
| lat | DOUBLE PRECISION | Latitude |
| lng | DOUBLE PRECISION | Longitude |
| unit | TEXT | Unidade operacional (ex: "Unidade SP") |
| status | TEXT | Status: active, inactive, maintenance |
| created_at | TIMESTAMPTZ | Data de criacao |
| updated_at | TIMESTAMPTZ | Ultima atualizacao |

**Indices**: `idx_stations_unit` em `unit`

### `sensors`
Sensores instalados nas estacoes.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID (PK) | Identificador unico |
| station_id | UUID (FK -> stations) | Estacao onde esta instalado |
| parameter | TEXT | Parametro medido (O3, NOx, SO2, CO, HCT, BTEX, MP10, MP2.5, wind_speed, wind_direction, temperature, humidity) |
| brand | TEXT | Fabricante |
| model | TEXT | Modelo |
| serial | TEXT | Numero de serie |
| status | TEXT | active, maintenance, inactive |

### `raw_data`
Medicoes brutas coletadas pelos sensores.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID (PK) | Identificador unico |
| station_id | UUID (FK -> stations) | Estacao de origem |
| sensor_id | UUID (FK -> sensors) | Sensor que coletou |
| timestamp | TIMESTAMPTZ | Momento da medicao |
| value | DOUBLE PRECISION | Valor medido |
| created_at | TIMESTAMPTZ | Data de insercao |

**Indices**: `idx_raw_data_timestamp`, `idx_raw_data_station`, `idx_raw_data_sensor`

### `validated_data`
Validacoes realizadas sobre os dados brutos.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID (PK) | Identificador unico |
| raw_data_id | UUID (FK -> raw_data, UNIQUE) | Dado bruto validado |
| is_valid | BOOLEAN | Se o dado e valido |
| justification | TEXT | Motivo da invalidacao |
| operator_id | UUID | Quem validou |

### `alerts`
Alertas do sistema.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID (PK) | Identificador unico |
| station_id | UUID (FK -> stations) | Estacao relacionada |
| parameter | TEXT | Parametro relacionado |
| type | TEXT | Tipo: threshold_exceeded, anomaly, flatline, calibration |
| message | TEXT | Mensagem descritiva |
| severity | TEXT | critical, warning, info |
| read | BOOLEAN | Se foi lido |
| created_at | TIMESTAMPTZ | Data de criacao |

### `users`
Perfis de usuarios (vinculados ao Supabase Auth).

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID (PK, FK -> auth.users) | ID do auth.users |
| email | TEXT | Email |
| name | TEXT | Nome completo |
| unit | TEXT | Unidade operacional |
| status | TEXT | Ativo ou Inativo |
| created_at | TIMESTAMPTZ | Data de criacao |

### `roles`
Perfis de acesso.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID (PK) | Identificador unico |
| name | TEXT (UNIQUE) | Administrador, Analista, Consulta |

### `user_roles`
Relacao N:N entre usuarios e perfis.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| user_id | UUID (FK -> users) | Usuario |
| role_id | UUID (FK -> roles) | Perfil |

### `availability_metrics`
Metricas de disponibilidade por estacao/dia.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| station_id | UUID (FK -> stations) | Estacao |
| date | DATE | Data |
| percentage | DOUBLE PRECISION | Percentual de disponibilidade |

### `iqair_results`
Indice de Qualidade do Ar calculado.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| station_id | UUID (FK -> stations) | Estacao |
| timestamp | TIMESTAMPTZ | Momento do calculo |
| value | DOUBLE PRECISION | Valor do IQAr |

### `audit_logs`
Registro de auditoria.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID (PK) | Identificador unico |
| action | TEXT | Acao (login, logout, etc.) |
| user_id | UUID | Usuario que realizou |
| timestamp | TIMESTAMPTZ | Momento da acao |
| metadata | JSONB | Dados adicionais |

## Row Level Security (RLS)

Todas as tabelas com dados sensíveis tem RLS ativado. As politicas filtram por unidade do usuario autenticado:

- **stations**: SELECT filtrado por `unit` do usuario
- **raw_data**: SELECT/INSERT filtrado por estacoes da `unit` do usuario
- **sensors**: SELECT filtrado pela estacao
- **alerts**: SELECT/UPDATE filtrado pela estacao
- **users**: SELECT para todos autenticados; INSERT/UPDATE/DELETE somente para Administradores
- **validated_data**: SELECT por estacao; INSERT somente para Administrador/Analista
- **audit_logs**: INSERT para todos autenticados; SELECT somente para Administradores

## Relacionamentos

```
networks 1---N stations 1---N sensors
stations 1---N raw_data
sensors  1---N raw_data
raw_data 1---1 validated_data
stations 1---N alerts
stations 1---N availability_metrics
stations 1---N iqair_results
auth.users 1---1 users 1---N user_roles N---1 roles
```
