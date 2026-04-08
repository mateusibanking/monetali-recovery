# Referências de Design — Novo Frontend Monetali Recovery

Coletânea de referências visuais e direcionais para guiar a construção do novo frontend no Lovable. As referências foram selecionadas por alinhamento com o contexto do produto: **B2B SaaS financeiro, dashboards densos de dados, operadores que usam 6–8h/dia, credibilidade corporativa**.

---

## Eixo 1 — Dashboards de cobrança e gestão de inadimplência

Referências diretas do nicho. Mostram como outros produtos organizam KPIs de recuperação, aging buckets e drill-down cliente a cliente.

### 1.1 — Debt Collection tag no Dribbble
**URL:** https://dribbble.com/tags/debt-collection
**Por que olhar:** Curadoria de interfaces do mesmo nicho. Boa para ver padrões recorrentes — a maioria mostra uma combinação de KPI cards (topo), gráfico de aging buckets (meio) e lista de contas priorizadas (baixo).
**O que aproveitar:** Hierarquia vertical Dashboard → Lista → Detalhe. Badges de status com cores semânticas consistentes.

### 1.2 — Designing better UX for online debt collector (Spyro-Soft)
**URL:** https://spyro-soft.com/blog/fintech/online-debt-collector-designing-better-ux-for-financial-products
**Por que olhar:** Case study completo de um produto real de cobrança. Explica decisões de hierarquia de informação para operadores que pulam entre dezenas de contas por dia.
**O que aproveitar:** A lógica de "contact rate, payment promise, collection ratio" como KPIs dominantes. Princípio: **métricas críticas visíveis sem scroll**.

### 1.3 — Onboarding design for a debt collection platform (Lazarev)
**URL:** https://dribbble.com/shots/21200875-Onboarding-design-for-a-debt-collection-platform-Lazarev
**Por que olhar:** Tratamento visual profissional e moderno para um produto sério de cobrança. Boa referência de tom — formal sem ser burocrático.
**O que aproveitar:** Paleta sóbria com um acento quente para CTAs. Tipografia corporativa com leitura confortável.

---

## Eixo 2 — Dashboards financeiros minimalistas e profissionais

Referência de **estética** e organização de dados financeiros pesados.

### 2.1 — 50 Best Dashboard Design Examples for 2026 (Muzli)
**URL:** https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/
**Por que olhar:** Curadoria grande e atual. Destaque para Zenith Dashboard (abordagem radicalmente minimal, acromática, com variação Finance) e Vault (estética clean tipo Robinhood).
**O que aproveitar:** O padrão "white-themed + modular cards + generoso whitespace". Esse é o template base do novo frontend.

### 2.2 — Qlik Financial Dashboards
**URL:** https://www.qlik.com/us/dashboard-examples/financial-dashboards
**Por que olhar:** Exemplos de dashboards financeiros de nível enterprise. Mostra como lidar com KPIs de alto volume sem sobrecarregar o olho.
**O que aproveitar:** Uso de **grupos visuais** (cards agrupados por tema) e progressive disclosure — métricas secundárias só aparecem quando o usuário expande/clica.

---

## Eixo 3 — CRM dashboards B2B SaaS (clean & minimal)

Referência para a **estrutura de navegação** (sidebar + header + content), listas de contas e detalhe lateral.

### 3.1 — Shadcn Admin
**URL:** https://github.com/satnaing/shadcn-admin
**Por que olhar:** Implementação real do padrão shadcn/ui que já está no nosso projeto. Template copy-paste de CRM com dashboard, Customers, Invoices, Leads, Orders. Full responsivo, dark mode, tipografia limpa.
**O que aproveitar:** Estrutura de arquivos, componentes DataTable com filtros/sorting/paginação, padrão de drawer lateral para detalhe.

### 3.2 — TailAdmin Pro (SaaS Dashboard)
**URL:** https://tailadmin.com/blog/saas-dashboard-templates
**Por que olhar:** Templates Tailwind v4 feitos especificamente para SaaS. Vários variants incluindo Fintech e CRM.
**O que aproveitar:** Sidebar com ícones + labels (300px), cards KPI com trend indicator (↑ 12.5%), charts Recharts bem configurados.

### 3.3 — Zenith Dashboard (Envato / ThemeForest)
**URL via Muzli:** https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/
**Por que olhar:** O mais próximo do visual que o produto pede: abordagem achromatic minimal com 57+ páginas, incluindo CRM contact management. Adapta-se a qualquer identidade com poucas mudanças CSS.
**O que aproveitar:** Sistema de espaçamento (8px grid), tipografia neutra (sans-serif geométrica), dark mode com elevation via lighter bg (não sombras).

---

## Eixo 4 — Admin panels fintech com sidebar e dark mode opcional

Referência para **densidade de informação** (Bloomberg-style) e o esquema visual sidebar escura + content claro.

### 4.1 — 10 Best Fintech & Banking Dashboard Templates (AdminLTE)
**URL:** https://adminlte.io/blog/fintech-banking-dashboard-templates/
**Por que olhar:** Lista focada em fintech. Destaca Vault (portfolio tracking, multi-asset, risk assessment) e outros templates com densidade alta de dados.
**O que aproveitar:** Como mostrar muitos números na mesma tela sem bagunçar — uso de **grids alinhados**, tipografia monoespaçada para valores, cores semânticas consistentes (verde sobe, vermelho cai).

### 4.2 — 8+ Best Sidebar Menu Design Examples 2026 (Navbar Gallery)
**URL:** https://www.navbar.gallery/blog/best-side-bar-navigation-menu-design-examples
**Por que olhar:** Curadoria específica de sidebars modernas.
**O que aproveitar:** Sidebar escura (navy/charcoal) com content claro cria hierarquia imediata. Largura 240–280px. **Ícones + texto** — ícone melhora scan, texto garante clareza. Item ativo com bg de acento + borda lateral.

### 4.3 — Tremor Components
**URL:** https://tremor.so/
**Por que olhar:** Biblioteca React open-source de 35+ componentes de dashboard e chart. Construída em cima de Tailwind + Radix, mesma base do shadcn. Cards KPI, ProgressBars, DonutChart, AreaChart, BarList — tudo acessível e bonito por default.
**O que aproveitar:** Não precisa usar a lib direto (já temos recharts), mas os **padrões visuais** são ouro: card com label, valor grande, variação percentual pequena, ícone no canto.

---

## Eixo 5 — Paleta e identidade Monetali

Não é referência externa, é a identidade atual do sistema que deve ser **preservada e refinada** no novo frontend.

### 5.1 — Paleta atual (do `index.css`)
- **Primário:** `hsl(218 79% 22%)` — azul naval profundo (confiança, autoridade financeira)
- **Acento:** `hsl(42 56% 55%)` — dourado quente (premium, institucional)
- **Sidebar bg:** `hsl(218 79% 22%)` (primário) com foreground claro
- **Background main:** `hsl(0 0% 100%)` (branco puro)
- **Card bg:** `hsl(210 20% 98%)` (cinza muito claro, sutil)
- **Warning:** `hsl(38 92% 50%)` / **Destructive:** `hsl(0 72% 51%)` / **Success:** `hsl(160 84% 39%)`

### 5.2 — Tipografia atual
- **Display (títulos):** Montserrat 700/800
- **Body:** Inter 300–600
- **Logo:** Arvo serif
- **Mono (valores monetários):** JetBrains Mono

**Observação:** Inter em títulos é contra a regra do design system (personalidade fraca). Manter Montserrat para H1-H3 é a escolha certa. Valores em JetBrains Mono já é uma decisão boa porque alinha os números em colunas.

---

## Resumo — Direção Visual do Novo Frontend

Juntando as referências acima, o novo frontend do Monetali Recovery deve ser:

1. **Sidebar escura (navy Monetali) + content claro** — hierarquia imediata, vira marca.
2. **Cards KPI com label, valor mono, trend opcional** — padrão Tremor/TailAdmin.
3. **Generoso whitespace** — estilo Zenith, não bagunçar a tela mesmo com muitos dados.
4. **Drill-down consistente:** Dashboard → Lista filtrada → Drawer de detalhe (não página nova).
5. **Badges de status semânticos** com cores dedicadas para cada um dos 10 status.
6. **Tabela densa mas escaneável:** sticky header, zebra OU borda (não ambos), sort visual, row hover com ação inline.
7. **Dark mode opcional** — não é obrigatório, mas preparar as variáveis CSS dual-mode desde o início.
8. **Tom corporativo, mas humano** — Lazarev ref, não burocrático.

---

## Links consolidados (para copiar rapidinho)

- https://dribbble.com/tags/debt-collection
- https://spyro-soft.com/blog/fintech/online-debt-collector-designing-better-ux-for-financial-products
- https://dribbble.com/shots/21200875-Onboarding-design-for-a-debt-collection-platform-Lazarev
- https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/
- https://www.qlik.com/us/dashboard-examples/financial-dashboards
- https://github.com/satnaing/shadcn-admin
- https://tailadmin.com/blog/saas-dashboard-templates
- https://adminlte.io/blog/fintech-banking-dashboard-templates/
- https://www.navbar.gallery/blog/best-side-bar-navigation-menu-design-examples
- https://tremor.so/
