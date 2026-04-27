# A2 — `contas_a_receber` + metadados de sync

**Data:** 2026-04-27
**Autor:** Mateus + Claude
**Status:** Aguardando revisão
**Fase:** A — Fundação (Recovery Incremental)
**Master spec:** [`2026-04-27-recovery-incremental.md`](2026-04-27-recovery-incremental.md)

---

## 1. Contexto

A1 entregou baseline migration + tipos TS reais. O introspect confirmou o que o master spec antecipou: a tabela `pagamentos_atraso` só abriga títulos vencidos/em atraso. As Fases B (sync), D (view unificada AR + Inadimplentes) e E (gráfico jacaré) precisam de **títulos a vencer** como cidadãos de primeira classe — eles são a base da projeção de "contas a entrar por mês" e do aviso "vence em N dias".

A2 cria essa base.

## 2. Decisão de modelo

**Duas tabelas separadas.** `pagamentos_atraso` continua exclusiva para vencidos. Nasce uma nova tabela `contas_a_receber` para títulos a vencer. Quando uma linha em `contas_a_receber` passa do vencimento sem pagamento identificado, **migra fisicamente** para `pagamentos_atraso` (job em B2). Quando paga antes do vencimento, fica em `contas_a_receber` com `status='pago'`.

**Por que não uma tabela só com flag.** Considerada e descartada — o domínio de status é diferente entre os dois mundos, e a separação ajuda a manter contagens, projeções e relatórios sem precisar filtrar todo lugar por flag. A migração física resolve a "transição de natureza" do título.

**Por que paridade total de colunas entre as duas tabelas.** Dois motivos:
1. **Migração trivial** — quando vence sem pagamento, `INSERT INTO pagamentos_atraso SELECT * FROM contas_a_receber WHERE id = X` (com transformação só de `status`). Histórico preservado.
2. **Reports simétricos** — frontend e queries de relatório usam mesmos nomes de coluna em ambas as tabelas. Reduz fricção cognitiva e duplicação de código.

## 3. Schema — `contas_a_receber`

### 3.1. Estrutura

**Mesmo conjunto de colunas de `pagamentos_atraso`** (paridade total) **+ as 3 novas de §4** (`comentarios`, `origem_dado`, `sync_hash`). Diferenças comportamentais e de domínio:

- `status` tem domínio próprio: `aberto | pago | cancelado` (sem `em_aberto` / `vencido` / `parcial`, que são do mundo atraso).
- `is_inadimplente` nasce e fica `false` até a migração para `pagamentos_atraso`.
- Colunas pós-vencimento (`dias_atraso`, `juros`, `valor_inadimplente`, `mes_recuperacao`, `data_pagamento_efetivo`, `valor_pago_efetivo`, `motivo`) existem por paridade mas ficam zeradas/NULL — só serão populadas se a linha migrar.

### 3.2. Constraints

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `cliente_id uuid NOT NULL REFERENCES public.clientes(id)`
- `valor numeric NOT NULL DEFAULT 0`
- `status text DEFAULT 'aberto' CHECK (status = ANY (ARRAY['aberto','pago','cancelado']))`

### 3.3. Indexes

Mirror dos índices de `pagamentos_atraso` + um novo:

| Index | Colunas | Justificativa |
|---|---|---|
| `idx_contas_receber_cliente` | `cliente_id` | joins com clientes |
| `idx_contas_receber_mes` | `mes_referencia` | agrupamento por mês (Fase D) |
| `idx_contas_receber_status` | `status` | filtros |
| `idx_contas_receber_data_vencimento` | `data_vencimento` | "vence em N dias" + job de migração B2 |
| `idx_contas_receber_inadimplente` | `is_inadimplente` | paridade (não usado por enquanto) |
| `idx_contas_receber_mes_recuperacao` | `mes_recuperacao` | paridade (não usado por enquanto) |

### 3.4. Triggers

- `trg_contas_receber_updated_at` — `BEFORE UPDATE ... EXECUTE FUNCTION public.update_updated_at()`
- **Não** aplicamos `update_dias_atraso` (incrementaria indevidamente).
- **Não** aplicamos `sync_cliente_totais` (mantém `clientes.valor_total_atraso` etc. agregando só `pagamentos_atraso` — view unificada vem em D).

### 3.5. Row Level Security

Mirror das policies de `pagamentos_atraso`:

| Comando | Roles | Condição |
|---|---|---|
| SELECT | `authenticated` | `USING (true)` |
| INSERT | `authenticated` | `WITH CHECK (role IN ('admin','financeiro'))` via subquery em `profiles` |
| UPDATE | `authenticated` | `USING (role IN ('admin','financeiro'))` |
| DELETE | (sem policy) | `authenticated` não pode deletar — só soft-delete via `deleted_at` |

## 4. Schema — colunas novas em ambas as tabelas

Adicionadas em `pagamentos_atraso` E em `contas_a_receber` (essa segunda já nasce com elas):

### 4.1. `comentarios JSONB DEFAULT '[]'::jsonb`

Schema esperado do conteúdo (não enforced por CHECK, validação fica na app):

```json
[
  { "author": "string (email ou full_name)",
    "body": "string (texto do comentário)",
    "created_at": "ISO 8601 timestamp" }
]
```

**Campo protegido.** Sync da planilha (B1) e import manual (C1) **nunca** sobrescrevem. Só UI grava (via PATCH explícito).

### 4.2. `origem_dado text` (sem DEFAULT)

Valores conhecidos:

| Valor | Significado |
|---|---|
| `google_sheets` | criado/atualizado pelo sync diário (B1) |
| `vitbank_xlsx` | criado por upload manual da planilha do Kevin (C1) |
| `manual` | criado direto pela UI |
| `legacy` | linhas pré-existentes em `pagamentos_atraso` (backfill em A2) |

Sem CHECK constraint para deixar flexível adicionar novas fontes sem migration.

**Backfill em A2:** `UPDATE pagamentos_atraso SET origem_dado = 'legacy' WHERE origem_dado IS NULL` — atinge as 2002 linhas atuais.

`contas_a_receber` nasce vazia. Não tem backfill.

### 4.3. `sync_hash text` (sem DEFAULT)

Hash SHA-256 do payload bruto da linha de origem. Usado por B1 (sync) para UPSERT idempotente:

- Se hash da linha recebida == hash gravado → skip (linha não mudou na fonte).
- Se diferente → UPDATE respeitando campos protegidos.

Sem index nesta migration. B1 decide se o UPSERT precisa de `idx_..._sync_hash` quando for implementado.

NULL para linhas legacy. B1 calcula e popula no primeiro sync.

### 4.4. Campos protegidos — definição operacional

Lista enforced via **convenção** (não via DDL — RLS não consegue restringir por coluna em PostgreSQL diretamente sem trigger). Documentada aqui e replicada nas Edge Functions / hooks que fazem write:

- `comentarios`
- `flags` (gerenciadas em `flags_cliente`, não em colunas)
- `status` (cobrança/negociação — coluna existente)
- `anotacoes`
- registros em `atividades` (tabela à parte)

Sync e import **nunca** tocam esses campos. Quando atualizam uma linha existente, fazem `UPDATE pagamentos_atraso SET <campos do source> WHERE id = ...` listando explicitamente as colunas que vêm da fonte — campos protegidos não entram no SET.

## 5. Migrations e arquivos

Dois arquivos sequenciais em `supabase/migrations/`:

### 5.1. `0002_a2_contas_a_receber.sql`

- `CREATE TABLE IF NOT EXISTS public.contas_a_receber` com todas as colunas de `pagamentos_atraso` + as 3 novas (`comentarios`, `origem_dado`, `sync_hash`)
- 6 indexes (§3.3)
- Trigger `trg_contas_receber_updated_at` (drop-create)
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- 3 policies (SELECT, INSERT, UPDATE) — DROP IF EXISTS + CREATE

### 5.2. `0003_a2_metadados_sync.sql`

- `ALTER TABLE public.pagamentos_atraso ADD COLUMN IF NOT EXISTS comentarios jsonb NOT NULL DEFAULT '[]'::jsonb`
- `ALTER TABLE public.pagamentos_atraso ADD COLUMN IF NOT EXISTS origem_dado text`
- `ALTER TABLE public.pagamentos_atraso ADD COLUMN IF NOT EXISTS sync_hash text`
- `UPDATE public.pagamentos_atraso SET origem_dado = 'legacy' WHERE origem_dado IS NULL` (backfill)
- (Não toca `contas_a_receber` aqui — ela já nasce com as 3 colunas em `0002`)

Ambos idempotentes. Ordem de aplicação: `0002` antes de `0003` (mas como nenhum depende do outro estritamente, são independentes na prática).

## 6. Tipos TypeScript

`src/integrations/supabase/types.ts` é **pré-gerado à mão** no PR refletindo o schema final que o SQL produzirá. Validações:

1. `npm run build` continua passando (tipos são checagem build-time isolada — tipo de tabela que ainda não existe no DB não quebra o build).
2. Após Mateus aplicar via Dashboard, eu rodo `mcp__supabase__generate_typescript_types` e diff contra o pré-gerado. Se houver divergência (campo esquecido, tipo errado), abro PR de correção.

`src/integrations/supabase/client.ts` segue como `any` (mesma decisão de A1). Tipar consumo é follow-up depois que A1+A2+A3 estabilizarem.

## 7. Critério de aceite

| # | Critério | Como validar |
|---|----------|--------------|
| 1 | Migrations 0002 e 0003 escritas e idempotentes | Review do PR + ler comentário do header |
| 2 | `npm run build` passa | CI / preview Vercel verde |
| 3 | Aplicação no Dashboard sem erro | Mateus copia/cola SQL e roda no SQL Editor |
| 4 | Backfill atinge 2002 linhas | `SELECT count(*) FROM pagamentos_atraso WHERE origem_dado = 'legacy'` retorna 2002 |
| 5 | Re-introspect bate com types.ts pré-gerado | `mcp__supabase__generate_typescript_types` + diff |
| 6 | RLS funciona em `contas_a_receber` | Teste com role `viewer` (read-only), `financeiro` (CRUD), `admin` (CRUD) |

## 8. Fora de A2 (deferido)

- **Job de migração `contas_a_receber → pagamentos_atraso`** quando vence sem pagamento → entra em **B2** (pg_cron + Edge Function ou pg_cron puro).
- **View unificada** `vw_cliente_titulos` agregando AR + Inadimplentes → **Fase D (D1)**.
- **Indicador agregado** `valor_total_a_receber` em `clientes` → Fase D (decidir se vira coluna materializada com trigger ou só view).
- **Index em `sync_hash`** → criado em B1 se a query de UPSERT precisar.
- **Tipar `client.ts`** com `createClient<Database>` → follow-up depois de Fase A inteira.
- **CHECK constraint em `origem_dado`** → adicionada quando o domínio estabilizar (provavelmente após B1 + C1).

## 9. Riscos e mitigação

| # | Risco | Severidade | Mitigação |
|---|-------|------------|-----------|
| 1 | Backfill `origem_dado='legacy'` falhar parcialmente | Baixo | Idempotente (`WHERE origem_dado IS NULL`). Mateus pode re-rodar à vontade. |
| 2 | Aplicar `0002` em produção e schema não bater com `types.ts` pré-gerado | Médio | Pós-apply, rodar `generate_typescript_types` e diff antes de fechar A2. PR de correção minúscula se houver diff. |
| 3 | Convenção de "campos protegidos" violada por código futuro (B1, C1) | Médio | Code review + checklist no PR de B1/C1. Considerar trigger guard como reforço se virar problema recorrente. |
| 4 | Janela de deploy 10-15 cair antes de A2 mergear | Alto | A2 é PR pequeno; visa mergear até dia 6. Caso atrase, fica parado até dia 16. Sem urgência. |

## 10. Próximos passos

1. **Mateus revisa este spec** e ajusta inline se necessário.
2. Após aprovação, invocar `writing-plans` para gerar plano de execução detalhado.
3. Implementação: branch `feat/a2-contas-a-receber` a partir de `main` (após PR #2 mergear) ou empilhada sobre `feat/a1-baseline-migration`.
4. PR #3 abre com SQL + types.ts + nota pra Mateus aplicar via Dashboard.
