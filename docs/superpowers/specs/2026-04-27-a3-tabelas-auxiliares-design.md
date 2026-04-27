# A3 — `metas`, `sync_log`, `importacoes_manuais`

**Data:** 2026-04-27
**Autor:** Mateus + Claude
**Status:** Aguardando revisão
**Fase:** A — Fundação (Recovery Incremental)
**Master spec:** [`2026-04-27-recovery-incremental.md`](2026-04-27-recovery-incremental.md)

---

## 1. Contexto

A1 entregou baseline. A2 entregou `contas_a_receber` + metadados de sync. Falta criar 3 tabelas auxiliares que dão suporte às fases seguintes:

- `metas` — meta de recuperação (mensal/semanal/diária). Fonte da meta no gráfico jacaré da Fase E.
- `sync_log` — audit log da Edge Function de sync (B1+B2). Alimenta a página `/sync` (B3) e o indicador no header (B4).
- `importacoes_manuais` — audit log de uploads manuais de planilha (C1). Alimenta a tela de histórico de imports (C3).

São 3 tabelas independentes, agrupadas em A3 porque são pequenas, têm o mesmo nível de risco (zero impacto em queries existentes) e habilitam B/C/E sem trabalho adicional de schema mais tarde.

## 2. `metas`

### 2.1. Estrutura

```sql
CREATE TABLE public.metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  periodo text NOT NULL CHECK (periodo IN ('diario','semanal','mensal')),
  valor numeric NOT NULL CHECK (valor > 0),
  observacao text,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, periodo)
);
```

**Modelo:** uma linha por `(tipo, periodo)`. UI de admin edita em vez de criar nova. Sem `mes_referencia` — as metas valem "no agora". Histórico de mudanças fica via `updated_at`/`updated_by`. Versionamento completo (tabela `metas_historico`) é deferido até precisar.

`tipo` sem CHECK constraint deliberadamente — começa só com `'recuperacao'`, mas pode crescer (`cobranca`, `arrecadacao`, etc.) sem nova migration.

### 2.2. Seed inicial

Aplicado via `INSERT ... ON CONFLICT DO NOTHING` na própria migration (idempotente):

```sql
INSERT INTO public.metas (tipo, periodo, valor) VALUES
  ('recuperacao', 'mensal',  40000),
  ('recuperacao', 'semanal',  5000),
  ('recuperacao', 'diario',    200)
ON CONFLICT (tipo, periodo) DO NOTHING;
```

Mateus pode editar via UI quando ela existir; valores acima são ponto de partida.

### 2.3. RLS

| Comando | Roles | Condição |
|---|---|---|
| SELECT | `authenticated` | `USING (true)` |
| INSERT | `authenticated` | `WITH CHECK (role = 'admin')` |
| UPDATE | `authenticated` | `USING (role = 'admin')` |
| DELETE | `authenticated` | `USING (role = 'admin')` |

### 2.4. Trigger

`trg_metas_updated_at` — `BEFORE UPDATE ... EXECUTE FUNCTION public.update_updated_at()` (reutiliza a função de A1).

## 3. `sync_log`

### 3.1. Estrutura

```sql
CREATE TABLE public.sync_log (
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
```

**Modelo:** uma linha por execução do sync. Edge Function (B1) cria com `status='rodando'`, atualiza no fim. `detalhes` JSONB acomoda erros, warnings, samples sem inflar o schema. `triggered_by` aceita formatos como `'cron'` ou `'manual:<user_id>'`.

### 3.2. Index

```sql
CREATE INDEX idx_sync_log_iniciado_em ON public.sync_log USING btree (iniciado_em DESC);
```

`/sync` (B3) lista as últimas N execuções por `iniciado_em DESC`. Index resolve.

### 3.3. RLS

| Comando | Roles | Condição |
|---|---|---|
| SELECT | `authenticated` | `USING (true)` |
| INSERT/UPDATE/DELETE | (sem policy) | Edge Functions usam `service_role`, que **bypassa RLS**. Nenhum role autenticado tem permissão de escrita direta — preserva integridade do audit log. |

## 4. `importacoes_manuais`

### 4.1. Estrutura

```sql
CREATE TABLE public.importacoes_manuais (
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
```

**Modelo:** uma linha por upload (C1). Frontend cria a linha em `processando` antes do loop de UPSERT, atualiza com contadores no fim. `mapeamento_colunas` guarda o mapeamento usado (`{ "Cliente": "nome", "Vencimento": "data_vencimento", ... }`) — útil para repetir sem refazer.

`tipo_destino` enforce que o usuário escolheu pra qual tabela está importando (atrasados vs a receber). CHECK previne typo.

### 4.2. Sem storage de arquivo

A planilha .xlsx **não** é guardada — só metadados. Reprocessar exige re-upload. Mantém DB enxuto e evita configurar Supabase Storage agora. Se virar requisito (auditoria, recompute), revisita em fase futura.

### 4.3. Index

```sql
CREATE INDEX idx_importacoes_iniciado_em ON public.importacoes_manuais USING btree (iniciado_em DESC);
```

### 4.4. RLS

| Comando | Roles | Condição |
|---|---|---|
| SELECT | `authenticated` | `USING (true)` |
| INSERT | `authenticated` | `WITH CHECK (role IN ('admin','financeiro'))` |
| UPDATE | `authenticated` | `USING (role IN ('admin','financeiro'))` (frontend atualiza após loop) |
| DELETE | (sem policy) | Audit log imutável. |

## 5. Migrations

Um único arquivo:

`supabase/migrations/0004_a3_tabelas_auxiliares.sql`

Conteúdo: as 3 tabelas + indexes + triggers + RLS + policies + seed de `metas`. Idempotente (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DROP POLICY IF EXISTS / CREATE POLICY`, `INSERT ... ON CONFLICT DO NOTHING`).

Por que um arquivo só (e não três): tabelas são pequenas, independentes, sem dependências entre si — separar em `0004_metas.sql`, `0005_sync_log.sql`, `0006_importacoes.sql` seria ruído de versionamento sem ganho real.

## 6. Tipos TypeScript

`src/integrations/supabase/types.ts` é estendido com 3 novos blocos (`metas`, `sync_log`, `importacoes_manuais`) com Row/Insert/Update/Relationships. Mesmo processo de A2: pré-gerado à mão no PR; após apply, `mcp__supabase__generate_typescript_types` valida e PR mínimo de correção se houver diff.

## 7. Critério de aceite

| # | Critério | Como validar |
|---|----------|--------------|
| 1 | Migration `0004` escrita e idempotente | Review do PR |
| 2 | `npm run build` passa | CI / preview Vercel verde |
| 3 | Apply no Dashboard sem erro | Mateus copia/cola SQL e roda |
| 4 | Seed de metas presente | `SELECT count(*) FROM metas WHERE tipo = 'recuperacao'` retorna 3 |
| 5 | RLS funciona em cada tabela | Teste com role `viewer` (só read), `financeiro` (read+import), `admin` (tudo, inclusive editar metas) |
| 6 | Re-introspect bate com types.ts pré-gerado | `mcp__supabase__generate_typescript_types` + diff |

## 8. Fora de A3

- **Histórico completo de mudanças em `metas`** (tabela `metas_historico`) — defere até virar requisito real
- **Storage do .xlsx em `importacoes_manuais`** — defere até virar requisito (Supabase Storage + lifecycle policies)
- **Bonus tracking** (Bônus 1/2/3 + diário R$200 + semanal R$5K) — fora desta iteração; quando voltar, vira `bonus_recebimentos` ou similar, não inflar `metas`
- **CHECK constraint em `tipo` de `metas`** — adicionar quando o domínio estabilizar (pós-uso real)
- **Hooks de UI / páginas** (`/sync`, `/importacao`, edição de metas) — pertencem às fases B, C e E

## 9. Riscos e mitigação

| # | Risco | Severidade | Mitigação |
|---|-------|------------|-----------|
| 1 | Edge Function não conseguir escrever em `sync_log` se RLS estiver mal configurado | Alto | `service_role` bypassa RLS por design no Supabase. Confirmar variável de ambiente `SUPABASE_SERVICE_ROLE_KEY` (e não a `anon`) na Edge Function. Documentar em B1. |
| 2 | Frontend de import (C1) tentar atualizar `importacoes_manuais` com role insuficiente | Médio | Policies INSERT/UPDATE permitem `admin` e `financeiro`. Se outro role tentar importar, RLS bloqueia (esperado — só esses dois roles têm permissão pra importar). |
| 3 | Seed de `metas` rodar duas vezes e duplicar | Baixo | `ON CONFLICT (tipo, periodo) DO NOTHING` torna idempotente. |
| 4 | Janela de deploy 10-15 cair antes de A3 mergear | Baixo | A3 é PR pequeno; visa mergear até dia 6 ou após dia 16. |

## 10. Referências externas

- **Planilha de inadimplência atual:** `c:/Users/Mateus/Documents/Cursor/Monetali/Inadimplencia/Inadimplência - até 23-04-2026.xlsx` — modelo estrutural que guiará o `mapeamento_colunas` quando C1 (preset VitBank) e B1 (sync Google Sheets) forem implementadas. Não usado em A3 diretamente; ficar acessível no momento certo evita perder tempo.

## 11. Próximos passos

1. Mateus revisa este spec.
2. Após aprovação, invocar `writing-plans` para gerar plano de execução detalhado.
3. Implementação: branch `feat/a3-tabelas-auxiliares` a partir de `feat/a2-contas-a-receber` (stack) ou de `main` se A1+A2 já mergearam.
4. PR abre com SQL + types.ts + nota pra Mateus aplicar via Dashboard.
