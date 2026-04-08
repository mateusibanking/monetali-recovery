# Briefing — Novo Frontend Monetali Recovery

**Data:** 08/04/2026
**Autor:** Comitê de Produto (design-system-adaptavel + briefing-de-produto + comite-de-produto)
**Objetivo:** Reconstruir o frontend do sistema de inadimplência Monetali com qualidade profissional, preservando toda a lógica de negócio e backend Supabase existente.

---

## 1. Contexto e JTBD

### 1.1 — O que o sistema faz
O **Monetali Recovery** é uma plataforma interna da Monetali/VitBank para gestão de recebíveis em atraso. Hoje controla **156 clientes ativos**, R$ 30,5M em compensação total, com 153 pagamentos em aberto (dados Abril/2026). Os operadores (executivos comerciais e o time de cobrança) usam o sistema todo dia para priorizar contatos, registrar ações de cobrança, acompanhar parcelamentos e projetar recuperação mensal.

### 1.2 — Job-to-be-Done
> "Quando eu abro o sistema de manhã, quero ver rapidamente **quais clientes me devem mais**, **quais estão no limite pra ir pro jurídico**, e **o que já foi tentado com cada um**, para que eu consiga priorizar os contatos do dia e fechar acordos de recuperação."

### 1.3 — Personas (2 principais)

**Persona 1 — Executivo Comercial (Lucas, 34)**
- Tech level: 3/5
- Contexto: Desktop + celular, 6-8h/dia no sistema
- Frustração #1: Perder tempo cruzando planilhas antigas para saber o que já foi cobrado
- Sucesso = fechar acordo de parcelamento ou ver cliente pagar

**Persona 2 — Gestor de Cobrança (Mateus, fundador)**
- Tech level: 5/5
- Contexto: Desktop, olha o dashboard 3-5x/dia
- Frustração #1: Falta visão agregada por regional/executivo pra dar direcionamento ao time
- Sucesso = ver a curva de recuperação mensal melhorar

### 1.4 — Alternativa atual
Antes do sistema, era planilha Excel compartilhada + grupo de WhatsApp. O sistema atual (v1, Lovable inicial) funciona mas tem problemas sérios de UX que serão corrigidos no novo frontend.

---

## 2. Diagnóstico do Sistema Atual

### 2.1 — Inventário das 8 telas

| # | Rota | Nome | Função principal |
|---|---|---|---|
| 1 | `/` | Dashboard | Visão geral: KPIs + 4 gráficos (status, aging, regional, executivo) |
| 2 | `/inadimplentes` | Inadimplentes | Lista mestre com filtros, paginação, drawer de detalhe |
| 3 | `/recuperacoes` | Recuperações & Parcelamentos | KPIs de recuperação + valor por executivo + lista de parcelados |
| 4 | `/evolucao` | Evolução Mensal | KPIs Recebido/Pendente/Vencido + gráfico 12 meses + tabela detalhamento |
| 5 | `/atividades` | Registro de Atividades | Form nova atividade + histórico |
| 6 | `/cadastrar` | Cadastrar Cliente | Form de cadastro manual |
| 7 | `/importacao` | Importação de Dados | Drop zone + Importação com IA / em lote |
| 8 | `/premissas` | Premissas | Parâmetros de juros + templates de email |

### 2.2 — Problemas de usabilidade encontrados (por severidade)

#### 🔴 Crítico (bloqueia uso ou confunde dado real)

**P1 — Status inconsistente em todo o frontend**
O backend já foi migrado pra 10 valores de Situação (`NÃO INICIADO`, `EM ANDAMENTO`, `PENDENTE`, `CONTATADO`, `EM NEGOCIAÇÃO`, `ACORDO FECHADO`, `PAGO`, `JURÍDICO`, `PARCELADO`, `DISTRATO`), mas o frontend ainda usa os 5 valores antigos:
- Filtro de lista: mostra só "Cobrança OK, Cobrança em Andamento, Não Pago, Parcelado, Distrato"
- Detalhe do cliente: mesmos 5 botões
- Tela de cadastro: mesmos 5
- Gráfico de status no dashboard: binário "Não Pago vs Cobrança OK"

**Resultado:** impossível setar corretamente um cliente como "EM NEGOCIAÇÃO" ou "PENDENTE" pelo UI atual. Os 137 clientes em `em_andamento` no DB aparecem como "Não Pago" na lista.

**P2 — Navegação direta retorna 404**
Abrir `https://monetali-recovery.vercel.app/inadimplentes` direto no browser dá 404. Vercel não está com rewrites SPA configurados. Só funciona navegando a partir do `/`. Bookmarks, links compartilhados e refresh de página quebram.

**P3 — Gráfico do dashboard resume binário**
Com 10 status no sistema, o gráfico "Distribuição por Status" ainda mostra só 2 categorias. Mateus perde o contexto de quantos estão em EM NEGOCIAÇÃO vs CONTATADO vs JURÍDICO.

#### 🟡 Importante (atrapalha o trabalho)

**P4 — Filtro de cliente em Atividades é um select de 156 itens**
Sem busca, rolando uma lista enorme pra achar o cliente. Operador perde 30s em cada registro.

**P5 — Tipo de atividade limitado a 3 opções**
Só "Email Enviado, Ligação Feita, WhatsApp Enviado". Falta "Negociação", "Reunião", "Cobrança formal", "Escalação jurídica", "Promessa de pagamento".

**P6 — Filtro de mês padrão mostra tela vazia**
Dashboard/Recuperações/Evolução abrem no mês atual (Março 2026) que tem 0 registros. Usuário precisa trocar pra "Todos" pra ver qualquer coisa. Deveria abrir com dados.

**P7 — Nenhum estado de loading ou skeleton**
Carregamento é branco → conteúdo aparece de uma vez. Parece travado em conexão lenta.

**P8 — Nenhum estado vazio bem desenhado**
Telas sem dado mostram só "Nenhum registro." em texto cinza. Falta CTA, orientação, ilustração.

**P9 — Detalhe do cliente abre na mesma rota `/inadimplentes` sem URL própria**
Não dá pra compartilhar link de um cliente específico, não dá pra voltar pro cliente anterior via browser. Deveria ser `/inadimplentes/:id` ou drawer com query param.

**P10 — Cálculo automático de juros aparece antes dos pagamentos**
No detalhe do cliente, a caixa "Cálculo Automático de Juros" vem primeiro. Mas o usuário quer ver os pagamentos primeiro para entender o contexto. Ordem invertida.

**P11 — Flag system não usa badges consistentes**
As 7 flags (+Prioridade, +Juros, +Sem Contato, +Jurídico, +Parcelamento, +Promessa de Pgto, +CS) são botões texto sem cor distintiva. Visual fraco.

**P12 — KPI cards apertados em telas médias**
7 cards em uma única linha fica minúsculo. Em 1440px, cada card tem ~180px de largura, texto lutando por espaço.

#### 🟢 Cosmético (refinamento visual)

**P13 — Tipografia inconsistente:** Inter e Montserrat misturados, valores sem mono em algumas telas.
**P14 — Espaçamento desigual:** algumas telas com padding 24px, outras com 16px, outras com 32px. Falta sistema.
**P15 — Sidebar escura + content claro funciona, mas o sidebar não tem estado ativo forte:** item selecionado só muda de cor sutil.
**P16 — Sem feedback sonoro/toast em "Salvar".** Usuário clica Salvar e não sabe se foi.
**P17 — Sem breadcrumbs** em nenhuma tela. Em dashboard grande, perde contexto.
**P18 — Botões destrutivos sem confirmação:** deletar cliente (quando existir) precisa de modal.
**P19 — Tabela não tem sticky header.** Em lista grande, header some ao scroll.
**P20 — Dark mode inexistente.** Operadores que ficam 8h/dia querem poder trocar.

### 2.3 — O que funciona bem (preservar)

- **Arquitetura de dados bem feita:** backend Supabase com trigger `sync_cliente_totais` é sólido. Não mexer.
- **KPIs relevantes para o negócio:** Total Compensação, VitBank, Monetali, Juros, Não Pagos, Crítico >90d, Clientes. A seleção está certa.
- **Aging por faixa de atraso (0-30, 31-60, 61-90, 90+):** segue padrão de mercado. Manter.
- **Top Executivos e Inadimplência por Regional:** visão agregada útil pra gestão. Manter.
- **Filtros compostos em Inadimplentes** (Status + Regional + Executivo + Faixa + Flags): o mecanismo está certo, só falta rebuild visual.
- **Drawer lateral para detalhe do cliente:** padrão correto. Não migrar para página nova, só melhorar o conteúdo e dar URL compartilhável.
- **Importação com IA:** feature forte. Manter e expor melhor.
- **Premissas editáveis + Recalcular Juros:** controle de parâmetros do admin. Bem pensado.
- **Paleta de cores Monetali:** azul naval + acento dourado funciona pro nicho. Refinar, não trocar.
- **Sidebar escura + content claro:** hierarquia imediata. Manter.
- **JetBrains Mono em valores monetários:** decisão técnica boa, alinha colunas.
- **Registro de Parcelamento:** operação crítica bem modelada (botão dedicado, fluxo isolado).

---

## 3. Identidade Visual (refinada)

### 3.1 — Paleta de cores

Preservando a identidade Monetali, expandindo o sistema para cobrir os 10 status:

```css
/* Brand */
--primary:        218 79% 22%;  /* #0D2E5E — azul naval Monetali */
--primary-hover:  218 79% 18%;
--primary-light:  218 60% 95%;  /* bg sutil em hover de itens */
--accent:         42 56% 55%;   /* #D4A843 — dourado Monetali */
--accent-hover:   42 56% 48%;

/* Neutros (cinzas quentes, pra casar com dourado) */
--bg:             0 0% 100%;    /* #FFFFFF */
--bg-subtle:      210 20% 98%;  /* #F8FAFB — cards, seções */
--bg-muted:       210 16% 94%;  /* #EDF1F3 — table hover, separadores */
--border:         220 13% 91%;  /* #E2E5E9 */
--border-strong:  220 13% 82%;
--text:           220 15% 15%;  /* #1F2430 — corpo */
--text-muted:     220 9% 46%;   /* #6B7280 — secundário */
--text-subtle:    220 9% 65%;   /* #9AA3B2 — terciário / captions */

/* Semânticas */
--success:        160 84% 39%;  /* #10B981 */
--warning:        38 92% 50%;   /* #F59E0B */
--destructive:    0 72% 51%;    /* #DC2626 */
--info:           215 52% 45%;  /* #3A6FA5 */

/* Status (10 cores dedicadas — usar subtle bg + strong text + border) */
--status-nao-iniciado:     220 9% 46%;   /* cinza neutro */
--status-em-andamento:     215 90% 55%;  /* azul ação */
--status-pendente:         38 92% 50%;   /* âmbar alerta */
--status-contatado:        189 94% 43%;  /* ciano */
--status-em-negociacao:    244 75% 60%;  /* indigo — em movimento */
--status-acordo-fechado:   173 80% 40%;  /* teal — quase lá */
--status-pago:             142 71% 45%;  /* verde sucesso */
--status-juridico:         262 83% 58%;  /* roxo — escalado */
--status-parcelado:        42 56% 55%;   /* dourado Monetali — acento institucional */
--status-distrato:         0 72% 51%;    /* vermelho — fim da linha */
```

Cada status usa o padrão `bg: color/10%  text: color  border: color/25%` — garante contraste WCAG AA sem gritar visualmente.

### 3.2 — Tipografia

| Uso | Fonte | Pesos |
|---|---|---|
| Títulos (H1-H3) | **Montserrat** | 700, 800 |
| Subtítulos (H4-H6) | **Montserrat** | 600 |
| Corpo / UI | **Inter** | 400, 500, 600 |
| Valores monetários e numéricos | **JetBrains Mono** | 500, 600 |
| Logo "monetali" | **Arvo** (serif) | 700 |

**Escala modular** (ratio 1.25):
```
caption:  12px / 16px (captions, timestamps)
small:    14px / 20px (labels, hints)
body:     16px / 24px (corpo padrão)
h6:       18px / 28px
h5:       20px / 28px
h4:       24px / 32px
h3:       30px / 36px
h2:       36px / 44px
h1:       48px / 56px (só na tela de login / landing)
```

### 3.3 — Espaçamento (sistema 8px)

```
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128
```

- Inline entre elementos: 8–16
- Entre componentes: 16–24
- Entre blocos / seções: 32–48
- Padding interno de cards: 24
- Padding de buttons: 10×20 (md) | 8×16 (sm) | 12×24 (lg)

### 3.4 — Sombras e elevação

```css
--shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.04);
--shadow:     0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06);
--shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06);
--shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04);
```

Uso: cards default com `shadow-sm`, card em hover sobe pra `shadow-md`, modal/drawer usa `shadow-lg`.

### 3.5 — Border radius

```
--radius-sm: 6px   (badges, chips)
--radius:    8px   (buttons, inputs)
--radius-md: 12px  (cards)
--radius-lg: 16px  (modals, drawers)
```

### 3.6 — Princípios visuais

1. **Hierarquia por peso e tamanho**, não só por cor.
2. **Dados são os protagonistas** — decoração é mínima.
3. **Whitespace generoso** — melhor menos dado por tela bem respirado que tudo amontoado.
4. **Cor como semântica** — verde = positivo, vermelho = negativo, dourado = acento institucional.
5. **Valores em mono** — alinhamento de colunas financeiras é inegociável.
6. **Micro-interações com propósito** — só animar o que ajuda a entender.

---

## 4. Layout Base

### 4.1 — Estrutura global

```
┌────────────────────────────────────────────────────────────────┐
│  SIDEBAR   │  HEADER (breadcrumb + user menu + ações globais)  │
│  240px     ├───────────────────────────────────────────────────┤
│  navy      │                                                   │
│  Monetali  │  MAIN CONTENT (max-w-7xl, padding 32px)           │
│            │                                                   │
│  Logo      │  [título da tela]           [filtros globais]     │
│            │                                                   │
│  Nav       │  [conteúdo da tela]                               │
│  items     │                                                   │
│            │                                                   │
│  User      │                                                   │
│  info      │                                                   │
│            │                                                   │
│  Logout    │                                                   │
└────────────┴───────────────────────────────────────────────────┘
```

### 4.2 — Sidebar

- **Largura:** 240px (desktop) / colapsa pra 64px em tablets / bottom-bar em mobile
- **Background:** `hsl(218 79% 22%)` (primary Monetali)
- **Logo no topo:** "monetali" em Arvo 24px, cor `--primary-light`, peso 700, subtítulo "Recovery" em Inter 12px
- **Itens de navegação:** ícone 20px (lucide-react) + label Inter 14px 500. Padding 12px 16px. Border-radius 8px.
- **Item ativo:** bg `hsl(218 90% 35%)`, borda esquerda 3px accent dourado, label 600.
- **Item hover:** bg `hsl(218 85% 28%)`
- **User block no bottom:** avatar + nome + email truncado, ícone de logout no canto

**Itens:**
1. Dashboard (LayoutDashboard)
2. Inadimplentes (Users)
3. Recuperações (TrendingUp)
4. Evolução (BarChart3)
5. Atividades (Activity)
6. Cadastrar (UserPlus)
7. Importação (Upload)
8. Premissas (Settings)

### 4.3 — Header

- Altura: 64px
- Background: `--bg` (branco)
- Border-bottom: 1px `--border`
- **Esquerda:** breadcrumb (ex: `Dashboard › Março 2026`)
- **Direita:** botão "Relatório PDF" (opcional) + notification bell + avatar com dropdown (Perfil, Preferências, Logout)

### 4.4 — Main content

- `max-width: 1400px`
- padding: `32px 40px`
- Fundo: `--bg`

Hierarquia interna de cada página:
```
H1 da tela + subtitle       [filtros globais à direita]
↓ 32px
[bloco 1]                   [bloco 2]
↓ 24px
[bloco 3 full-width]
↓ 24px
...
```

### 4.5 — Responsividade

| Breakpoint | Comportamento |
|---|---|
| **Desktop (≥1280px)** | Sidebar fixa 240px, main com 2–3 colunas de conteúdo |
| **Tablet (768–1279px)** | Sidebar colapsa pra 64px (só ícones), main 1–2 colunas |
| **Mobile (<768px)** | Sidebar vira bottom-bar com 5 ícones principais + menu hamburguer para o resto, main 1 coluna |

---

## 5. Especificação Tela a Tela

### 5.1 — Login (`/login`)

**Objetivo:** entrar no sistema. Existe mas não foi validada no tour (Mateus já logado).

**Layout:**
- Tela dividida 60/40: esquerda com ilustração/pattern abstrato em azul naval + dourado, direita com formulário
- Logo Monetali 48px centralizado acima do form
- H2 "Bem-vindo de volta"
- Caption "Controle de Inadimplência"
- Form: email, senha, checkbox "Lembrar de mim", botão "Entrar" primary full-width
- Link "Esqueci minha senha"
- Footer sutil: "© 2026 Monetali"

**Estados:** loading no submit, erro de credencial, success → redirect `/`

### 5.2 — Dashboard (`/`)

**Objetivo:** visão 360º da operação no período.

**Layout:**
```
H1 "Dashboard"           [MonthFilter default=atual-com-dados]

┌─────────────────────────────────────────────────────────────────┐
│  KPI CARDS (grid 4 colunas desktop, 2 tablet, 1 mobile)         │
│                                                                 │
│  [Total Comp.]  [VitBank]   [Monetali]  [Juros]                 │
│  [Não Pagos]    [Crítico]   [Clientes]  [Recuperação%]          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┬───────────────────────────────────┐
│ CHART: Distribuição Status  │ CHART: Aging por Faixa            │
│ (donut com 10 segmentos)    │ (bar chart: 0-30, 31-60, 61-90,   │
│ Legenda clicável p/ filtrar │  90+)                             │
└─────────────────────────────┴───────────────────────────────────┘

┌─────────────────────────────┬───────────────────────────────────┐
│ CHART: Inadimplência por    │ CHART: Top 10 Executivos          │
│ Regional (horizontal bar)   │ (horizontal bar com foto/iniciais)│
└─────────────────────────────┴───────────────────────────────────┘
```

**KPI Card:**
```
┌────────────────────┐
│ LABEL (10px upper) │  ← label em uppercase, letter-spacing, text-muted
│                    │
│ R$ 30.538.780,73   │  ← valor em JetBrains Mono, 24px, cor semântica
│                    │
│ ↑ 12.3% vs fev     │  ← trend opcional em 12px
└────────────────────┘
```

**Correções vs atual:**
- 4×2 grid em vez de 7 cards em linha (resolve P12)
- Dashboard abre no "mês mais recente com dados" (resolve P6)
- Donut de status tem 10 segmentos, um por valor (resolve P3)
- Loading com skeleton nos cards e charts (resolve P7)

### 5.3 — Inadimplentes (`/inadimplentes`)

**Objetivo:** listar todos os clientes em inadimplência, filtrar rápido, abrir detalhe.

**Layout:**
```
H1 "Inadimplentes"  caption "156 clientes · R$ 30,5M em aberto"

[BUSCA por nome/CNPJ ........................] [Nova Atividade] [Exportar CSV]

[Filter chips: Status▾] [Regional▾] [Executivo▾] [Faixa Atraso▾] [Flags▾] [Limpar]

┌────────────────────────────────────────────────────────────────────┐
│ Cliente         Regional  Executivo  Compensação  VitBank  …       │
├────────────────────────────────────────────────────────────────────┤
│ RTT SOLUÇÕES    RJ/SP    Lucas      R$5.844.408  R$5.500.274  ... │
│ ESVJ ENGENHARIA RJ/SP    Miriane    R$2.011.861  R$1.892.528  ... │
│ ...                                                                │
└────────────────────────────────────────────────────────────────────┘

[◀ Anterior]  1 2 3 4  [Próximo ▶]    50 de 156
```

**Correções vs atual:**
- Campo de busca no topo (antes não tinha)
- Filtro Status com 10 opções corretas (resolve P1)
- Sticky header (resolve P19)
- Row hover mostra ações inline (abrir, marcar contato, flag rápida)
- Clique em row abre drawer lateral com URL sincronizada `?cliente={id}` (resolve P9)
- Badges de status coloridas consistentes
- Paginação com contador claro

### 5.4 — Drawer de Detalhe do Cliente

**Objetivo:** ver e editar tudo sobre um cliente sem perder contexto da lista.

**Layout (drawer lateral 720px):**
```
┌───────────────────────────────────────────────────────┐
│ [Voltar ←]  [✎Editar] [📧Email] [💰Parcelamento] [⋯]  │
│                                                       │
│ RTT SOLUÇÕES                                          │
│ CNPJ: — · RJ/SP · Lucas Santos                        │
│                                                       │
│ [Status Badge: EM ANDAMENTO ▾] ← dropdown 10 opções   │
│                                                       │
│ ┌─────────────┬─────────────┬─────────────┐           │
│ │ COMPENSAÇÃO │ VITBANK     │ MONETALI    │           │
│ │ R$5.844.408 │ R$5.500.274 │ R$344.133   │           │
│ └─────────────┴─────────────┴─────────────┘           │
│ ┌─────────────┬─────────────┬─────────────┐           │
│ │ DIAS ATRASO │ PARCELAS    │ JUROS       │           │
│ │ 165d        │ 2           │ R$425.472   │           │
│ └─────────────┴─────────────┴─────────────┘           │
│                                                       │
│ [Tabs: Pagamentos | Atividades | Flags | Cálculo]     │
│                                                       │
│ ── TAB PAGAMENTOS ──                                  │
│ Lista de pagamentos do cliente com VitBank/Monetali/  │
│ Vcto/Pgto/Juros/Status em badges                      │
│ [+ Registrar Pagamento]                               │
│                                                       │
│ ── TAB ATIVIDADES (timeline) ──                       │
│ • 15/03 Email enviado — Lucas                         │
│ • 12/03 Ligação feita — Matheus                       │
│ • 10/03 WhatsApp — Lucas                              │
│ [+ Nova Atividade inline]                             │
│                                                       │
│ ── TAB FLAGS ──                                       │
│ [●Prioridade] [○Juros] [○Sem Contato] [○Jurídico]...  │
│ Toggle chip com cor quando ativa                      │
│                                                       │
│ ── TAB CÁLCULO ──                                     │
│ Valor Original, Juros + Multa, Valor Total, breakdown │
└───────────────────────────────────────────────────────┘
```

**Correções vs atual:**
- Status com 10 opções corretas (resolve P1)
- Dados principais em cards compactos no topo
- Pagamentos primeiro (via tab default), cálculo último — ordem correta (resolve P10)
- Timeline de atividades integrada ao drawer (não mais separada em página)
- Flags como chips coloridos toggleáveis (resolve P11)
- Drawer tem URL compartilhável `?cliente=xyz` (resolve P9)
- Toast de feedback ao salvar (resolve P16)

### 5.5 — Recuperações (`/recuperacoes`)

**Objetivo:** acompanhar a recuperação em andamento e os parcelamentos ativos.

**Layout:**
```
H1 "Recuperações & Parcelamentos"  [MonthFilter]

[KPI x3]
┌─ Em Cobrança ─┬─ Em Parcelamento ─┬─ Taxa Recuperação ─┐
│ R$ 12.3M      │ R$ 2.1M           │ 42,3% (↑3%)         │
│ 87 clientes   │ 12 ativos         │ meta 50%            │
└───────────────┴───────────────────┴─────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ CHART: Valor por Executivo em cobrança                  │
│ (horizontal bar, click → filtra lista abaixo)           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ TABELA Parcelamentos Ativos                             │
│ Cliente | Parcelas | Pagas | Próx Vcto | Valor | Status │
└─────────────────────────────────────────────────────────┘
```

**Correções vs atual:** abre com dados (P6), KPI com trend vs mês anterior, click em bar chart filtra a lista abaixo.

### 5.6 — Evolução (`/evolucao`)

**Objetivo:** ver a curva de recuperação no tempo.

**Layout:**
```
H1 "Evolução Mensal"  [ToggleGroup: 6M | 12M | Ano | Tudo]

[KPI x3: Recebido | Pendente | Vencido] com trends

┌─────────────────────────────────────────────────────────┐
│ CHART combinado: barras (Recebido/Pendente/Vencido)     │
│   + linha (Total acumulado) — Recharts ComposedChart    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ TABELA detalhamento mensal com export CSV               │
└─────────────────────────────────────────────────────────┘
```

**Correções vs atual:** filtro por período não só "mês único", KPI com trend, breakdown VitBank/Monetali mais compacto nos cards.

### 5.7 — Atividades (`/atividades`)

**Objetivo:** registrar e consultar histórico de contatos com clientes.

**Layout:**
```
H1 "Atividades"  [MonthFilter]  [Nova Atividade primary]

┌─ Modal "Nova Atividade" ────────────────────────────────┐
│ Cliente: [Combobox com busca ▾]  ← autocomplete         │
│ Tipo:    [Email | Ligação | WhatsApp | Reunião |        │
│           Negociação | Promessa | Escalação Jurídica]   │
│ Data:    [DatePicker default=hoje]                      │
│ Observação: [Textarea com contagem de chars]            │
│ [Cancelar]                    [Registrar primary]       │
└─────────────────────────────────────────────────────────┘

┌─ Histórico (tabela com busca) ──────────────────────────┐
│ [Filtros: Tipo ▾] [Cliente: busca] [Responsável ▾]      │
│                                                         │
│ Data         Cliente          Tipo     Observação   ... │
│ 08/04 14:30  RTT SOLUÇÕES     Email    "Enviei..."  ... │
│ 08/04 11:20  ESVJ ENG.        Ligação  "Atendeu..." ... │
└─────────────────────────────────────────────────────────┘
```

**Correções vs atual:**
- Combobox com busca digitável (resolve P4)
- Tipos expandidos (resolve P5)
- Filtros na tabela de histórico
- Timestamp com hora (não só data)

### 5.8 — Cadastrar (`/cadastrar`)

**Objetivo:** cadastrar cliente manual. Alternativa: Importação.

**Layout:**
```
H1 "Cadastrar Cliente"  caption "Ou use Importação para múltiplos →"

┌─ Form em 2 colunas ─────────────────────────────────────┐
│ Dados Básicos                                           │
│ Nome/Razão Social*    CNPJ                              │
│ Email                 Telefone                          │
│                                                         │
│ Atribuição                                              │
│ Regional*  [Select]   Executivo  [Select]               │
│                                                         │
│ Situação Inicial                                        │
│ Compensação (R$)*     Dias em Atraso    Parcelas        │
│ Situação  [Select: 10 opções, default "NÃO INICIADO"]   │
│                                                         │
│ [Cancelar]                           [Cadastrar primary]│
└─────────────────────────────────────────────────────────┘
```

**Correções vs atual:** 10 opções de status (P1), agrupamento visual (Dados/Atribuição/Situação), email e telefone opcionais adicionados.

### 5.9 — Importação (`/importacao`)

**Objetivo:** subir CSV/XLSX e mapear colunas automaticamente.

**Layout:**
```
H1 "Importação de Dados"

[Tabs: Importação Inteligente (IA) | Importação Manual (em Lote)]

┌─ Tab IA ────────────────────────────────────────────────┐
│                                                         │
│       [drop zone grande com ícone]                      │
│       Arraste seu arquivo ou clique para selecionar     │
│       .csv .xlsx .xls .txt (até 10MB)                   │
│                                                         │
│       — ou —                                            │
│                                                         │
│       [Cole o texto aqui] (textarea)                    │
│                                                         │
│ Formato detectado: auto                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘

→ após upload: preview das colunas mapeadas + confirmação
→ após confirm: progress bar + toast "156 clientes importados"
```

### 5.10 — Premissas (`/premissas`)

**Objetivo:** editar taxas, carência, escalação jurídica, templates de email.

**Layout:**
```
H1 "Premissas"  [Recalcular Juros secondary] [Salvar primary]

[Tabs: Parâmetros | Templates de Email]

┌─ Tab Parâmetros ────────────────────────────────────────┐
│ Juros e Multa                                           │
│ Taxa ao Dia  [0.033]%   Taxa ao Mês  [1.0]%             │
│ Multa por Atraso  [2.0]%                                │
│                                                         │
│ Prazos                                                  │
│ Dias de Carência  [5]                                   │
│ Dias p/ Escalação Jurídica  [90]                        │
│                                                         │
│ Email                                                   │
│ Remetente Padrão  [cobranca@monetali.com.br]            │
└─────────────────────────────────────────────────────────┘

┌─ Tab Templates ─────────────────────────────────────────┐
│ Lista de templates com [Editar] [Duplicar] [Excluir]    │
│ [+ Novo Template]                                       │
└─────────────────────────────────────────────────────────┘
```

**Correções vs atual:**
- Agrupamento visual (Juros/Prazos/Email)
- Botão "Recalcular Juros" com confirmação modal e loading
- Toast ao salvar
- Templates list com ações

---

## 6. Componentes Reutilizáveis

### 6.1 — KpiCard
```
Props: label, value, valueFormat (currency|number|percent), icon, trend?, color
```
Grid 4 colunas desktop, 2 tablet, 1 mobile. Altura fixa 120px. Skeleton loading.

### 6.2 — StatusBadge
```
Props: status: Situacao (10 valores)
```
Badge pill com bg/text/border da cor do status. Uppercase ou title case.

### 6.3 — MonthFilter
```
Props: value, onChange, defaultMostRecent (boolean)
```
Combobox com Jan-Dez do ano atual + "Todos". Quando `defaultMostRecent=true`, seleciona o mês mais recente que tem dado (não o atual do calendário).

### 6.4 — DataTable
```
Props: columns, rows, onRowClick, sortable, filterable, paginated, stickyHeader
```
Usa TanStack Table. Sticky header, zebra opcional, row hover com sombra sutil, ações inline no último cell, paginação footer.

### 6.5 — ClienteDrawer
```
Props: clienteId, open, onClose
```
Drawer lateral 720px, header com ações, tabs de conteúdo. URL sync via query param.

### 6.6 — Modal / ConfirmDialog
```
Props: open, title, description, variant (info|warning|destructive), actions
```
Para ações destrutivas obrigatório.

### 6.7 — Toast / Notification
Lib: sonner (shadcn). Posição top-right desktop, top-center mobile. Success 3s auto, error persistent.

### 6.8 — EmptyState
```
Props: icon, title, description, action?
```
Centralizado, ilustração/ícone grande, CTA primário quando aplicável. Exemplos:
- Dashboard vazio → "Sem dados para este mês" + botão "Ver Todos"
- Inadimplentes vazio → "Nenhum cliente encontrado" + botão "Cadastrar cliente"
- Timeline vazia → "Nenhuma atividade registrada" + botão "Nova atividade"

### 6.9 — LoadingSkeleton
Variants: card, table-row, chart, text. Animação shimmer sutil 1.5s.

### 6.10 — SidebarNav
Sidebar fixa com itens + user block + logout. Collapse em tablet.

### 6.11 — PageHeader
```
Props: title, subtitle?, actions?, breadcrumb?
```
H1 + caption + ações à direita. Usado em todas as páginas.

### 6.12 — FilterChip
```
Props: label, options, selected, multi
```
Botão com ícone ▾ que abre popover de opções. Badge de contagem quando tem seleção.

### 6.13 — CurrencyInput
Input que formata BRL enquanto digita, aceita máscara.

### 6.14 — ClienteCombobox
Autocomplete com busca por nome/CNPJ. Cache em memória da lista de 156 clientes. Performance: usa react-window para listas longas.

---

## 7. Estados Obrigatórios por Tela

Toda tela DEVE ter os 4 estados:

1. **Loading** — skeleton ou spinner contextual
2. **Empty** — EmptyState com CTA
3. **Error** — mensagem + botão "Tentar novamente"
4. **Success** — conteúdo normal

---

## 8. Acessibilidade (WCAG 2.1 AA)

- Contraste mínimo 4.5:1 em todo texto
- Focus visible em todos os interativos (ring 2px primary + offset 2px)
- Navegação por teclado em toda a interface
- ARIA labels em buttons icon-only
- Landmarks semânticos (header, nav, main, aside)
- Touch targets ≥44px em mobile
- Respeitar `prefers-reduced-motion`

---

## 9. Stack Técnica (preservar a atual)

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v3 (manter) + shadcn/ui
- **Charts:** Recharts
- **Tables:** TanStack Table v8
- **Forms:** react-hook-form + zod
- **State:** React Query (@tanstack/react-query) para server state
- **Router:** React Router v6
- **Backend:** Supabase (Postgres + RLS + Edge Functions) — **não mexer**
- **Icons:** lucide-react
- **Toasts:** sonner

---

## 10. Correções Operacionais Incluídas

Lista de todas as correções críticas que o novo frontend deve trazer:

| # | Item | Origem |
|---|---|---|
| 1 | Filtros e selects com 10 status corretos | P1 |
| 2 | Configurar `vercel.json` com rewrite SPA | P2 |
| 3 | Gráfico donut com 10 segmentos | P3 |
| 4 | Combobox de clientes com busca | P4 |
| 5 | Tipos de atividade expandidos (7+) | P5 |
| 6 | Default de filtro = mês mais recente com dado | P6 |
| 7 | Loading skeletons em todas as telas | P7 |
| 8 | EmptyState bem desenhado em todas | P8 |
| 9 | URL compartilhável do drawer cliente | P9 |
| 10 | Reordenar blocos do detalhe (Pagamentos → Cálculo) | P10 |
| 11 | Flags como chips coloridos | P11 |
| 12 | Grid 4×2 dos KPIs | P12 |
| 13 | Sistema tipográfico unificado | P13 |
| 14 | Sistema de espaçamento 8px | P14 |
| 15 | Item ativo do sidebar com borda dourada + bg | P15 |
| 16 | Toast em todas as ações salvar/deletar | P16 |
| 17 | Breadcrumb no header | P17 |
| 18 | Modal de confirmação em destrutivos | P18 |
| 19 | Sticky header na DataTable | P19 |
| 20 | Dark mode (opcional, Phase 2) | P20 |

---

## 11. Comitê de Produto — Review

### 🎯 Estrategista de Negócio
✅ **Forte:** Preserva lógica de negócio, corrige os 10 status que já existem no backend mas não estão expostos. Não aumenta escopo, só destrava valor latente.
⚠️ **Risco:** Rebuild completo é mais demorado que patches pontuais. Se o objetivo é produção imediata, os patches críticos (P1, P2, P3) podem ir em paralelo.
💡 **Sugestão:** Lançar o rebuild como v2 em rota `/v2` mantendo o v1 no root durante 2 semanas para transição.

### 🎨 Designer de Produto / UX
✅ **Forte:** Hierarquia Dashboard → Lista → Drawer é correta. Drawer em vez de nova página mantém contexto.
⚠️ **Risco:** 10 status coloridos diferentes podem ficar "carnaval" se mal calibrados. Validar contraste WCAG de cada um.
💡 **Sugestão:** Primeiro mockup mostrar só os 5 mais usados no filtro e deixar os 5 menos usados em "Mais" dropdown.

### 🏗️ Arquiteto Técnico
✅ **Forte:** Stack preservada (React+TS+Tailwind+shadcn+Supabase). Zero risco de migração técnica. Hooks de dados já estão bem modelados.
⚠️ **Risco:** React Query não está instalado (useState + fetch manual). Adicionar vai mudar vários hooks. Custo médio.
💡 **Sugestão:** Manter o padrão atual de custom hooks (useClientes, useDashboard) e só refatorar pra React Query se bugs de cache aparecerem. Não é pré-requisito do rebuild visual.

### 👥 Advogado do Usuário
✅ **Forte:** Resolve as 3 dores mais graves: filtros quebrados, navegação direta 404, muito clique pra achar cliente.
⚠️ **Risco:** Mudança de UI brusca confunde usuários que já memorizaram o v1.
💡 **Sugestão:** Tour guiado no primeiro acesso ao v2, destacando o que mudou de lugar.

### Tensões identificadas
- **Designer vs Estrategista:** Designer quer rebuild para fazer direito; estrategista quer patches pontuais. → **Veredicto:** rebuild com foco primeiro nos P1/P2/P3 (críticos), depois fase 2 com os 🟡 e cosméticos.
- **Arquiteto vs Designer:** Arquiteto quer manter hooks atuais; designer quer loading skeletons por padrão (requer cache de dados). → **Veredicto:** skeleton mostra durante o primeiro fetch; hooks atuais já suportam estado `loading`, só falta o componente visual.

### Veredicto
✅ **PROSSEGUIR** com o rebuild via Lovable usando o prompt da próxima seção.
🔧 **AJUSTAR:** começar pelas 5 telas críticas (Dashboard, Inadimplentes, Drawer, Atividades, Premissas) e deixar Cadastrar/Importação/Evolução para fase 2.
🛑 **ATENÇÃO:** Vercel rewrites SPA não é responsabilidade do Lovable, é config no deploy — adicionar `vercel.json` manualmente após gerar o projeto.

---

## 12. Próximos Passos

1. **Revisar este briefing** com Mateus e ajustar escopo (lista de correções, priorização)
2. **Rodar o prompt do Lovable** (`prompt-lovable-novo-frontend.md`)
3. **Validar primeira build** gerada: Dashboard + Inadimplentes + Drawer
4. **Iterar** com prompts incrementais pra cada tela que ficar diferente do spec
5. **Integrar com Supabase existente** (mesmas variáveis de env)
6. **Deploy em `/v2` route** no Vercel, rodar 2 semanas em paralelo com o v1
7. **Cutover** quando estiver validado
8. **Limpar código v1**
