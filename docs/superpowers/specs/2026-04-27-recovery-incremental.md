# Recovery Incremental — Evolução do v1 sem Big Bang

**Data:** 2026-04-27
**Autor:** Mateus (Líder IA Monetali) + Claude
**Status:** Aprovado, aguardando spec review
**Escopo:** Trazer melhorias planejadas em `monetali-recovery-v2/` para o repo de produção `monetali-recovery` (https://monetali-recovery.vercel.app), preservando o que já funciona e evoluindo em PRs pequenos.

---

## 1. Contexto

O v1 (este repo) está em produção e em evolução ativa — últimos commits trouxeram filtros por período e visão consolidada de pagamentos. Funciona como base, mas tem três limitações que travam a operação da Camily:

1. **Sem ingestão automática de dados** — toda baixa hoje passa por PROCV manual (~3h/semana), causando cobranças indevidas em clientes que já pagaram.
2. **`ImportacaoPage` usa `@/data/mockData`** — o upload manual atual não persiste no Supabase, só atualiza estado local.
3. **Schema só vive no Supabase remoto** — sem `supabase/migrations/`, sem tipos TS reais (`Tables: { [_ in never]: never }`), sem rastreabilidade de mudanças.

A pasta `monetali-recovery-v2/` (paralela a este repo) tem PRD, PLAN e DIAGNOSTICO desenhados como rebuild completo. Decidimos **não** fazer rebuild: vamos evoluir o v1 incrementalmente trazendo o que importa do v2.

## 2. Princípios

- **Não substituir o v1.** Estender o schema atual em vez de criar `contas_a_receber` paralelo.
- **Migrations versionadas** a partir de agora. Toda mudança de schema vive em `supabase/migrations/`.
- **Um PR por mudança lógica.** Pequeno, revisável, com preview Vercel automático.
- **Janela de deploy:** dias 1-6 do mês; dias 10-15 intocáveis (ciclo de comissão).
- **Campos protegidos** (nunca sobrescritos por sync ou import): `status_cobranca`, `flags`, `comentarios`, `atividades`, `historico_interacoes`.

## 3. Fluxo de trabalho

```
branch a partir de main → commits pequenos → push → gh pr create
  → preview Vercel automático → revisão → merge → produção
```

Convenção de branches:

- `feat/<fase>-<curto>` — features (ex: `feat/b1-edge-fn-google-sheets`)
- `fix/<curto>` — correções
- `docs/<curto>` — documentação
- `chore/<curto>` — config, deps

Convenção de commits: prefixos `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`, `test:`, `perf:` (já é o padrão do repo).

## 4. Decisão de modelo de dados

**Estender, não substituir.**

O v2 propunha uma tabela `contas_a_receber` desnormalizada com migração Big Bang de 443 clientes + 2018 registros. Vamos evitar isso.

**O que vamos fazer:**

- Manter `clientes`, `pagamentos_atraso`, `flags_*`, `atividades`, `recuperacoes`, `premissas`, `profiles`.
- Adicionar colunas faltantes onde fizer sentido (`canal`, `data_vencimento`, `mes_referencia`, `comentarios JSONB`, `valor_pago`, `data_pagamento`, `origem_dado`, `sync_hash`).
- Considerar renomear/re-conceitualizar `pagamentos_atraso` para abrigar **todos** os títulos (vencidos e a vencer), porque o pedido de "vence em X dias" exige títulos não vencidos.
  - Decisão final dessa renomeação fica para a Fase A, depois do introspect — vai depender do que descobrirmos no schema vivo.
- Criar tabelas novas: `metas`, `sync_log`, `importacoes_manuais`. Com RLS desde o nascimento.

**O que **não** vamos fazer:**

- Big Bang migration.
- Tabela `contas_a_receber` desnormalizada.
- Rodar v1 e v2 em paralelo.

## 5. Fases

5 fases sequenciais. Fora de escopo nesta iteração: bonus tracking (3 camadas + diário + semanal). Volta como Fase F depois.

### Fase A — Fundação (pré-requisito)

Sem isso a gente codifica no escuro.

| PR | Descrição | Critério de aceite |
|----|-----------|---------------------|
| A1 | Conectar Supabase CLI ao projeto, introspectar schema, criar `supabase/migrations/0001_baseline.sql`, gerar `src/integrations/supabase/types.ts` real | `supabase db pull` roda. Tipos TS refletem o schema vivo. Build do app continua passando. |
| A2 | Adicionar colunas faltantes nas tabelas existentes via migration (`canal`, `data_vencimento`, `mes_referencia`, `comentarios JSONB`, `valor_pago`, `data_pagamento`, `origem_dado`, `sync_hash`) | Migration aplicada em produção. Tipos regenerados. Backfill executado para registros existentes onde possível. |
| A3 | Criar tabelas `metas`, `sync_log`, `importacoes_manuais` com RLS | Tabelas existem. RLS ativo. Roles testados (admin/financeiro/viewer). |

### Fase B — Auto-sync Google Sheets (mata a dor #1)

Frequência: 1x/dia, 03:00 BRT.

| PR | Descrição | Critério de aceite |
|----|-----------|---------------------|
| B1 | Edge Function `sync-google-sheets` (Service Account, UPSERT preservando campos protegidos) | Função roda. Insere novos. Atualiza sem sobrescrever campos manuais. Idempotente. Loga em `sync_log`. |
| B2 | Agendamento diário via pg_cron (fallback Vercel Cron se necessário) | Job agendado. Visível no dashboard Supabase. Executou ao menos 1x com sucesso. |
| B3 | Página `/sync` com status, histórico das últimas 30 execuções, botão "Sincronizar Agora" | Página acessível. Status atualiza em tempo real. Botão dispara sync com confirmação e feedback. |
| B4 | Indicador no header global "atualizado há X horas" com pulse colorido | Pulse verde <24h, amarelo 24-48h, vermelho >48h ou erro. Tooltip com timestamp. Clicável → `/sync`. |

**Dependências externas:**
- Service Account criada no Google Cloud + JSON key.
- API Google Sheets v4 ativada no projeto.
- Planilha compartilhada com o e-mail da Service Account.

### Fase C — Importação manual VitBank (substitui Microsoft Graph)

Você confirmou: planilha do Kevin vem por e-mail, sobe manual.

| PR | Descrição | Critério de aceite |
|----|-----------|---------------------|
| C1 | Refatorar `ImportacaoPage` para persistir no Supabase de verdade (UPSERT v3 com campos protegidos) | Upload .xlsx executa real INSERT/UPDATE. Mock removido. Campos protegidos nunca sobrescritos. |
| C2 | Preset "VitBank" no mapeamento — mapeamento automático de colunas conhecidas | Selecionar template → colunas auto-mapeadas. Ainda permite ajuste manual. |
| C3 | Persistir log em `importacoes_manuais` + histórico de uploads na tela | Toda importação cria registro. Histórico mostra arquivo, data, contadores, usuário. Detalhes clicáveis. |

### Fase D — View unificada AR + Inadimplentes no cadastro do cliente

Pedido específico do Mateus: "contas a receber e inadimplentes na mesma visualização dentro do cadastro" + "aviso de quantos dias pra vencer, agrupado por mês".

| PR | Descrição | Critério de aceite |
|----|-----------|---------------------|
| D1 | View SQL `vw_cliente_titulos` (todos os títulos por cliente, com `dias_para_vencer` calculado dinamicamente) | View existe. Retorna títulos vencidos e a vencer. Calcula corretamente em qualquer fuso. |
| D2 | Refatorar seção de títulos no `ClientDetail.tsx`: tabs `Todos | A vencer | Vencidos | Pagos` com tabela única | Tabs funcionais. Aging pills consistentes. Preserva edição de status/flags/comentários. |
| D3 | Componente `VencimentoBadge` com semântica visual: `vence hoje` (laranja), `vence em N dias` (amarelo ≤7, azul >7), `vencido há N dias` (vermelho) | Badge renderiza correto pra cada caixa. Acessível. Brand Book compliant. |
| D4 | Agrupamento por mês com header "Abril/2026 — R$ X.XXX a receber" antes da lista de títulos do mês | Headers de grupo renderizam. Totais por mês corretos. Ordenação cronológica. |

### Fase E — Gráfico jacaré

Baixo risco, alto impacto visual. Encaixa no `DashboardFinanceiro.tsx`.

| PR | Descrição | Critério de aceite |
|----|-----------|---------------------|
| E1 | View SQL `vw_recebimento_jacare_mensal` (meta descendente + recebido acumulado por dia útil do mês) | View funcional. Performa bem em 2000+ registros (uso de índice). |
| E2 | Componente `JacareChart` (Recharts `<Area>` com gradiente entre as linhas, zona cinza nos últimos 2 dias) | Duas linhas convergentes. Boca preenchida. Delay de 2 dias visível. Tooltip com dia/recebido/meta/% meta. Responsivo. |
| E3 | Encaixar no `DashboardFinanceiro.tsx` + versão de recuperação no painel de inadimplentes (meta R$ 40K/mês) | Dois jacarés vivos. Carregamento <1s. Sem regressão no dashboard atual. |

## 6. Fora de escopo (esta iteração)

- **Bonus tracking** (Bônus 1/2/3 mensais + diário R$ 200 + semanal R$ 5K) — depende de aprovação do Rony.
- **Comentários por cliente** — pode entrar como mini-fase entre D e E se sobrar tempo, mas não bloqueia.
- **Microsoft Graph / OneDrive** — VitBank é manual agora, sem necessidade de Azure AD.
- **Comissões, vendas, orçamento, ERP, Bitrix, BTG** — fora do produto.

## 7. Acessos e dependências externas

| Item | Quem fornece | Quando | Bloqueia |
|------|--------------|--------|----------|
| Supabase URL + service_role key (ou Supabase MCP) | Mateus | Antes de A1 | Toda Fase A |
| Confirmação de preview deploy automático no Vercel | Mateus (já default) | Antes do primeiro PR | Validação dos PRs |
| Repo migrar de público → privado | Mateus | Antes de qualquer push de spec ou código com detalhes operacionais | **Risco vivo, ver §8** |
| Google Cloud Service Account + JSON key | Mateus | Antes de B1 | Toda Fase B |
| URL da planilha de contas a receber | Mateus | Antes de B1 | B1 |
| Mapeamento de colunas da planilha VitBank do Kevin | Mateus | Antes de C2 | C2 |

## 8. Riscos e mitigação

| # | Risco | Severidade | Mitigação |
|---|------|-----------|-----------|
| 1 | Schema vivo tem inconsistências que só descobrimos na Fase A | Médio | A1 é exploratório; baseline migration documenta o que existe antes de qualquer mudança |
| 2 | Janela 10-15 cai no meio das fases | Alto | Pausar merges nessa janela. Preview deploys continuam. Fases planejadas pra fechar PR antes do dia 7 ou começar depois do dia 16 |
| 3 | Repo público com sistema financeiro interno | Alto | Tornar privado **antes** de pushar este spec ou qualquer código novo. Ação do Mateus no GitHub |
| 4 | RLS pode bloquear queries existentes do v1 | Médio | Cada migration testa queries-chave com role financeiro antes de merge |
| 5 | `ImportacaoPage` mexe em mockData — pode haver outras telas com a mesma armadilha | Médio | Auditar uso de `mockData` no início da Fase C |
| 6 | Edge Function pode estourar timeout em planilhas grandes | Baixo | Paginação no fetch da planilha. Processamento em batch. Métrica no `sync_log`. |
| 7 | pg_cron não chama Edge Functions diretamente em todas as configurações Supabase | Baixo | Fallback Vercel Cron / GitHub Actions já previsto em B2 |

## 9. Critérios de sucesso (fim das 5 fases)

| KPI | Hoje | Meta pós-Fase E |
|-----|------|------------------|
| Reconciliação manual da Camily | ~3h/semana | 0h |
| Cobranças indevidas | Recorrentes | Zero |
| Frescor dos dados | 2-3 dias de atraso | <24h (Google Sheets), upload-on-demand (VitBank) |
| Visibilidade de "vence em X dias" no cadastro | Inexistente | Por título, agrupado por mês |
| Visibilidade de meta vs. recebido | Inexistente | Gráfico jacaré ao vivo |
| Schema versionado | Não | Sim, em `supabase/migrations/` |

## 10. Próximos passos imediatos

1. **Mateus:** decidir sobre repo público vs privado (§8 risco 3) antes de pushar este spec.
2. **Mateus:** fornecer URL Supabase + service_role key (ou autorizar Supabase MCP).
3. **Claude:** depois da Fase A começar, escrever plano de execução detalhado via skill `writing-plans` (uma tarefa por PR com critérios de aceite testáveis).
4. **Claude → Mateus:** primeiro PR (A1) abre, Mateus revisa e aprova, ciclo começa.
