# Prompt Lovable — Monetali Recovery v2

Copie e cole o prompt abaixo **inteiro** no Lovable para gerar o novo frontend. O Lovable vai criar um novo projeto React + TypeScript + Tailwind + shadcn/ui seguindo exatamente essa spec.

**Antes de rodar:**
1. Crie um novo projeto no Lovable.
2. Cole o prompt abaixo como primeira mensagem.
3. Depois que o Lovable gerar, conecte o Supabase usando as mesmas credenciais do projeto atual (os hooks já foram escritos pensando na mesma schema).

---

## PROMPT PARA COLAR NO LOVABLE

```
Construa um sistema de gestão de inadimplência chamado "Monetali Recovery" para uma fintech brasileira (Monetali/VitBank). É um produto B2B interno usado por executivos comerciais e time de cobrança para acompanhar clientes em atraso, registrar ações de cobrança, e projetar recuperação mensal. O sistema já tem um backend Supabase em produção — NÃO crie tabelas novas, apenas prepare os hooks e stubs para conectar.

═══════════════════════════════════════════════════════════
IDENTIDADE VISUAL
═══════════════════════════════════════════════════════════

Paleta (HSL):
- Primary (azul naval corporativo): 218 79% 22%  →  #0D2E5E
- Primary hover: 218 79% 18%
- Primary light: 218 60% 95%
- Accent (dourado institucional): 42 56% 55%  →  #D4A843
- Background: 0 0% 100%
- Background subtle (cards): 210 20% 98%
- Background muted: 210 16% 94%
- Border: 220 13% 91%
- Text: 220 15% 15%
- Text muted: 220 9% 46%
- Success: 160 84% 39%
- Warning: 38 92% 50%
- Destructive: 0 72% 51%
- Info: 215 52% 45%

Cores dos 10 status (cada um com bg 10%, text sólido, border 25%):
- NÃO INICIADO: 220 9% 46% (cinza neutro)
- EM ANDAMENTO: 215 90% 55% (azul ação)
- PENDENTE: 38 92% 50% (âmbar alerta)
- CONTATADO: 189 94% 43% (ciano)
- EM NEGOCIAÇÃO: 244 75% 60% (indigo)
- ACORDO FECHADO: 173 80% 40% (teal)
- PAGO: 142 71% 45% (verde sucesso)
- JURÍDICO: 262 83% 58% (roxo)
- PARCELADO: 42 56% 55% (dourado)
- DISTRATO: 0 72% 51% (vermelho)

Tipografia (Google Fonts):
- Títulos H1-H6: Montserrat (700, 800)
- Corpo / UI: Inter (400, 500, 600)
- Valores monetários e numéricos: JetBrains Mono (500, 600)
- Logo "monetali": Arvo serif (700)

Escala tipográfica (ratio 1.25):
caption 12, small 14, body 16, h6 18, h5 20, h4 24, h3 30, h2 36, h1 48

Espaçamento: sistema 8px (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80)
Border radius: sm 6, base 8, md 12, lg 16
Sombras: sm sutil, md em hover, lg em modals

Princípios visuais:
- Hierarquia por peso/tamanho, não só cor
- Dados são os protagonistas, decoração mínima
- Whitespace generoso
- Valores em JetBrains Mono para alinhar colunas financeiras
- Micro-interações só com propósito
- Contraste WCAG AA mínimo (4.5:1)

═══════════════════════════════════════════════════════════
LAYOUT BASE
═══════════════════════════════════════════════════════════

Sidebar fixa esquerda (240px desktop, colapsa para 64px em tablet, bottom-bar em mobile):
- Background: azul naval primary (hsl(218 79% 22%))
- Logo no topo: "monetali" em Arvo 24px + subtítulo "Recovery" em Inter 12px
- Itens com ícone lucide (20px) + label Inter 14px 500
- Item ativo: bg hsl(218 90% 35%), borda esquerda 3px dourado, label 600
- Item hover: bg hsl(218 85% 28%)
- Bloco do usuário no fundo: avatar + nome + email + botão logout

Header (64px, white):
- Breadcrumb à esquerda
- Avatar/menu à direita
- Border-bottom 1px

Main content:
- max-width 1400px
- padding 32px 40px
- Title H1 + subtitle no topo, filtros globais à direita

Navegação (sidebar items):
1. Dashboard (LayoutDashboard) → /
2. Inadimplentes (Users) → /inadimplentes
3. Recuperações (TrendingUp) → /recuperacoes
4. Evolução (BarChart3) → /evolucao
5. Atividades (Activity) → /atividades
6. Cadastrar (UserPlus) → /cadastrar
7. Importação (Upload) → /importacao
8. Premissas (Settings) → /premissas

═══════════════════════════════════════════════════════════
COMPONENTES REUTILIZÁVEIS (criar PRIMEIRO)
═══════════════════════════════════════════════════════════

1. <SidebarNav> — sidebar fixa conforme spec acima
2. <PageHeader title subtitle actions breadcrumb>
3. <KpiCard label value icon trend color valueFormat> — altura 120px, label uppercase 10px tracking, valor em JetBrains Mono 24px, ícone 16px no canto
4. <StatusBadge status> — aceita os 10 valores, renderiza pill colorida
5. <DataTable columns rows onRowClick sortable filterable paginated stickyHeader> — usar TanStack Table v8
6. <ClienteDrawer clienteId open onClose> — Sheet/Drawer lateral 720px
7. <MonthFilter value onChange defaultMostRecent> — Combobox com Jan-Dez 2026 + "Todos", default pro mês mais recente com dado
8. <EmptyState icon title description action> — centralizado, ícone 48px, CTA
9. <LoadingSkeleton variant> — variants: card, table-row, chart, text
10. <ConfirmDialog open title description variant actions> — modal para destrutivos
11. <ClienteCombobox> — autocomplete de clientes com busca por nome/CNPJ (usar cmdk do shadcn)
12. <CurrencyInput> — input que formata BRL enquanto digita
13. <FilterChip label options selected multi> — botão popover com filtro multi-select
14. Toast via sonner — posição top-right

Todos os componentes devem ter 4 estados: loading (skeleton), empty (EmptyState), error (retry), success (normal).

═══════════════════════════════════════════════════════════
TELAS (8 telas principais + login)
═══════════════════════════════════════════════════════════

━━━ LOGIN (/login) ━━━
Split 60/40: esquerda com pattern azul naval + dourado, direita com form.
Form: email, senha, "Lembrar", botão Entrar primary, link "Esqueci senha".
Supabase auth com magic link ou password.

━━━ DASHBOARD (/) ━━━
H1 "Dashboard" + MonthFilter à direita.

KPI cards em grid 4 colunas desktop / 2 tablet / 1 mobile:
- Total Compensação (currency, DollarSign, cor destructive)
- Total VitBank (currency, CreditCard, cor info)
- Total Monetali (currency, Smartphone, cor success)
- Total Juros (currency, TrendingUp, cor warning)
- Não Pagos (number, AlertTriangle, cor legal/roxo)
- Crítico >90d (number, AlertOctagon, cor destructive)
- Clientes (number, UserPlus, cor primary)
- Taxa Recuperação (percent, Target, cor success, com trend vs mês anterior)

Charts em grid 2x2 (ou 2x1 em mobile):
- Donut: Distribuição por Status (10 segmentos, legenda lateral clicável para filtrar, Recharts PieChart)
- Bar vertical: Aging por Faixa de Atraso (0-30, 31-60, 61-90, 90+, Recharts BarChart)
- Bar horizontal: Inadimplência por Regional (Recharts BarChart layout="vertical")
- Bar horizontal: Top 10 Executivos por carteira (Recharts)

Filtro de mês default: encontrar o mês mais recente que tem dados no DB, não o mês atual do calendário.

━━━ INADIMPLENTES (/inadimplentes) ━━━
H1 + caption "156 clientes · R$ 30,5M em aberto"

Toolbar:
- Input de busca (nome ou CNPJ) à esquerda
- Botão "Exportar CSV" à direita
- Botão "Nova Atividade" primary

Filter chips em linha abaixo da toolbar:
[Status ▾ (10 opções)] [Regional ▾] [Executivo ▾] [Faixa de Atraso ▾] [Flags ▾] [Limpar filtros]

DataTable com colunas:
- Cliente (clicável)
- Regional
- Executivo
- Compensação (mono, right-align)
- VitBank (mono, right-align)
- Monetali (mono, right-align)
- Dias em Atraso (número colorido por faixa)
- Situação (StatusBadge)
- Flags (chips pequenos)

Features: sticky header, zebra alternada, row hover com sombra sutil, paginação de 50 em 50, sortable em todas as colunas numéricas, clique em linha abre ClienteDrawer com URL sincronizada via query param ?cliente={id}.

Empty state: "Nenhum cliente encontrado" com CTA "Limpar filtros".

━━━ DRAWER DE CLIENTE (aberto via query param) ━━━
Drawer lateral 720px (shadcn Sheet).

Header:
- [← Voltar] [Editar] [Email] [Parcelamento] [⋯ mais]
- H2: Nome do cliente
- Caption: CNPJ · Regional · Executivo
- StatusBadge com dropdown de 10 opções para trocar

Grid 3x2 de infoboxes compactos:
- Compensação | VitBank | Monetali (valores grandes em mono)
- Dias Atraso | Parcelas | Juros Acumulados

Tabs:
1. PAGAMENTOS (default):
   - Lista de pagamentos com breakdown VitBank/Monetali/Vcto/Pgto/Juros/Status
   - Botão "+ Registrar Pagamento"
   - Botão "Registrar Parcelamento" secondary no topo

2. ATIVIDADES:
   - Timeline vertical com ícones por tipo (email, call, whatsapp, meeting, etc)
   - Form inline "Nova atividade" expansível
   - Agrupamento por data

3. FLAGS:
   - Chips toggleáveis: Prioridade, Juros, Sem Contato, Jurídico, Parcelamento, Promessa de Pgto, CS
   - Cada chip com cor própria quando ativo

4. CÁLCULO:
   - Valor Original
   - Juros + Multa Acumulados (breakdown VitBank + Monetali)
   - Valor Total Atualizado
   - Botão "Recalcular Juros"

Footer fixo do drawer: [Cancelar] [Salvar primary]

Toast de feedback ao salvar. URL sync via ?cliente={id}.

━━━ RECUPERAÇÕES (/recuperacoes) ━━━
H1 "Recuperações & Parcelamentos" + MonthFilter

3 KPIs:
- Em Cobrança (currency + contagem clientes)
- Em Parcelamento (currency + contagem ativos)
- Taxa de Recuperação (percent + trend + meta)

Chart: Valor por Executivo em Cobrança (bar horizontal, click → filtra tabela abaixo)

Tabela: Parcelamentos Ativos
Colunas: Cliente | Parcelas Total | Parcelas Pagas | Próximo Vcto | Valor Total | Status

━━━ EVOLUÇÃO (/evolucao) ━━━
H1 "Evolução Mensal" + ToggleGroup [6M | 12M | Ano | Tudo]

3 KPIs: Recebido | Pendente | Vencido (com contagem + breakdown VitBank/Monetali)

Chart ComposedChart (Recharts): barras (Recebido verde, Pendente amarelo, Vencido vermelho) + linha (Total acumulado) para cada mês do período selecionado.

Tabela detalhamento mensal com export CSV.

━━━ ATIVIDADES (/atividades) ━━━
H1 "Atividades" + MonthFilter + botão "Nova Atividade" primary

Modal Nova Atividade:
- ClienteCombobox com busca (não um select de 156 items)
- Tipo: Email | Ligação | WhatsApp | Reunião | Negociação | Promessa de Pgto | Escalação Jurídica
- Data: DatePicker default hoje
- Observação: Textarea com contador de chars (max 500)
- Cancelar | Registrar primary

Tabela Histórico:
- Filtros: Tipo, Cliente (busca), Responsável
- Colunas: Data (com hora), Cliente, Tipo (com ícone), Observação (truncada), Responsável
- Clique em row expande observação completa

Empty state: "Nenhuma atividade registrada" + CTA "Registrar primeira atividade".

━━━ CADASTRAR (/cadastrar) ━━━
H1 "Cadastrar Cliente" + caption "Ou use Importação para múltiplos →"

Form em 2 colunas, 3 seções agrupadas:

Dados Básicos:
- Nome/Razão Social* (required)
- CNPJ (máscara XX.XXX.XXX/XXXX-XX)
- Email
- Telefone (máscara (XX) XXXXX-XXXX)

Atribuição:
- Regional* (Select)
- Executivo (Select)

Situação Inicial:
- Compensação (R$)* (CurrencyInput)
- Dias em Atraso (number)
- Parcelas (number)
- Situação (Select com 10 opções, default "NÃO INICIADO")

Footer: [Cancelar] [Cadastrar primary]

Validação com react-hook-form + zod. Toast de sucesso. Redirect para /inadimplentes após cadastrar.

━━━ IMPORTAÇÃO (/importacao) ━━━
H1 "Importação de Dados"

Tabs:
1. Importação Inteligente (IA):
   - Drop zone grande centralizado (ícone Upload, texto "Arraste ou clique", formatos .csv .xlsx .xls .txt, limite 10MB)
   - Divider "— ou —"
   - Textarea "Cole o texto aqui"
   - Após upload: preview das colunas detectadas + mapeamento automático + confirmação + progress bar + toast "N clientes importados"

2. Importação Manual (Lote):
   - Download do template CSV
   - Upload do CSV preenchido
   - Preview + confirm

━━━ PREMISSAS (/premissas) ━━━
H1 "Premissas" + [Recalcular Juros secondary] [Salvar primary]

Tabs:
1. Parâmetros:
   - Seção Juros e Multa: Taxa ao Dia (%), Taxa ao Mês (%), Multa por Atraso (%)
   - Seção Prazos: Dias de Carência, Dias p/ Escalação Jurídica
   - Seção Email: Remetente Padrão

2. Templates de Email:
   - Lista de templates com Nome | Assunto | Atualizado em | [Editar] [Duplicar] [Excluir]
   - Botão "+ Novo Template"
   - Editor com preview quando clicar em editar

ConfirmDialog antes de "Recalcular Juros" (é uma operação pesada).

═══════════════════════════════════════════════════════════
INTEGRAÇÃO BACKEND (Supabase)
═══════════════════════════════════════════════════════════

O sistema tem um backend Supabase existente com as tabelas:
- clientes (id, nome, cnpj, email, telefone, regional, executivo_responsavel, valor_total_atraso, qtd_pagamentos_atraso, dias_atraso_max, juros_total, status, deleted_at)
- pagamentos_atraso (id, cliente_id, valor, vitbank, vcto_vitbank, pgto_vitbank, monetali, vcto_monetali, pgto_monetali, imposto, valor_compensacao, juros, mes_referencia, data_vencimento, dias_atraso, status, data_cobranca, deleted_at)
- atividades (id, cliente_id, tipo, descricao, automatico, criado_por, created_at)
- flags_cliente (id, cliente_id, nome_flag, cor)
- flags_disponiveis (id, nome, cor)
- premissas (id, chave, valor, descricao)
- recuperacoes (id, cliente_id, pagamento_id, valor, data_recebimento, forma_pagamento)

Status do cliente (coluna `status` na tabela clientes) usa esses valores enum:
nao_iniciado, em_andamento, pendente, contatado, em_negociacao, acordo_fechado, pago, juridico, parcelado, distrato

Crie um arquivo src/lib/supabaseMappers.ts com funções mapDbClienteToClient e mapClientToDbInsert/Update para bidirecional.

Crie hooks customizados em src/hooks:
- useAuth() — login/logout/session Supabase
- useDashboard(mes) — KPIs + chart data do dashboard
- useClientes(filters) — lista paginada com filtros
- useCliente(id) — detalhe + pagamentos + flags + atividades
- usePagamentos(clienteId)
- useAtividades(filters)
- useFlags()
- usePremissas() — inclui recalcularJuros() com try/catch
- useRecuperacoes(mes)
- useEvolucao(periodo)

Padrão: cada hook retorna { data, loading, error, refetch }. Use React Query (@tanstack/react-query) para cache. Invalidar queries após mutations.

Não conecte ao Supabase ainda — deixe os hooks como STUBS que retornam mock data, mas com a estrutura correta. Eu conectarei depois ajustando as credenciais.

═══════════════════════════════════════════════════════════
STACK TÉCNICA
═══════════════════════════════════════════════════════════

- Vite + React 18 + TypeScript
- Tailwind CSS v3 (usar variáveis CSS HSL para tokens)
- shadcn/ui (Button, Card, Dialog, Sheet, Tabs, Table, Input, Select, Combobox, Popover, Toast via sonner, Skeleton, Badge, Avatar, Separator, ScrollArea)
- React Router v6 (BrowserRouter, com rota /login separada do layout autenticado)
- TanStack Table v8 para DataTable
- TanStack Query v5 para state server
- Recharts para todos os gráficos
- react-hook-form + zod para formulários
- lucide-react para ícones
- date-fns com locale ptBR para datas
- sonner para toasts

Configurar:
- tailwind.config.ts com as cores HSL como CSS variables
- index.css com @layer base para tokens e @layer utilities para status classes
- Fonts via @import no CSS (Montserrat, Inter, Arvo, JetBrains Mono)
- vercel.json com rewrite para SPA ( {"rewrites":[{"source":"/(.*)","destination":"/"}]} )

═══════════════════════════════════════════════════════════
ACESSIBILIDADE (WCAG 2.1 AA)
═══════════════════════════════════════════════════════════

- Contraste 4.5:1 mínimo (validar cores de status em bg white)
- Focus visible em todos interativos: ring-2 ring-primary ring-offset-2
- Navegação teclado: Tab order lógico, Esc fecha modals/drawers
- ARIA labels em buttons icon-only
- Landmarks: header, nav, main, aside
- Touch targets ≥44px em mobile
- Respeitar prefers-reduced-motion para animações
- Todas as imagens decorativas com alt=""

═══════════════════════════════════════════════════════════
ENTREGA
═══════════════════════════════════════════════════════════

Comece construindo NESTA ORDEM:
1. Setup do projeto (Vite + Tailwind + shadcn com as cores)
2. Layout base (SidebarNav + Header + rotas principais)
3. Componentes reutilizáveis (KpiCard, StatusBadge, DataTable, ClienteDrawer, MonthFilter, PageHeader, EmptyState, LoadingSkeleton)
4. Tela Dashboard (a mais importante)
5. Tela Inadimplentes + ClienteDrawer (segunda mais importante)
6. Tela Atividades (terceira mais importante)
7. Tela Premissas
8. Telas Recuperações e Evolução
9. Telas Cadastrar e Importação
10. Tela Login

Após gerar, me mostre uma prévia do Dashboard e da Inadimplentes primeiro. Vou validar e pedir ajustes antes de seguir para as outras telas.

Use TODOS os nomes e estrutura acima literalmente. Não simplifique, não renomeie, não pule etapas. Seja fiel ao design system definido: azul naval #0D2E5E, dourado #D4A843, Montserrat para títulos, Inter para UI, JetBrains Mono para valores numéricos.

Nome do produto: Monetali Recovery
Tagline: "Controle de Inadimplência"
Tom: profissional, corporativo, mas acolhedor. Linguagem formal mas não burocrática.
```

---

## Depois que o Lovable gerar

### Checklist de validação da primeira build

- [ ] Sidebar com cor primary (azul naval) e item ativo com borda dourada
- [ ] Logo "monetali" em Arvo serif
- [ ] Fontes Montserrat + Inter + JetBrains Mono carregadas do Google Fonts
- [ ] Dashboard com 8 KPI cards em grid 4×2
- [ ] StatusBadge renderizando com 10 cores distintas
- [ ] Tabela Inadimplentes com sticky header e zebra
- [ ] ClienteDrawer abre por query param `?cliente=xyz`
- [ ] `vercel.json` com rewrite SPA configurado
- [ ] Navegação direta `/inadimplentes` carrega sem 404
- [ ] Valores monetários em JetBrains Mono
- [ ] Skeletons de loading em todas as telas
- [ ] Empty states bem desenhados
- [ ] Toasts via sonner ao salvar

### Prompts de ajuste incrementais (usar se algo vier diferente)

**Se a paleta vier errada:**
> "A cor primary está errada. Deve ser exatamente `hsl(218 79% 22%)` (#0D2E5E — azul naval). O accent deve ser `hsl(42 56% 55%)` (#D4A843 — dourado). Atualize o tailwind.config.ts e o index.css."

**Se o StatusBadge não tiver 10 cores:**
> "O StatusBadge precisa suportar exatamente esses 10 valores com cores dedicadas: NÃO INICIADO (cinza), EM ANDAMENTO (azul), PENDENTE (âmbar), CONTATADO (ciano), EM NEGOCIAÇÃO (indigo), ACORDO FECHADO (teal), PAGO (verde), JURÍDICO (roxo), PARCELADO (dourado), DISTRATO (vermelho). Cada um com bg opacity 10%, text sólido, border opacity 25%."

**Se o drawer de cliente não sincronizar URL:**
> "O ClienteDrawer deve sincronizar com URL via search param `?cliente={id}`. Abrir o cliente deve chamar setSearchParams, fechar deve limpar. Refresh da página com o param deve abrir o drawer automaticamente."

**Se os valores não estiverem em JetBrains Mono:**
> "Todos os valores monetários (R$ ...) e numéricos precisam estar em JetBrains Mono 500. Crie uma classe utility `.font-mono-value` no index.css e aplique em todos os cards KPI, células de tabela com dinheiro, totalizers do drawer."

**Se o Dashboard abrir vazio:**
> "O MonthFilter no Dashboard/Recuperações/Evolução deve default para o mês mais recente que tem dados no banco, não o mês atual do calendário. Adicione uma prop `defaultMostRecent` que busca min/max de data_vencimento em pagamentos_atraso e escolhe o mês mais recente com count > 0."

**Para conectar Supabase depois:**
> "Agora conecte todos os hooks ao Supabase real. As credenciais são: URL `https://lxxcenctirccdpysbynz.supabase.co`, anon key nos secrets. Use a lib @supabase/supabase-js e substitua o mock data por queries reais seguindo exatamente os nomes das tabelas (clientes, pagamentos_atraso, atividades, flags_cliente, flags_disponiveis, premissas, recuperacoes) e o schema do status como enum string (nao_iniciado, em_andamento, ..., distrato)."
