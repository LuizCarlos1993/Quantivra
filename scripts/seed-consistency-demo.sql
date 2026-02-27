-- ============================================
-- Seed para demonstração: Consistência + Alertas
-- ============================================
-- Garante dados fictícios para a página Consistência e Validação
-- e alertas não lidos para o sino no header.
--
-- Pré-requisitos: execute seed-mockup-data.sql e seed-daily-fictitious-data.sql
-- Ou execute tudo no SQL Editor do Supabase.
-- ============================================

-- 0. Corrigir alertas com parâmetros que a estação não possui (REPLAN tem MP10, não SO2)
UPDATE alerts a SET parameter = 'MP10', message = 'Valor elevado de MP₁₀ - Requer validação'
WHERE a.station_id = 'b1000000-0000-0000-0000-000000000001' AND a.parameter = 'SO2';

-- UTGCA não tem CO; mover para REDUC que tem CO
UPDATE alerts SET station_id = 'b1000000-0000-0000-0000-000000000003'
WHERE station_id = 'b1000000-0000-0000-0000-000000000002' AND parameter = 'CO';

-- 1. Garantir alertas não lidos (sino)
UPDATE alerts SET "read" = false
WHERE created_at > NOW() - interval '30 days'
  AND id IN (SELECT id FROM alerts ORDER BY created_at DESC LIMIT 8);

SELECT 'Seed consistência/alertas concluído. Execute seed_daily_fictitious_data(CURRENT_DATE) se a Consistência estiver vazia.' AS resultado;
