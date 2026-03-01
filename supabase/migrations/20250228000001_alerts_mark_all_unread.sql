-- Marca todos os alertas como não vistos (read = false).
-- Os dados subjacentes (raw_data, validated_data) não são alterados.
UPDATE alerts SET read = false;
