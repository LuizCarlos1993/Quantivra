# INTEGRATION RULES

## Supabase MCP

- All DB access via Supabase client
- RLS must enforce data visibility
- No direct SQL in frontend

## CSV Upload

- Validate format before insert
- Reject malformed rows
- Log import result