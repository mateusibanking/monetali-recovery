# A2 — `contas_a_receber` + metadados de sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a tabela `contas_a_receber` com paridade total de colunas com `pagamentos_atraso` e adicionar `comentarios JSONB`, `origem_dado`, `sync_hash` em ambas, com backfill `origem_dado='legacy'` nas 2002 linhas existentes.

**Architecture:** Duas migrations SQL idempotentes (`0002` e `0003`) escritas à mão a partir do schema introspectado em A1; tipos TypeScript pré-gerados refletindo o schema final; aplicação em produção pelo Mateus via Dashboard após merge.

**Tech Stack:** Supabase (Postgres 15), TypeScript (Database type inference), Vite/React app.

**Spec:** [`docs/superpowers/specs/2026-04-27-a2-contas-a-receber-design.md`](../specs/2026-04-27-a2-contas-a-receber-design.md)

---

## Pré-requisitos

- A1 (PR #2) deve estar pelo menos pushed (não precisa estar mergeado). Branch de A2 é stackeada sobre `feat/a1-baseline-migration` pra herdar `src/integrations/supabase/types.ts` populado. Após A1 mergear, A2 será rebaseada para `main`.
- Working tree limpo no repo `monetali-recovery`.
- `npm install` já rodou (ferramentas de build disponíveis).

## Validação — sem test framework para DB

Este projeto não tem framework de teste para SQL/migrations. As "validações" deste plano são:

1. **`npm run build`** após atualizar `types.ts` — pega erros de digitação nos tipos TS
2. **Visual review do SQL** no PR — validação humana da semântica
3. **Post-apply diff via MCP** — depois que Mateus aplica, `mcp__supabase__generate_typescript_types` deve bater com o `types.ts` pré-gerado. Qualquer divergência vira PR de correção mínima.

Não há testes unitários a escrever em A2.

## File Structure

| Caminho | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/0002_a2_contas_a_receber.sql` | Criar | DDL da nova tabela `contas_a_receber` (colunas, indexes, trigger, RLS, policies) |
| `supabase/migrations/0003_a2_metadados_sync.sql` | Criar | `ALTER TABLE` pra adicionar `comentarios`, `origem_dado`, `sync_hash` em `pagamentos_atraso`; backfill `origem_dado='legacy'` |
| `src/integrations/supabase/types.ts` | Modificar | Adicionar bloco `contas_a_receber` (Row/Insert/Update/Relationships); estender bloco `pagamentos_atraso` Row/Insert/Update com as 3 novas colunas |

---

## Task 1: Setup da branch

**Files:** nenhum (apenas operação git)

- [ ] **Step 1: Garantir branch base atualizada**

```bash
cd /c/Users/Mateus/Documents/Cursor/Monetali/Inadimplencia/monetali-recovery
git fetch origin
git checkout feat/a1-baseline-migration
git pull origin feat/a1-baseline-migration
```

Expected: working tree limpo, branch atualizada.

- [ ] **Step 2: Criar branch de A2 stackeada sobre A1**

```bash
git checkout -b feat/a2-contas-a-receber
```

Expected: `Switched to a new branch 'feat/a2-contas-a-receber'`. Verificar com `git branch --show-current` → `feat/a2-contas-a-receber`.

---

## Task 2: Migration 0002 — `contas_a_receber`

**Files:**
- Create: `supabase/migrations/0002_a2_contas_a_receber.sql`

- [ ] **Step 1: Escrever a migration**

Conteúdo exato do arquivo `supabase/migrations/0002_a2_contas_a_receber.sql`:

```sql
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
```

- [ ] **Step 2: Validar visualmente**

Conferir manualmente:
- Todas as colunas de `pagamentos_atraso` (do baseline `0001`) presentes — incluindo `dias_atraso`, `juros`, `valor_inadimplente`, `mes_recuperacao`, `data_pagamento_efetivo`, `valor_pago_efetivo`, `motivo`, `is_inadimplente`.
- Status CHECK = `aberto | pago | cancelado`.
- 3 colunas novas presentes (`comentarios jsonb NOT NULL DEFAULT '[]'`, `origem_dado text`, `sync_hash text`).
- 6 indexes criados.
- 1 trigger (apenas `updated_at`).
- 3 policies (SELECT, INSERT, UPDATE).
- Sem trigger `update_dias_atraso` nem `sync_cliente_totais`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_a2_contas_a_receber.sql
git commit -m "feat(a2): migration 0002 — tabela contas_a_receber

Cria contas_a_receber com paridade total de colunas com pagamentos_atraso
(facilita migração física em B2 quando vence sem pagamento). Status com
domínio próprio (aberto|pago|cancelado). 3 colunas novas já nascem aqui:
comentarios JSONB, origem_dado, sync_hash. Indexes, trigger updated_at,
RLS habilitado e 3 policies (SELECT aberto, INSERT/UPDATE admin+financeiro).

Não aplica triggers update_dias_atraso nem sync_cliente_totais — esses
pertencem ao mundo atraso e populam quando a linha migra para
pagamentos_atraso.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Migration 0003 — metadados de sync em `pagamentos_atraso`

**Files:**
- Create: `supabase/migrations/0003_a2_metadados_sync.sql`

- [ ] **Step 1: Escrever a migration**

Conteúdo exato do arquivo `supabase/migrations/0003_a2_metadados_sync.sql`:

```sql
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
```

- [ ] **Step 2: Validar visualmente**

Conferir:
- 3 ALTER TABLE com `IF NOT EXISTS`.
- `comentarios` é `NOT NULL DEFAULT '[]'::jsonb` (PG11+ trata como metadata change, não rewrite).
- `origem_dado` e `sync_hash` ficam nullable (sem CHECK) — flexibilidade pra fontes futuras.
- UPDATE de backfill tem `WHERE origem_dado IS NULL` (idempotente — re-run vira no-op).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_a2_metadados_sync.sql
git commit -m "feat(a2): migration 0003 — comentarios/origem_dado/sync_hash em pagamentos_atraso

Adiciona 3 colunas em pagamentos_atraso (contas_a_receber já tinha desde 0002):
- comentarios JSONB DEFAULT '[]' — campo protegido pra futura UI de comentários
- origem_dado text — provenance do dado (sync, import manual, etc.)
- sync_hash text — usado por B1 (sync Google Sheets) pra UPSERT idempotente

Backfill: 2002 linhas existentes recebem origem_dado='legacy'. Operação
idempotente (WHERE IS NULL); pode ser re-rodada à vontade.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Atualizar `src/integrations/supabase/types.ts`

**Files:**
- Modify: `src/integrations/supabase/types.ts`

A modificação tem duas partes:
1. Estender o bloco `pagamentos_atraso` Row/Insert/Update com as 3 novas colunas.
2. Adicionar bloco completo `contas_a_receber` (Row/Insert/Update/Relationships).

- [ ] **Step 1: Adicionar 3 colunas em `pagamentos_atraso`**

No arquivo `src/integrations/supabase/types.ts`, localizar o bloco `pagamentos_atraso:` (criado em A1) e adicionar `comentarios`, `origem_dado`, `sync_hash` em **três** objetos: `Row`, `Insert`, `Update`. Inserir alfabeticamente para manter consistência com o estilo do gerador.

Em `Row` (não-opcionais, refletem o que vem do DB; `comentarios` é NOT NULL, os outros dois são nullable):

```ts
        Row: {
          anotacoes: string | null
          boleto_vitbank: number | null
          cliente_id: string
          comentarios: Json
          // ... existentes ...
          origem_dado: string | null
          // ... existentes ...
          sync_hash: string | null
          // ... existentes ...
        }
```

Em `Insert` (todos opcionais por causa dos defaults):

```ts
        Insert: {
          // ... existentes ...
          comentarios?: Json
          // ... existentes ...
          origem_dado?: string | null
          // ... existentes ...
          sync_hash?: string | null
          // ... existentes ...
        }
```

Em `Update` (idem):

```ts
        Update: {
          // ... existentes ...
          comentarios?: Json
          // ... existentes ...
          origem_dado?: string | null
          // ... existentes ...
          sync_hash?: string | null
          // ... existentes ...
        }
```

Posições alfabéticas exatas dentro do bloco `pagamentos_atraso`:
- `comentarios` entre `cliente_id` e `created_at`
- `origem_dado` entre `motivo` e `pgto_boleto`
- `sync_hash` entre `status_planilha` e `updated_at`

- [ ] **Step 2: Adicionar bloco `contas_a_receber`**

Localizar o final do bloco `clientes` (último FK que ele referencia + fechamento `}`). Adicionar o bloco `contas_a_receber` **antes** de `flags_cliente` (mantém ordem alfabética que o gerador usa).

```ts
      contas_a_receber: {
        Row: {
          anotacoes: string | null
          boleto_vitbank: number | null
          cliente_id: string
          comentarios: Json
          created_at: string | null
          data_cobranca: string | null
          data_pagamento: string | null
          data_pagamento_efetivo: string | null
          data_vencimento: string | null
          deleted_at: string | null
          descricao: string | null
          dias_atraso: number | null
          faturamento_ref: string | null
          forma_pagamento: string | null
          id: string
          imposto: string | null
          is_inadimplente: boolean | null
          juros: number | null
          mes_recuperacao: string | null
          mes_referencia: string | null
          monetali: number | null
          motivo: string | null
          origem_dado: string | null
          pgto_boleto: string | null
          pgto_monetali: string | null
          pgto_pix: string | null
          pgto_vitbank: string | null
          pix_monetali: number | null
          status: string | null
          status_planilha: string | null
          sync_hash: string | null
          updated_at: string | null
          valor: number
          valor_compensacao: number | null
          valor_inadimplente: number | null
          valor_pago_efetivo: number | null
          valor_pago_monetali: number | null
          valor_pago_vitbank: number | null
          vcto_boleto: string | null
          vcto_monetali: string | null
          vcto_pix: string | null
          vcto_vitbank: string | null
          vitbank: number | null
        }
        Insert: {
          anotacoes?: string | null
          boleto_vitbank?: number | null
          cliente_id: string
          comentarios?: Json
          created_at?: string | null
          data_cobranca?: string | null
          data_pagamento?: string | null
          data_pagamento_efetivo?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          descricao?: string | null
          dias_atraso?: number | null
          faturamento_ref?: string | null
          forma_pagamento?: string | null
          id?: string
          imposto?: string | null
          is_inadimplente?: boolean | null
          juros?: number | null
          mes_recuperacao?: string | null
          mes_referencia?: string | null
          monetali?: number | null
          motivo?: string | null
          origem_dado?: string | null
          pgto_boleto?: string | null
          pgto_monetali?: string | null
          pgto_pix?: string | null
          pgto_vitbank?: string | null
          pix_monetali?: number | null
          status?: string | null
          status_planilha?: string | null
          sync_hash?: string | null
          updated_at?: string | null
          valor?: number
          valor_compensacao?: number | null
          valor_inadimplente?: number | null
          valor_pago_efetivo?: number | null
          valor_pago_monetali?: number | null
          valor_pago_vitbank?: number | null
          vcto_boleto?: string | null
          vcto_monetali?: string | null
          vcto_pix?: string | null
          vcto_vitbank?: string | null
          vitbank?: number | null
        }
        Update: {
          anotacoes?: string | null
          boleto_vitbank?: number | null
          cliente_id?: string
          comentarios?: Json
          created_at?: string | null
          data_cobranca?: string | null
          data_pagamento?: string | null
          data_pagamento_efetivo?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          descricao?: string | null
          dias_atraso?: number | null
          faturamento_ref?: string | null
          forma_pagamento?: string | null
          id?: string
          imposto?: string | null
          is_inadimplente?: boolean | null
          juros?: number | null
          mes_recuperacao?: string | null
          mes_referencia?: string | null
          monetali?: number | null
          motivo?: string | null
          origem_dado?: string | null
          pgto_boleto?: string | null
          pgto_monetali?: string | null
          pgto_pix?: string | null
          pgto_vitbank?: string | null
          pix_monetali?: number | null
          status?: string | null
          status_planilha?: string | null
          sync_hash?: string | null
          updated_at?: string | null
          valor?: number
          valor_compensacao?: number | null
          valor_inadimplente?: number | null
          valor_pago_efetivo?: number | null
          valor_pago_monetali?: number | null
          valor_pago_vitbank?: number | null
          vcto_boleto?: string | null
          vcto_monetali?: string | null
          vcto_pix?: string | null
          vcto_vitbank?: string | null
          vitbank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_a_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_a_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_com_totais"
            referencedColumns: ["id"]
          },
        ]
      }
```

Observação sobre o nome da FK: Postgres gera `<tabela>_<coluna>_fkey` por padrão quando a constraint não tem nome explícito. Como `0002` declara `cliente_id uuid NOT NULL REFERENCES public.clientes(id)` sem `CONSTRAINT <nome>`, o nome final será `contas_a_receber_cliente_id_fkey`. Se a regen pós-apply mostrar nome diferente, ajustar aqui.

- [ ] **Step 3: Validar build**

```bash
cd /c/Users/Mateus/Documents/Cursor/Monetali/Inadimplencia/monetali-recovery
npm run build 2>&1 | tail -30
```

Expected: build passa, "✓ X modules transformed" + chunks gerados em `dist/`. Sem erros TS.

Se falhar com erro de tipo, ler a mensagem cuidadosamente — provavelmente é um campo digitado errado ou faltando vírgula.

- [ ] **Step 4: Commit**

```bash
git add src/integrations/supabase/types.ts
git commit -m "feat(a2): tipos TS para contas_a_receber + 3 colunas novas em pagamentos_atraso

Pré-gerados à mão refletindo o schema final que 0002+0003 produzirão.
Após Mateus aplicar via Dashboard, validar com generate_typescript_types
e abrir PR de correção mínima se houver diff (especialmente nome da FK).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Push e abrir PR

**Files:** nenhum (apenas operações git/gh)

- [ ] **Step 1: Push da branch**

```bash
git push -u origin feat/a2-contas-a-receber 2>&1
```

Expected: branch criada no remote, link pra abrir PR no output.

- [ ] **Step 2: Abrir PR**

```bash
gh pr create --title "feat(a2): contas_a_receber + metadados de sync" --body "$(cat <<'EOF'
## Resumo

Segundo PR da Fase A. Cria a tabela `contas_a_receber` para títulos a vencer e adiciona `comentarios JSONB`, `origem_dado`, `sync_hash` em `pagamentos_atraso`.

**Spec:** [`docs/superpowers/specs/2026-04-27-a2-contas-a-receber-design.md`](../blob/feat/a2-contas-a-receber/docs/superpowers/specs/2026-04-27-a2-contas-a-receber-design.md)

**Plano:** [`docs/superpowers/plans/2026-04-27-a2-contas-a-receber.md`](../blob/feat/a2-contas-a-receber/docs/superpowers/plans/2026-04-27-a2-contas-a-receber.md)

## O que entrega

- ✅ `supabase/migrations/0002_a2_contas_a_receber.sql` — nova tabela com paridade total de colunas + 6 indexes + trigger updated_at + RLS + 3 policies
- ✅ `supabase/migrations/0003_a2_metadados_sync.sql` — 3 colunas novas em `pagamentos_atraso` + backfill `origem_dado='legacy'` nas 2002 linhas existentes
- ✅ `src/integrations/supabase/types.ts` — pré-gerado refletindo schema final
- ✅ `npm run build` passa

Ambas as migrations idempotentes (`IF NOT EXISTS`, backfill com `WHERE IS NULL`).

## Decisão de design

`contas_a_receber` tem **as mesmas colunas** de `pagamentos_atraso` + as 3 novas. Quando uma linha vence sem pagamento, B2 (Edge Function + pg_cron) faz `INSERT INTO pagamentos_atraso SELECT * FROM contas_a_receber WHERE id = X` com transformação só de status. Histórico preservado, zero perda de campos.

## Como aplicar em produção

1. Mergear este PR.
2. No Supabase Dashboard → SQL Editor, rodar conteúdo de `0002_a2_contas_a_receber.sql`.
3. Em seguida, rodar `0003_a2_metadados_sync.sql`.
4. Verificar backfill: `SELECT count(*) FROM pagamentos_atraso WHERE origem_dado = 'legacy'` → deve retornar 2002.
5. Verificar tabela nova: `SELECT count(*) FROM contas_a_receber` → 0 (esperado, nasce vazia).
6. Notificar Claude pra rodar `generate_typescript_types` e diff contra `types.ts` deste PR.

## Fora deste PR (deferido)

- Job de migração `contas_a_receber → pagamentos_atraso` quando vence → **B2** (pg_cron + Edge Function)
- View unificada AR + Inadimplentes no cadastro do cliente → **Fase D**
- Tipar `client.ts` com `createClient<Database>` → follow-up de toda Fase A
- CHECK constraint em `origem_dado` → adicionada quando domínio estabilizar (após B1+C1)

## Test plan

- [ ] CI/Vercel preview build passa
- [ ] Visual diff no PR confere com spec
- [ ] Após apply: `count(*) FROM pagamentos_atraso WHERE origem_dado = 'legacy' = 2002`
- [ ] Após apply: `mcp__supabase__generate_typescript_types` bate com `types.ts` deste PR

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL no output (algo como `https://github.com/mateusibanking/monetali-recovery/pull/4`).

- [ ] **Step 3: Atualizar memória**

Atualizar `C:/Users/Mateus/.claude/projects/c--Users-Mateus-Documents-Cursor-Monetali-Inadimplencia/memory/project_monetali_recovery_v2.md` adicionando linha sobre A2 entregue (PR #X aberto). E `MEMORY.md` se ainda não houver pointer atualizado.

---

## Self-Review (post-write check)

Após escrever o plano, reler e conferir:

- [ ] Cada coluna mencionada na spec aparece em alguma migration ou no `types.ts`
- [ ] Nenhum "TBD" ou "TODO" remanescente
- [ ] Tipos consistentes (campo `comentarios` é `Json` em todos os blocos, não `Json | null`)
- [ ] Comandos `git` e `gh` exatos, sem placeholder
- [ ] Numeração de migrations sequencial (`0001` baseline, `0002` table, `0003` cols)

## Risks & Mitigations

| Risco | Mitigação |
|---|---|
| Nome da FK gerado pelo Postgres difere do esperado em `types.ts` | Pós-apply, rodar `generate_typescript_types` e abrir PR pequeno de correção se necessário |
| Algum hook React existente faz query em `pagamentos_atraso` SEM passar tipos genéricos → não quebra build mas perde type safety nas 3 colunas novas | OK por enquanto — `client.ts` é `any`. Quando tipar o client (follow-up), tipos vão se propagar |
| Mateus aplicar `0003` antes de `0002` | Numeração explícita resolve; `0003` não depende de `0002` (são em tabelas diferentes), então ordem na prática não quebra. Mas instrução do PR pede ordem correta |
| `npm run build` falhar local em outra máquina | Plano assume `npm install` já rodou (pré-requisito declarado no topo) |
