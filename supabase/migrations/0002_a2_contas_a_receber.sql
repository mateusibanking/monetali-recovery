-- A2.1 — Tabela contas_a_receber (títulos a vencer)
--
-- Paridade total de colunas com pagamentos_atraso (facilita migração física quando vence sem pagamento).
-- Status com domínio próprio: aberto | pago | cancelado (sem em_aberto/vencido — esses são do mundo atraso).
-- 3 colunas novas (comentarios, origem_dado, sync_hash) já nascem aqui; em 0003 são adicionadas em pagamentos_atraso.
-- Idempotente.

CREATE TABLE IF NOT EXISTS public.contas_a_receber (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  descricao text,
  valor numeric NOT NULL DEFAULT 0,
  data_vencimento date,
  dias_atraso integer DEFAULT 0,
  status text DEFAULT 'aberto'
    CHECK (status = ANY (ARRAY['aberto','pago','cancelado'])),
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
  -- 3 colunas novas (também adicionadas em pagamentos_atraso via 0003)
  comentarios jsonb NOT NULL DEFAULT '[]'::jsonb,
  origem_dado text,
  sync_hash text,
  --
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente ON public.contas_a_receber USING btree (cliente_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_mes ON public.contas_a_receber USING btree (mes_referencia);
CREATE INDEX IF NOT EXISTS idx_contas_receber_status ON public.contas_a_receber USING btree (status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_data_vencimento ON public.contas_a_receber USING btree (data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_receber_inadimplente ON public.contas_a_receber USING btree (is_inadimplente);
CREATE INDEX IF NOT EXISTS idx_contas_receber_mes_recuperacao ON public.contas_a_receber USING btree (mes_recuperacao);

-- Trigger updated_at (reusa função criada em 0001)
DROP TRIGGER IF EXISTS trg_contas_receber_updated_at ON public.contas_a_receber;
CREATE TRIGGER trg_contas_receber_updated_at
  BEFORE UPDATE ON public.contas_a_receber
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Row Level Security
ALTER TABLE public.contas_a_receber ENABLE ROW LEVEL SECURITY;

-- Policies (mirror de pagamentos_atraso)
DROP POLICY IF EXISTS contas_receber_select ON public.contas_a_receber;
CREATE POLICY contas_receber_select ON public.contas_a_receber FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS contas_receber_insert ON public.contas_a_receber;
CREATE POLICY contas_receber_insert ON public.contas_a_receber FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin','financeiro'])
  ));

DROP POLICY IF EXISTS contas_receber_update ON public.contas_a_receber;
CREATE POLICY contas_receber_update ON public.contas_a_receber FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin','financeiro'])
  ));
