-- Permite inserir alertas para estações que o usuário pode acessar.
-- Necessário para ensureAlertsForPendingData (alerta quando há dados pendentes).
CREATE POLICY alerts_insert_policy ON alerts
  FOR INSERT WITH CHECK (
    station_id IN (
      SELECT id FROM stations
      WHERE unit IN (SELECT unit FROM users WHERE id = auth.uid())
    )
  );
