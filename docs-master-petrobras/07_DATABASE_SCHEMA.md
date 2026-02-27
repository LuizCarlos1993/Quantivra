# DATABASE SCHEMA

## Tables

stations
networks
sensors
raw_data
validated_data
validation_flags
alerts
users
roles
user_roles
audit_logs
availability_metrics
iqair_results

---

## Rules

- raw_data is immutable
- validated_data references raw_data_id
- Foreign keys enforced
- Index on timestamp
- RLS enabled for all user tables
- Soft delete not allowed for raw_data