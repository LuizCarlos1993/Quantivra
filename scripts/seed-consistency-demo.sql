-- ============================================
-- Seed para demonstração: Consistência + Alertas
-- ============================================
-- Garante alertas não lidos para o sino no header.
-- Os dados da Consistência seguem a lógica: maioria válida, ~5-6 pendentes/dia.
--
-- Pré-requisitos: execute seed-mockup-data.sql e seed-daily-fictitious-data.sql
-- ============================================

UPDATE alerts SET "read" = false WHERE created_at > NOW() - interval '30 days';

SELECT 'Seed consistência/alertas concluído.' AS resultado;
