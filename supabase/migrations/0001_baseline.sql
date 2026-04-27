-- Baseline migration — snapshot do schema vivo em 2026-04-27
--
-- Projeto Supabase: lxxcenctirccdpysbynz
-- Gerado por introspecção do schema de produção via MCP read-only.
-- Este arquivo documenta o estado atual; produção já tem todos esses objetos.
-- Aplicar em DB fresco (preview, dev local) reproduz o schema vivo.
-- Idempotente: pode ser re-aplicado em produção sem efeito (CREATE IF NOT EXISTS / OR REPLACE).
--
-- Advisor warnings conhecidos (a serem endereçados em PRs futuros, NÃO em A1):
--   - 3 views com SECURITY DEFINER: clientes_com_totais, vw_inadimplencia_aberta, vw_recuperacao_mensal
--   - 4 funções com search_path mutável: sync_cliente_totais, update_updated_at, create_profile_on_signup, update_dias_atraso
--   - Política RLS atividades_insert com WITH CHECK (true) — irrestrita para authenticated
--   - create_profile_on_signup() executável por anon/authenticated via /rest/v1/rpc

-- =============================================================================
-- 1. Extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- =============================================================================
-- 2. Trigger functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_dias_atraso()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.data_vencimento < CURRENT_DATE AND NEW.status = 'em_aberto' THEN
    NEW.dias_atraso = CURRENT_DATE - NEW.data_vencimento;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_cliente_totais()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_cliente_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_cliente_id := OLD.cliente_id;
  ELSE
    target_cliente_id := NEW.cliente_id;
  END IF;

  UPDATE clientes
  SET
    valor_total_atraso = COALESCE((
      SELECT SUM(COALESCE(vitbank,0) + COALESCE(monetali,0))
      FROM pagamentos_atraso
      WHERE cliente_id = target_cliente_id
        AND deleted_at IS NULL
    ), 0),
    qtd_pagamentos_atraso = COALESCE((
      SELECT COUNT(*)
      FROM pagamentos_atraso
      WHERE cliente_id = target_cliente_id
        AND deleted_at IS NULL
        AND status = 'em_aberto'
    ), 0),
    dias_atraso_max = COALESCE((
      SELECT MAX(dias_atraso)
      FROM pagamentos_atraso
      WHERE cliente_id = target_cliente_id
        AND deleted_at IS NULL
    ), 0),
    juros_total = COALESCE((
      SELECT SUM(juros)
      FROM pagamentos_atraso
      WHERE cliente_id = target_cliente_id
        AND deleted_at IS NULL
    ), 0),
    updated_at = NOW()
  WHERE id = target_cliente_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'viewer',
    true
  );
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 3. Tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cnpj text UNIQUE,
  email text,
  telefone text,
  regional text,
  executivo_responsavel text,
  diretor text,
  status text DEFAULT 'pendente'
    CHECK (status = ANY (ARRAY[
      'nao_iniciado','em_andamento','pendente','contatado','em_negociacao',
      'acordo_fechado','pago','juridico','parcelado','distrato','cancelado','suspenso'
    ])),
  valor_total_atraso numeric DEFAULT 0,
  qtd_pagamentos_atraso integer DEFAULT 0,
  dias_atraso_max integer DEFAULT 0,
  dias_inadimplente integer DEFAULT 0,
  juros_total numeric DEFAULT 0,
  valor_inadimplente_total numeric DEFAULT 0,
  valor_recuperado_total numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.pagamentos_atraso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  descricao text,
  valor numeric NOT NULL DEFAULT 0,
  data_vencimento date,
  dias_atraso integer DEFAULT 0,
  status text DEFAULT 'em_aberto'
    CHECK (status = ANY (ARRAY['em_aberto','parcial','pago','cancelado'])),
  data_pagamento timestamptz,
  forma_pagamento text,
  mes_referencia text,
  imposto text,
  valor_compensacao numeric DEFAULT 0,
  juros numeric DEFAULT 0,
  vitbank numeric DEFAULT 0,
  monetali numeric DEFAULT 0,
  data_cobranca date,
  motivo text,
  vcto_vitbank date,
  pgto_vitbank date,
  vcto_monetali date,
  pgto_monetali date,
  valor_pago_vitbank numeric DEFAULT 0,
  valor_pago_monetali numeric DEFAULT 0,
  boleto_vitbank numeric DEFAULT 0,
  vcto_boleto date,
  pgto_boleto date,
  pix_monetali numeric DEFAULT 0,
  vcto_pix date,
  pgto_pix date,
  faturamento_ref date,
  status_planilha text,
  anotacoes text,
  is_inadimplente boolean DEFAULT false,
  valor_pago_efetivo numeric DEFAULT 0,
  valor_inadimplente numeric DEFAULT 0,
  data_pagamento_efetivo date,
  mes_recuperacao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  tipo text NOT NULL
    CHECK (tipo = ANY (ARRAY['comentario','status','email','escalacao','pagamento'])),
  descricao text NOT NULL,
  automatico boolean DEFAULT false,
  criado_por text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recuperacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  pagamento_id uuid REFERENCES public.pagamentos_atraso(id),
  valor numeric NOT NULL DEFAULT 0,
  data_recebimento date NOT NULL,
  forma_pagamento text,
  mes_referencia text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flags_disponiveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text DEFAULT '#6b7280',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flags_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  nome_flag text NOT NULL,
  cor text DEFAULT '#6b7280',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  full_name text,
  role text DEFAULT 'viewer'
    CHECK (role = ANY (ARRAY['admin','financeiro','juridico','cs','viewer'])),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.premissas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor text NOT NULL,
  descricao text,
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

-- =============================================================================
-- 4. Indexes (não-PK, não-UNIQUE — esses já vêm com a tabela)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_atividades_cliente ON public.atividades USING btree (cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON public.clientes USING btree (cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_executivo ON public.clientes USING btree (executivo_responsavel);
CREATE INDEX IF NOT EXISTS idx_clientes_regional ON public.clientes USING btree (regional);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON public.clientes USING btree (status);
CREATE INDEX IF NOT EXISTS idx_flags_cliente ON public.flags_cliente USING btree (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_cliente ON public.pagamentos_atraso USING btree (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_mes ON public.pagamentos_atraso USING btree (mes_referencia);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON public.pagamentos_atraso USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pgto_inadimplente ON public.pagamentos_atraso USING btree (is_inadimplente);
CREATE INDEX IF NOT EXISTS idx_pgto_mes_recuperacao ON public.pagamentos_atraso USING btree (mes_recuperacao);
CREATE INDEX IF NOT EXISTS idx_recuperacoes_cliente ON public.recuperacoes USING btree (cliente_id);
CREATE INDEX IF NOT EXISTS idx_recuperacoes_mes ON public.recuperacoes USING btree (mes_referencia);

-- =============================================================================
-- 5. Triggers (drop-create para idempotência)
-- =============================================================================

DROP TRIGGER IF EXISTS trg_clientes_updated_at ON public.clientes;
CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_pagamentos_atraso_updated_at ON public.pagamentos_atraso;
CREATE TRIGGER trg_pagamentos_atraso_updated_at
  BEFORE UPDATE ON public.pagamentos_atraso
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_pagamentos_dias_atraso ON public.pagamentos_atraso;
CREATE TRIGGER trg_pagamentos_dias_atraso
  BEFORE INSERT OR UPDATE ON public.pagamentos_atraso
  FOR EACH ROW EXECUTE FUNCTION public.update_dias_atraso();

DROP TRIGGER IF EXISTS trg_sync_cliente_totais_iud ON public.pagamentos_atraso;
CREATE TRIGGER trg_sync_cliente_totais_iud
  AFTER INSERT OR DELETE OR UPDATE ON public.pagamentos_atraso
  FOR EACH ROW EXECUTE FUNCTION public.sync_cliente_totais();

DROP TRIGGER IF EXISTS trg_premissas_updated_at ON public.premissas;
CREATE TRIGGER trg_premissas_updated_at
  BEFORE UPDATE ON public.premissas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_on_signup();

-- =============================================================================
-- 6. Views
--
-- Produção atual marca estas views como SECURITY DEFINER (advisor flag).
-- Mantemos o comportamento idêntico aqui via ALTER VIEW SET (security_invoker = false).
-- Migration futura vai harmonizar para SECURITY INVOKER.
-- =============================================================================

CREATE OR REPLACE VIEW public.clientes_com_totais AS
SELECT
  c.id,
  c.nome,
  c.cnpj,
  c.email,
  c.telefone,
  c.regional,
  c.executivo_responsavel,
  c.valor_total_atraso,
  c.qtd_pagamentos_atraso,
  c.dias_atraso_max,
  c.status,
  c.created_at,
  c.updated_at,
  c.deleted_at,
  c.dias_inadimplente,
  c.juros_total,
  c.diretor,
  c.valor_inadimplente_total,
  c.valor_recuperado_total,
  COALESCE(SUM(p.vitbank), 0::numeric) AS total_vitbank,
  COALESCE(SUM(p.monetali), 0::numeric) AS total_monetali,
  COALESCE(SUM(CASE WHEN p.pgto_vitbank IS NULL THEN p.vitbank ELSE 0::numeric END), 0::numeric) AS inadimplente_vitbank,
  COALESCE(SUM(CASE WHEN p.pgto_monetali IS NULL THEN p.monetali ELSE 0::numeric END), 0::numeric) AS inadimplente_monetali,
  COALESCE(SUM(CASE WHEN p.pgto_vitbank IS NOT NULL THEN p.vitbank ELSE 0::numeric END), 0::numeric) AS recuperado_vitbank,
  COALESCE(SUM(CASE WHEN p.pgto_monetali IS NOT NULL THEN p.monetali ELSE 0::numeric END), 0::numeric) AS recuperado_monetali,
  ROUND(COALESCE(SUM(
    CASE
      WHEN p.pgto_vitbank IS NULL AND p.vcto_vitbank < now() THEN
        p.vitbank * (COALESCE((SELECT premissas.valor::numeric FROM premissas WHERE premissas.chave = 'multa_atraso' LIMIT 1), 2.0) / 100::numeric)
        + p.vitbank * (COALESCE((SELECT premissas.valor::numeric FROM premissas WHERE premissas.chave = 'taxa_juros_dia' LIMIT 1), 0.0) / 100::numeric)
          * GREATEST(0, now()::date - p.vcto_vitbank)::numeric
      ELSE 0::numeric
    END
  ), 0::numeric), 2) AS encargos_vitbank,
  ROUND(COALESCE(SUM(
    CASE
      WHEN p.pgto_monetali IS NULL AND p.vcto_monetali < now() THEN
        p.monetali * (COALESCE((SELECT premissas.valor::numeric FROM premissas WHERE premissas.chave = 'multa_atraso' LIMIT 1), 2.0) / 100::numeric)
        + p.monetali * (COALESCE((SELECT premissas.valor::numeric FROM premissas WHERE premissas.chave = 'taxa_juros_dia' LIMIT 1), 0.0) / 100::numeric)
          * GREATEST(0, now()::date - p.vcto_monetali)::numeric
      ELSE 0::numeric
    END
  ), 0::numeric), 2) AS encargos_monetali,
  COUNT(CASE WHEN p.status = 'em_aberto' AND p.deleted_at IS NULL THEN 1 END) AS qtd_em_aberto
FROM clientes c
LEFT JOIN pagamentos_atraso p ON p.cliente_id = c.id AND p.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id;

ALTER VIEW public.clientes_com_totais SET (security_invoker = false);

CREATE OR REPLACE VIEW public.vw_inadimplencia_aberta AS
SELECT
  c.nome AS cliente,
  c.status,
  p.imposto,
  p.valor_compensacao,
  p.valor_inadimplente,
  p.vcto_boleto,
  p.status_planilha,
  p.anotacoes
FROM pagamentos_atraso p
JOIN clientes c ON c.id = p.cliente_id
WHERE p.is_inadimplente = true AND p.valor_inadimplente > 0::numeric
ORDER BY p.valor_inadimplente DESC;

ALTER VIEW public.vw_inadimplencia_aberta SET (security_invoker = false);

CREATE OR REPLACE VIEW public.vw_recuperacao_mensal AS
SELECT
  mes_recuperacao,
  COUNT(*) AS qtd_pagamentos,
  SUM(valor_pago_efetivo) AS total_recuperado,
  SUM(valor_inadimplente) AS total_inadimplente,
  COUNT(DISTINCT cliente_id) AS qtd_clientes
FROM pagamentos_atraso
WHERE mes_recuperacao IS NOT NULL
GROUP BY mes_recuperacao
ORDER BY mes_recuperacao DESC;

ALTER VIEW public.vw_recuperacao_mensal SET (security_invoker = false);

-- =============================================================================
-- 7. Row Level Security
-- =============================================================================

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos_atraso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recuperacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flags_disponiveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flags_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premissas ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 8. RLS Policies
--   Convenção: leitura aberta para authenticated; mutação restrita por role via profiles.
-- =============================================================================

-- clientes
DROP POLICY IF EXISTS clientes_select ON public.clientes;
CREATE POLICY clientes_select ON public.clientes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS clientes_insert ON public.clientes;
CREATE POLICY clientes_insert ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin','financeiro'])
  ));

DROP POLICY IF EXISTS clientes_update ON public.clientes;
CREATE POLICY clientes_update ON public.clientes FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin','financeiro'])
  ));

-- pagamentos_atraso
DROP POLICY IF EXISTS pagamentos_select ON public.pagamentos_atraso;
CREATE POLICY pagamentos_select ON public.pagamentos_atraso FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS pagamentos_insert ON public.pagamentos_atraso;
CREATE POLICY pagamentos_insert ON public.pagamentos_atraso FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin','financeiro'])
  ));

DROP POLICY IF EXISTS pagamentos_update ON public.pagamentos_atraso;
CREATE POLICY pagamentos_update ON public.pagamentos_atraso FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin','financeiro'])
  ));

-- atividades  (atividades_insert é WITH CHECK true — flagged pelo advisor; mantido como está)
DROP POLICY IF EXISTS atividades_select ON public.atividades;
CREATE POLICY atividades_select ON public.atividades FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS atividades_insert ON public.atividades;
CREATE POLICY atividades_insert ON public.atividades FOR INSERT TO authenticated WITH CHECK (true);

-- recuperacoes
DROP POLICY IF EXISTS recuperacoes_select ON public.recuperacoes;
CREATE POLICY recuperacoes_select ON public.recuperacoes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS recuperacoes_insert ON public.recuperacoes;
CREATE POLICY recuperacoes_insert ON public.recuperacoes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin','financeiro'])
  ));

-- flags_disponiveis
DROP POLICY IF EXISTS flags_disp_select ON public.flags_disponiveis;
CREATE POLICY flags_disp_select ON public.flags_disponiveis FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS flags_disp_insert ON public.flags_disponiveis;
CREATE POLICY flags_disp_insert ON public.flags_disponiveis FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin','financeiro'])
  ));

-- flags_cliente
DROP POLICY IF EXISTS flags_cli_select ON public.flags_cliente;
CREATE POLICY flags_cli_select ON public.flags_cliente FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS flags_cli_insert ON public.flags_cliente;
CREATE POLICY flags_cli_insert ON public.flags_cliente FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin','financeiro'])
  ));

DROP POLICY IF EXISTS flags_cli_delete ON public.flags_cliente;
CREATE POLICY flags_cli_delete ON public.flags_cliente FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin','financeiro'])
  ));

-- profiles
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles profiles_1
    WHERE profiles_1.id = auth.uid()
      AND profiles_1.role = 'admin'
  ));

-- premissas
DROP POLICY IF EXISTS premissas_select ON public.premissas;
CREATE POLICY premissas_select ON public.premissas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS premissas_insert ON public.premissas;
CREATE POLICY premissas_insert ON public.premissas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS premissas_update ON public.premissas;
CREATE POLICY premissas_update ON public.premissas FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  ));
