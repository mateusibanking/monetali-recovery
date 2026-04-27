# A3 — `metas` + `sync_log` + `importacoes_manuais` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar 3 tabelas auxiliares (metas, sync_log, importacoes_manuais) com RLS, indexes, triggers, seed inicial de metas e tipos TypeScript pré-gerados.

**Architecture:** Uma migration SQL idempotente (`0004_a3_tabelas_auxiliares.sql`) cria as 3 tabelas independentes com policies adequadas (admin-only para metas, service_role-only para sync_log writes, admin+financeiro para importacoes_manuais). Tipos TS pré-gerados refletem o schema final. Mateus aplica via Dashboard após merge.

**Tech Stack:** Supabase (Postgres 15), TypeScript (Database type inference).

**Spec:** [`docs/superpowers/specs/2026-04-27-a3-tabelas-auxiliares-design.md`](../specs/2026-04-27-a3-tabelas-auxiliares-design.md)

---

## Pré-requisitos

- A1 (PR #2) e A2 (PR #4) **devem** estar pelo menos pushed. Branch de A3 stackeada sobre `feat/a2-contas-a-receber` pra herdar `types.ts` populado de A1+A2. Após A1 e A2 mergearem, A3 será rebaseada.
- `npm install` rodou no repo (build disponível).

## Validação

Sem framework de teste para SQL. Validações:
1. **`npm run build`** após atualizar types.ts.
2. **Visual review do SQL** no PR.
3. **Post-apply diff via MCP** — `mcp__supabase__generate_typescript_types` deve bater com types.ts pré-gerado.

## File Structure

| Caminho | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/0004_a3_tabelas_auxiliares.sql` | Criar | DDL das 3 tabelas + indexes + triggers + RLS + policies + seed metas |
| `src/integrations/supabase/types.ts` | Modificar | Adicionar 3 blocos (`importacoes_manuais`, `metas`, `sync_log`) com Row/Insert/Update/Relationships |

---

## Task 1: Setup da branch

**Files:** nenhum (apenas operação git)

- [ ] **Step 1: Garantir base atualizada**

```bash
cd /c/Users/Mateus/Documents/Cursor/Monetali/Inadimplencia/monetali-recovery
git fetch origin
git checkout feat/a2-contas-a-receber
git pull origin feat/a2-contas-a-receber
```

Expected: branch atualizada, working tree limpo.

- [ ] **Step 2: Criar branch de A3**

```bash
git checkout -b feat/a3-tabelas-auxiliares
git branch --show-current
```

Expected: `feat/a3-tabelas-auxiliares`.

---

## Task 2: Migration 0004

**Files:**
- Create: `supabase/migrations/0004_a3_tabelas_auxiliares.sql`

- [ ] **Step 1: Escrever a migration**

Conteúdo exato do arquivo:

```sql
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
```

- [ ] **Step 2: Validar visualmente**

Conferir:
- 3 `CREATE TABLE IF NOT EXISTS`
- `metas` tem `UNIQUE (tipo, periodo)` + CHECK em `periodo` + CHECK em `valor > 0`
- Seed `metas` usa `ON CONFLICT (tipo, periodo) DO NOTHING`
- `sync_log` só tem policy de SELECT (writes via service_role)
- `importacoes_manuais` tem CHECK em `tipo_destino` (pagamentos_atraso | contas_a_receber)
- 2 indexes (`idx_sync_log_iniciado_em`, `idx_importacoes_iniciado_em`)
- 1 trigger (`trg_metas_updated_at`)
- RLS habilitado nas 3 tabelas

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0004_a3_tabelas_auxiliares.sql
git commit -m "feat(a3): migration 0004 — metas + sync_log + importacoes_manuais

3 tabelas auxiliares com RLS adequada por contexto:
- metas: edição admin-only, seed de 3 linhas (40K mensal, 5K semanal,
  200 diário). UNIQUE(tipo,periodo) garante uma linha por par.
- sync_log: SELECT aberto, escrita só via service_role da Edge Function.
- importacoes_manuais: SELECT aberto, INSERT/UPDATE pra admin+financeiro
  (mesmo perfil que pode importar). DELETE proibido (audit log imutável).

Idempotente — re-aplicar é no-op (IF NOT EXISTS, ON CONFLICT, DROP/CREATE
em policies).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Atualizar `src/integrations/supabase/types.ts`

**Files:**
- Modify: `src/integrations/supabase/types.ts`

3 novos blocos a adicionar dentro do objeto `Tables: {}`. Posições alfabéticas:
- `importacoes_manuais` entre `flags_disponiveis` e `pagamentos_atraso`
- `metas` entre `importacoes_manuais` e `pagamentos_atraso`
- `sync_log` entre `recuperacoes` e o fechamento de `Tables: {}`

- [ ] **Step 1: Adicionar bloco `importacoes_manuais` antes de `pagamentos_atraso`**

Localizar a linha `      pagamentos_atraso: {` no arquivo. Inserir **antes** dela:

```ts
      importacoes_manuais: {
        Row: {
          arquivo_nome: string
          arquivo_tamanho_bytes: number | null
          detalhes: Json
          finalizado_em: string | null
          id: string
          iniciado_em: string
          mapeamento_colunas: Json
          preset: string | null
          qtd_atualizados: number
          qtd_erros: number
          qtd_ignorados: number
          qtd_inseridos: number
          qtd_linhas_planilha: number
          status: string
          tipo_destino: string
          usuario_id: string | null
        }
        Insert: {
          arquivo_nome: string
          arquivo_tamanho_bytes?: number | null
          detalhes?: Json
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          mapeamento_colunas?: Json
          preset?: string | null
          qtd_atualizados?: number
          qtd_erros?: number
          qtd_ignorados?: number
          qtd_inseridos?: number
          qtd_linhas_planilha?: number
          status?: string
          tipo_destino: string
          usuario_id?: string | null
        }
        Update: {
          arquivo_nome?: string
          arquivo_tamanho_bytes?: number | null
          detalhes?: Json
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          mapeamento_colunas?: Json
          preset?: string | null
          qtd_atualizados?: number
          qtd_erros?: number
          qtd_ignorados?: number
          qtd_inseridos?: number
          qtd_linhas_planilha?: number
          status?: string
          tipo_destino?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "importacoes_manuais_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          id: string
          observacao: string | null
          periodo: string
          tipo: string
          updated_at: string
          updated_by: string | null
          valor: number
        }
        Insert: {
          id?: string
          observacao?: string | null
          periodo: string
          tipo: string
          updated_at?: string
          updated_by?: string | null
          valor: number
        }
        Update: {
          id?: string
          observacao?: string | null
          periodo?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
```

- [ ] **Step 2: Adicionar bloco `sync_log` depois de `recuperacoes`**

Localizar o fim do bloco `recuperacoes` no arquivo (a tag de fechamento `      }` antes de `    }` que fecha `Tables`). Inserir o novo bloco entre o fechamento de `recuperacoes` e o `    }` de `Tables`:

```ts
      sync_log: {
        Row: {
          detalhes: Json
          finalizado_em: string | null
          fonte: string
          id: string
          iniciado_em: string
          qtd_atualizados: number
          qtd_erros: number
          qtd_ignorados: number
          qtd_inseridos: number
          qtd_processados: number
          status: string
          triggered_by: string | null
        }
        Insert: {
          detalhes?: Json
          finalizado_em?: string | null
          fonte: string
          id?: string
          iniciado_em?: string
          qtd_atualizados?: number
          qtd_erros?: number
          qtd_ignorados?: number
          qtd_inseridos?: number
          qtd_processados?: number
          status?: string
          triggered_by?: string | null
        }
        Update: {
          detalhes?: Json
          finalizado_em?: string | null
          fonte?: string
          id?: string
          iniciado_em?: string
          qtd_atualizados?: number
          qtd_erros?: number
          qtd_ignorados?: number
          qtd_inseridos?: number
          qtd_processados?: number
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
```

- [ ] **Step 3: Validar build**

```bash
cd /c/Users/Mateus/Documents/Cursor/Monetali/Inadimplencia/monetali-recovery
npm run build 2>&1 | tail -15
```

Expected: build passa, "✓ X modules transformed" + chunks gerados em `dist/`. Sem erros TS.

Se falhar, ler erro com cuidado — provável typo, vírgula faltando, ou bloco mal posicionado.

- [ ] **Step 4: Commit**

```bash
git add src/integrations/supabase/types.ts
git commit -m "feat(a3): tipos TS para metas + sync_log + importacoes_manuais

Pré-gerados refletindo o schema final que 0004 produzirá.
Após apply, validar com generate_typescript_types e abrir PR mínimo de
correção se houver diff (especialmente nomes de FKs gerados pelo Postgres).

Build passa.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Push e abrir PR

**Files:** nenhum (apenas operações git/gh)

- [ ] **Step 1: Push**

```bash
git push -u origin feat/a3-tabelas-auxiliares 2>&1
```

Expected: branch criada no remote.

- [ ] **Step 2: Abrir PR stackeado sobre A2**

```bash
gh pr create --base feat/a2-contas-a-receber --title "feat(a3): metas + sync_log + importacoes_manuais" --body "$(cat <<'EOF'
## Resumo

Terceiro PR da Fase A. Cria 3 tabelas auxiliares: `metas` (jacaré + admin UI), `sync_log` (audit Edge Function), `importacoes_manuais` (audit upload manual).

**Empilhado sobre PR #4 (A2).** Base = \`feat/a2-contas-a-receber\`. Após PR #2 e #4 mergearem pra \`main\`, este PR rebase pra \`main\`.

**Spec:** [docs/superpowers/specs/2026-04-27-a3-tabelas-auxiliares-design.md](https://github.com/mateusibanking/monetali-recovery/blob/docs/spec-a3-tabelas-auxiliares/docs/superpowers/specs/2026-04-27-a3-tabelas-auxiliares-design.md)

**Plano:** [docs/superpowers/plans/2026-04-27-a3-tabelas-auxiliares.md](https://github.com/mateusibanking/monetali-recovery/blob/feat/a3-tabelas-auxiliares/docs/superpowers/plans/2026-04-27-a3-tabelas-auxiliares.md)

## O que entrega

- ✅ \`supabase/migrations/0004_a3_tabelas_auxiliares.sql\` — 3 tabelas + RLS + 2 indexes + 1 trigger + seed de \`metas\`
- ✅ \`src/integrations/supabase/types.ts\` — 3 blocos novos (importacoes_manuais, metas, sync_log)
- ✅ \`npm run build\` passa

## RLS por contexto

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| metas | authenticated | admin | admin | admin |
| sync_log | authenticated | (service_role only) | (service_role only) | (service_role only) |
| importacoes_manuais | authenticated | admin+financeiro | admin+financeiro | (proibido) |

## Como aplicar em produção

1. Mergear PR #2 (A1) e PR #4 (A2) primeiro.
2. Rebasear este PR pra \`main\`, mergear.
3. No Supabase Dashboard → SQL Editor, rodar conteúdo de \`0004_a3_tabelas_auxiliares.sql\`.
4. Verificar seed de metas: \`SELECT * FROM metas WHERE tipo = 'recuperacao'\` → 3 linhas (mensal 40000, semanal 5000, diario 200).
5. Verificar tabelas vazias: \`sync_log\` e \`importacoes_manuais\` retornam 0 linhas.
6. Notificar Claude pra rodar \`generate_typescript_types\` e diff contra \`types.ts\` deste PR.

## Fora deste PR

- **UI de admin pra editar metas** → fase futura (provavelmente depois da Fase E quando o jacaré expor a meta visualmente)
- **Página /sync** → B3
- **Indicador no header** → B4
- **Tela /importacao** → C3
- **Bonus tracking** → fora desta iteração inteira

## Test plan

- [ ] CI / build verde
- [ ] Vercel preview build passa
- [ ] Visual diff no PR confere com spec
- [ ] Após apply: \`SELECT count(*) FROM metas\` = 3
- [ ] Após apply: \`generate_typescript_types\` bate com \`types.ts\` deste PR

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL no output (provavelmente PR #6 ou #7).

---

## Self-Review (run during plan write)

Confirmar antes de finalizar:

- [x] Toda coluna do spec aparece na migration ou em types.ts
- [x] Sem TBD/TODO
- [x] Tipos consistentes:
  - `metas.valor` é `number` (NOT NULL no SQL); `metas.observacao` é `string | null`
  - `sync_log.iniciado_em` é `string` (NOT NULL); `sync_log.finalizado_em` é `string | null`
  - `importacoes_manuais.tipo_destino` é `string` no Insert (required), `string` (não opcional) — bate com NOT NULL no SQL
- [x] Comandos `git`/`gh` exatos
- [x] FK `metas.updated_by → profiles(id)` e `importacoes_manuais.usuario_id → profiles(id)` documentadas em Relationships

## Risks & Mitigations

| Risco | Mitigação |
|---|---|
| Nomes de FK gerados pelo Postgres diferem dos esperados em types.ts | Pós-apply, rodar `generate_typescript_types` e abrir PR mínimo de correção se houver diff |
| Edge Function de B1 esquecer de usar `service_role` e não conseguir escrever em sync_log | Documentado em B1; service_role é env var separada da anon. Erro será óbvio (RLS bloqueia) |
| Mateus aplicar 0004 antes de 0001+0002+0003 | Ordem numérica na pasta deixa óbvio. Cada migration é idempotente, então mesmo aplicar fora de ordem só falha onde há dependência (0004 não depende de 0002/0003) |
| `npm run build` falhar local em outra máquina | Pré-requisito declarado: `npm install` rodou |
