-- A3 — Tabelas auxiliares (metas, sync_log, importacoes_manuais)
--
-- Habilitam:
--   - metas: gráfico jacaré (Fase E) + futura UI de admin pra editar metas
--   - sync_log: página /sync (B3) + indicador no header (B4)
--   - importacoes_manuais: histórico de uploads (C3)
--
-- Idempotente. Inclui seed das 3 metas iniciais com ON CONFLICT DO NOTHING.

-- =============================================================================
-- 1. metas
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  periodo text NOT NULL CHECK (periodo IN ('diario','semanal','mensal')),
  valor numeric NOT NULL CHECK (valor > 0),
  observacao text,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, periodo)
);

DROP TRIGGER IF EXISTS trg_metas_updated_at ON public.metas;
CREATE TRIGGER trg_metas_updated_at
  BEFORE UPDATE ON public.metas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS metas_select ON public.metas;
CREATE POLICY metas_select ON public.metas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS metas_insert ON public.metas;
CREATE POLICY metas_insert ON public.metas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS metas_update ON public.metas;
CREATE POLICY metas_update ON public.metas FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS metas_delete ON public.metas;
CREATE POLICY metas_delete ON public.metas FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  ));

-- Seed inicial (idempotente — re-aplicar não duplica)
INSERT INTO public.metas (tipo, periodo, valor) VALUES
  ('recuperacao', 'mensal',  40000),
  ('recuperacao', 'semanal',  5000),
  ('recuperacao', 'diario',    200)
ON CONFLICT (tipo, periodo) DO NOTHING;

-- =============================================================================
-- 2. sync_log
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte text NOT NULL,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  status text NOT NULL DEFAULT 'rodando'
    CHECK (status IN ('rodando','sucesso','parcial','falha')),
  qtd_processados integer NOT NULL DEFAULT 0,
  qtd_inseridos integer NOT NULL DEFAULT 0,
  qtd_atualizados integer NOT NULL DEFAULT 0,
  qtd_ignorados integer NOT NULL DEFAULT 0,
  qtd_erros integer NOT NULL DEFAULT 0,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by text
);

CREATE INDEX IF NOT EXISTS idx_sync_log_iniciado_em
  ON public.sync_log USING btree (iniciado_em DESC);

ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

-- Apenas SELECT pra authenticated. INSERT/UPDATE/DELETE sem policy = só
-- service_role (usado pela Edge Function de sync) consegue escrever.
DROP POLICY IF EXISTS sync_log_select ON public.sync_log;
CREATE POLICY sync_log_select ON public.sync_log FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- 3. importacoes_manuais
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.importacoes_manuais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES public.profiles(id),
  arquivo_nome text NOT NULL,
  arquivo_tamanho_bytes integer,
  preset text,
  tipo_destino text NOT NULL
    CHECK (tipo_destino IN ('pagamentos_atraso','contas_a_receber')),
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  status text NOT NULL DEFAULT 'processando'
    CHECK (status IN ('processando','sucesso','parcial','falha')),
  qtd_linhas_planilha integer NOT NULL DEFAULT 0,
  qtd_inseridos integer NOT NULL DEFAULT 0,
  qtd_atualizados integer NOT NULL DEFAULT 0,
  qtd_ignorados integer NOT NULL DEFAULT 0,
  qtd_erros integer NOT NULL DEFAULT 0,
  mapeamento_colunas jsonb NOT NULL DEFAULT '{}'::jsonb,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_importacoes_iniciado_em
  ON public.importacoes_manuais USING btree (iniciado_em DESC);

ALTER TABLE public.importacoes_manuais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS importacoes_select ON public.importacoes_manuais;
CREATE POLICY importacoes_select ON public.importacoes_manuais FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS importacoes_insert ON public.importacoes_manuais;
CREATE POLICY importacoes_insert ON public.importacoes_manuais FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin','financeiro'])
  ));

DROP POLICY IF EXISTS importacoes_update ON public.importacoes_manuais;
CREATE POLICY importacoes_update ON public.importacoes_manuais FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin','financeiro'])
  ));
