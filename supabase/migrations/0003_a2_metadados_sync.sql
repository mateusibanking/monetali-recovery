-- A2.2 — Metadados de sync em pagamentos_atraso + backfill
--
-- 3 colunas:
--   - comentarios JSONB DEFAULT '[]' — campo protegido (sync nunca sobrescreve)
--   - origem_dado text — { google_sheets | vitbank_xlsx | manual | legacy }
--   - sync_hash text — SHA-256 do payload bruto para UPSERT idempotente em B1
--
-- Backfill: linhas pré-existentes recebem origem_dado='legacy'.
-- contas_a_receber já nasceu com essas colunas em 0002.
-- Idempotente (ADD COLUMN IF NOT EXISTS + UPDATE com WHERE IS NULL).

ALTER TABLE public.pagamentos_atraso
  ADD COLUMN IF NOT EXISTS comentarios jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.pagamentos_atraso
  ADD COLUMN IF NOT EXISTS origem_dado text;

ALTER TABLE public.pagamentos_atraso
  ADD COLUMN IF NOT EXISTS sync_hash text;

-- Backfill — somente linhas que ainda não têm origem_dado
UPDATE public.pagamentos_atraso
   SET origem_dado = 'legacy'
 WHERE origem_dado IS NULL;
