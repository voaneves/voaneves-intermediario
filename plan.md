# Plano de Unificação dos Estilos

Migração ponta-a-ponta do `playful.css` para o pipeline SCSS, eliminação do prefixo `v4-` e consolidação dos arquivos legados em uma única arquitetura modular.

---

## 1. Diagnóstico

O projeto opera hoje com **dois pipelines paralelos** que produzem o CSS final:

O primeiro pipeline parte de `assets/styles/styles.scss` e seus parciais (`_header`, `_sidebar`, `_cursor`, `_animations`, etc.), compilando para `assets/styles/styles.css` via Sass. Esse fluxo cobre o que se pode chamar de "estilos legados": layout base, palette `--color-*`, marquees, accordion, animações `spazz`/`neon`/`glitch`, e classes históricas como `.header-content`, `.who-content`, `.work-content`, `.timeline`, `.portfolio-content`, `.services-content`, `.contact-content`.

O segundo pipeline é o `assets/styles/playful.css`, que **não tem fonte SCSS**. É CSS hand-written, com cerca de 2500 linhas, contendo a totalidade do design "v4": tokens próprios (`--ink`, `--cream`, `--signal`), reset, navegação, hero, todas as seções v4, drawer mobile, animações de cursor e badge, sistema de temas (light/dark/default), efeito brush-reveal, magnetismo de chips. É um overlay massivo aplicado **por cima** do legado.

A markup em `index.html` reflete o estado intermediário da migração que foi feita em algum momento sem finalização. Cada `<section>` tipicamente carrega **as duas classes ao mesmo tempo**: legada e v4-prefixada. Exemplos:

```html
<section class="header-content v4-hero" id="home">
<section class="work v4-stats" id="work">
<section class="expertise v4-expertise" id="expertise">
<section class="timeline v4-timeline" id="timeline">
<section class="portfolio-content v4-portfolio" id="portfolio">
<section class="services-content v4-services" id="services">
<section class="contact v4-contact" id="contact">
```

E vários elementos carregam o **prefixo duplicado** `.v4-v4-*` — claros artefatos de uma refatoração feita com find-and-replace mal calibrado (`.v4-v4-hero-name-col`, `.v4-v4-hero-line--right`, `.v4-v4-hero-photo-cutout`, `.v4-v4-hero-photo-glow`, `.v4-v4-hero-decor-chip`, `.v4-v4-scroll-cue-arrow`, `.v4-v4-hero-img--a`). Isso é um cheiro forte de que a migração v3 → v4 nunca foi concluída.

Os problemas reais que essa dualidade causa hoje:

**Conflitos de cascade.** As regras legadas (em `styles.css`) competem com as regras v4 (em `playful.css`). Em vários pontos eu mesmo precisei adicionar `!important` para forçar uma ou outra prevalecer. A palette `--color-white` (legada) responde a `prefers-color-scheme` mas a `--cream` (v4) responde a classes `.dark-mode`/`.light-mode` — quando o usuário toggleia o tema em um sistema com preferência oposta, os dois palettes saem dessincronizados (fonte real da maioria dos bugs de contraste recentes).

**Documentação fragmentada.** Decisões de design vivem em comentários espalhados pelos dois arquivos. Não existe um `_tokens.scss` único.

**Performance subótima.** O navegador baixa `styles.css` (~40KB) e `playful.css` (~50KB), totalizando ~90KB descomprimidos só de CSS. Significativa parte é regra redundante (mesma propriedade definida nos dois arquivos). Uma compilação consolidada removeria a duplicação e poderia chegar a ~55–65KB.

**Manutenibilidade.** Adicionar uma nova seção hoje exige: editar `styles.scss`, compilar, editar `playful.css` manualmente, ajustar `index.html` para incluir as duas classes, possivelmente atualizar `playful.js` para encontrar os elementos certos. Quatro lugares para manter sincronizados.

**O prefixo `v4-` não comunica nada.** Não há `v1`, `v2`, `v3` em produção. O "v4" foi uma sigla interna durante o redesign e ficou. Quem chega no código hoje passa minutos perguntando se existe uma `v3-hero` em algum lugar. Não existe — é só naming inertia.

---

## 2. Princípios da migração

**Single source of truth.** Todo CSS de produção é compilado a partir de SCSS. O `playful.css` deixa de existir como arquivo independente; seu conteúdo vira parciais. O `index.html` carrega um único `<link>` para `styles.css`.

**Naming sem versionamento.** A intuição do usuário está correta: classe deve descrever **o que é**, não a versão. O hero é o hero. Não é `v4-hero` — é simplesmente `hero`. Se um dia houver uma reformulação radical do hero, ela substitui o hero atual, não convive em paralelo.

**BEM leve.** Para evitar colisões entre estilos de elementos próximos, adoto a convenção `.block`, `.block__element`, `.block--modifier`. Hero name vira `.hero__name`. Hero status pill vira `.hero__status`. Não puro BEM (que seria estrito demais), mas o suficiente para namespace cada componente sem precisar de prefixo global.

**Tokens centralizados.** Toda cor, espaçamento, tipografia, breakpoint e timing function nasce em `_tokens.scss`. Nenhum valor hardcoded fora de lá. Mudar o vermelho de signal é uma edição em uma linha.

**Sistema de tema em três camadas.** `:root` carrega defaults (tema light). `@media (prefers-color-scheme: dark) :root` carrega overrides que respeitam o sistema operacional. `.light-mode` / `.dark-mode` na `<body>` carregam overrides explícitos do usuário (toggle), que **vencem** o sistema por especificidade. Sem `.v4` na frente — a classe sozinha basta.

**Partial por seção.** Cada seção da página é um partial SCSS dedicado. `_hero.scss`, `_intro.scss`, `_stats.scss`, etc. Cada partial é responsável por seu BEM e suas media queries internas. Convenção mata caos.

**Componentes compartilhados separados.** Coisas que aparecem em mais de uma seção (marquee, ripple, cursor, badge) viram parciais próprios e são importados onde necessário.

**Performance via mixin.** Os mixins de breakpoint do `_include.scss` (criados anteriormente) viram a única forma de escrever media queries. Isso garante consistência e permite refatoração em massa via mudança no map de breakpoints.

---

## 3. Arquitetura alvo

```
assets/styles/
├── styles.scss                  (entry — apenas @imports e ordem)
│
│   FUNDAÇÃO (carregado primeiro)
├── _include.scss                (mixins, fluid(), breakpoints — já existe)
├── _tokens.scss                 (NOVO — design tokens: cores, type, spacing)
├── _theme.scss                  (NOVO — light/dark/system theme rules)
├── _reset.scss                  (NOVO — global reset, *, body, section)
├── _typography.scss             (NOVO — type scale aplicada)
│
│   COMPONENTES COMPARTILHADOS
├── _animations.scss             (mantém — keyframes globais)
├── _cursor.scss                 (refatorado — absorve .pf-cur/.pf-ring de playful)
├── _marquee.scss                (NOVO — componente .marquee reusável)
├── _ripple.scss                 (NOVO — efeito de ripple em CTAs)
├── _selection.scss              (mantém)
├── _scrollbar.scss              (mantém)
├── _toast.scss                  (mantém)
├── _dropdown.scss               (mantém — usado pelo translate menu)
│
│   LAYOUT E NAVEGAÇÃO
├── _nav.scss                    (NOVO — navbar principal + utility buttons + CTA)
├── _drawer.scss                 (NOVO — mobile menu drawer)
├── _badge.scss                  (NOVO — rotating cursor-follow badge)
│
│   SEÇÕES DA PÁGINA
├── _hero.scss                   (NOVO — hero section completo, inclui brush-reveal canvas)
├── _intro.scss                  (NOVO — "Quem sou" — substitui who-content)
├── _stats.scss                  (NOVO — "Números" — substitui work-content)
├── _expertise.scss              (NOVO — marquees de expertise — substitui expertise legado)
├── _timeline.scss               (NOVO — "Jornada" cards horizontais)
├── _portfolio.scss              (NOVO — "Projetos" lista vertical)
├── _services.scss               (NOVO — bento grid + accordion)
├── _contact.scss                (NOVO — bloco de contato + glitch)
├── _footer.scss                 (NOVO — footer + marquee outline)
│
│   ESTADO TEMPORÁRIO DURANTE A MIGRAÇÃO
└── _legacy.scss                 (NOVO — abriga classes antigas só durante a transição,
                                  cada bloco com um TODO marcando data de remoção)
```

O `styles.scss` final fica essencialmente assim:

```scss
/* Fundação */
@import "include";
@import "tokens";
@import "theme";
@import "reset";
@import "typography";

/* Componentes compartilhados */
@import "animations";
@import "cursor";
@import "marquee";
@import "ripple";
@import "selection";
@import "scrollbar";
@import "toast";
@import "dropdown";

/* Layout */
@import "nav";
@import "drawer";
@import "badge";

/* Seções (na ordem visual da página) */
@import "hero";
@import "intro";
@import "stats";
@import "expertise";
@import "timeline";
@import "portfolio";
@import "services";
@import "contact";
@import "footer";

/* Limbo */
@import "legacy"; // remover quando todos os blocos forem migrados
```

A ordem importa por causa do cascade: tokens antes de tudo que usa tokens, theme antes do que pode ser sobrescrito pelo theme, componentes antes das seções que os consomem.

---

## 4. Mapa de renomeação de classes

Tabela completa, agrupada por bloco. A coluna "Tipo" indica se a classe nova é um Block, Element ou Modifier no esquema BEM.

### Navegação e drawer

| Classe antiga                          | Classe nova                | Tipo     | Notas                                   |
|----------------------------------------|----------------------------|----------|-----------------------------------------|
| `.v4-nav`                              | `.nav`                     | Block    |                                         |
| `.v4-mark`                             | `.nav__mark`               | Element  |                                         |
| `.v4-nav-links`                        | `.nav__links`              | Element  |                                         |
| `.v4-nav-right`                        | `.nav__right`              | Element  |                                         |
| `.v4-nav-toggle`                       | `.nav__toggle`             | Element  | hamburger button mobile                 |
| `.v4-nav-toggle-bar`                   | `.nav__toggle-bar`         | Element  |                                         |
| `.v4-utility`                          | `.utility-btn`             | Block    | botões de tema/translate                |
| `.v4-cta`                              | `.cta`                     | Block    |                                         |
| `.v4-cta-pill`                         | `.cta--pill`               | Modifier |                                         |
| `.v4-cta-dot`                          | `.cta__dot`                | Element  |                                         |
| `.v4-skip`                             | `.skip-link`               | Block    |                                         |
| `.v4-drawer`                           | `.drawer`                  | Block    |                                         |
| `.v4-drawer-backdrop`                  | `.drawer__backdrop`        | Element  |                                         |
| `.v4-drawer-panel`                     | `.drawer__panel`           | Element  |                                         |
| `.v4-drawer-head`                      | `.drawer__head`            | Element  |                                         |
| `.v4-drawer-mark`                      | `.drawer__mark`            | Element  |                                         |
| `.v4-drawer-close`                     | `.drawer__close`           | Element  |                                         |
| `.v4-drawer-nav`                       | `.drawer__nav`             | Element  |                                         |
| `.v4-drawer-link`                      | `.drawer__link`            | Element  |                                         |
| `.v4-drawer-num`                       | `.drawer__num`             | Element  |                                         |
| `.v4-drawer-text`                      | `.drawer__text`            | Element  |                                         |
| `.v4-drawer-arrow`                     | `.drawer__arrow`           | Element  |                                         |
| `.v4-drawer-footer`                    | `.drawer__footer`          | Element  |                                         |
| `.v4-drawer-cta`                       | `.drawer__cta`             | Element  |                                         |
| `.v4-drawer-utility-row`               | `.drawer__utility-row`     | Element  |                                         |
| `.v4-drawer-utility`                   | `.drawer__utility`         | Element  |                                         |
| `.v4-drawer-meta`                      | `.drawer__meta`            | Element  |                                         |

### Hero (a seção que tem mais prefixos duplos para corrigir)

| Classe antiga                          | Classe nova                | Tipo     | Notas                                   |
|----------------------------------------|----------------------------|----------|-----------------------------------------|
| `.v4-hero` (+ `.header-content`)       | `.hero`                    | Block    | remove legado `.header-content`         |
| `.v4-hero-grid`                        | `.hero__grid`              | Element  |                                         |
| `.v4-v4-hero-name-col`                 | `.hero__name-col`          | Element  | corrige prefixo duplo                   |
| `.v4-hero-name`                        | `.hero__name`              | Element  |                                         |
| `.v4-hero-line`                        | `.hero__line`              | Element  |                                         |
| `.v4-v4-hero-line--right`              | `.hero__line--right`       | Modifier | corrige prefixo duplo                   |
| `.v4-hero-meta`                        | `.hero__meta`              | Element  |                                         |
| `.v4-hero-status`                      | `.hero__status`            | Element  |                                         |
| `.v4-hero-photo` (+ `.middle`)         | `.hero__photo`             | Element  | remove legado `.middle`                 |
| `.v4-aurora`                           | `.hero__aurora`            | Element  |                                         |
| `.v4-aurora-blob`                      | `.hero__aurora-blob`       | Element  |                                         |
| `.v4-aurora--orange/blue/pink/...`     | `.hero__aurora-blob--orange/...` | Modifier |                                   |
| `.v4-hero-orb`                         | `.hero__orb`               | Element  |                                         |
| `.v4-hero-stage-inner`                 | `.hero__stage`             | Element  |                                         |
| `.v4-v4-hero-photo-cutout`             | `.hero__cutout`            | Element  | corrige prefixo duplo                   |
| `.v4-hero-img`                         | `.hero__img`               | Element  |                                         |
| `.v4-v4-hero-img--a`                   | `.hero__img--primary`      | Modifier | corrige prefixo duplo                   |
| `.v4-v4-hero-photo-glow`               | `.hero__photo-glow`        | Element  | corrige prefixo duplo                   |
| `.v4-hero-reveal`                      | `.hero__reveal`            | Element  | canvas do brush-reveal                  |
| `.v4-hero-decor`                       | `.hero__decor`             | Element  |                                         |
| `.v4-v4-hero-decor-chip`               | `.hero__chip`              | Element  | corrige prefixo duplo                   |
| `.v4-hero-bottom`                      | `.hero__bottom`            | Element  |                                         |
| `.v4-hero-tags`                        | `.hero__tags`              | Element  |                                         |
| `.v4-scroll-cue`                       | `.hero__scroll-cue`        | Element  |                                         |
| `.v4-v4-scroll-cue-arrow`              | `.hero__scroll-cue-arrow`  | Element  | corrige prefixo duplo                   |
| `.v4-hero-badge`                       | `.badge`                   | Block    | virou componente próprio                |
| `.v4-badge-text`                       | `.badge__text`             | Element  |                                         |
| `.v4-badge-center`                     | `.badge__center`           | Element  |                                         |
| `.name-marquee` (legado, dentro hero)  | `.hero__marquee`           | Element  |                                         |

### Demais seções

| Classe antiga                          | Classe nova                | Tipo     | Notas                                   |
|----------------------------------------|----------------------------|----------|-----------------------------------------|
| `.v4-intro` (+ `.who-content`)         | `.intro`                   | Block    |                                         |
| `.v4-intro-grid`                       | `.intro__grid`             | Element  |                                         |
| `.v4-intro-statement`                  | `.intro__statement`        | Element  |                                         |
| `.v4-statement-line`                   | `.intro__statement-line`   | Element  |                                         |
| `.v4-intro-side`                       | `.intro__side`             | Element  |                                         |
| `.v4-intro-meta`                       | `.intro__meta`             | Element  |                                         |
| `.v4-stats` (+ `.work` + `.work-content`) | `.stats`               | Block    |                                         |
| `.v4-stats-grid`                       | `.stats__grid`             | Element  |                                         |
| `.v4-stat`                             | `.stat`                    | Block    | reusável                                |
| `.v4-stat-num`                         | `.stat__num`               | Element  |                                         |
| `.v4-stat-suffix`                      | `.stat__suffix`            | Element  |                                         |
| `.v4-stat-label`                       | `.stat__label`             | Element  |                                         |
| `.v4-expertise` (+ `.expertise`)       | `.expertise`               | Block    |                                         |
| `.expertise-marquees`                  | `.expertise__marquees`     | Element  |                                         |
| `.v4-timeline` (+ `.timeline`)         | `.timeline`                | Block    |                                         |
| `.v4-timeline-head`                    | `.timeline__head`          | Element  |                                         |
| `.v4-timeline-title`                   | `.timeline__title`         | Element  |                                         |
| `.v4-timeline-cta`                     | `.timeline__cta`           | Element  |                                         |
| `.v4-timeline-hint`                    | `.timeline__hint`          | Element  |                                         |
| `.v4-timeline-wrapper`                 | `.timeline__wrapper`       | Element  |                                         |
| `.v4-track`                            | `.timeline__track`         | Element  |                                         |
| `.v4-tcard` (+ `.card`)                | `.timeline__card`          | Element  |                                         |
| `.v4-tcard-meta`                       | `.timeline__card-meta`     | Element  |                                         |
| `.v4-tcard-year`                       | `.timeline__card-year`     | Element  |                                         |
| `.v4-tcard-co`                         | `.timeline__card-co`       | Element  |                                         |
| `.v4-tcard-role`                       | `.timeline__card-role`     | Element  |                                         |
| `.v4-portfolio` (+ `.portfolio-content`) | `.portfolio`             | Block    |                                         |
| `.v4-portfolio-head`                   | `.portfolio__head`         | Element  |                                         |
| `.v4-portfolio-title`                  | `.portfolio__title`        | Element  |                                         |
| `.v4-portfolio-sub`                    | `.portfolio__sub`          | Element  |                                         |
| `.v4-projects`                         | `.portfolio__list`         | Element  |                                         |
| `.v4-project` (+ `.portfolio-card`)    | `.project`                 | Block    |                                         |
| `.v4-project-num`                      | `.project__num`            | Element  |                                         |
| `.v4-project-name`                     | `.project__name`           | Element  |                                         |
| `.v4-project-meta`                     | `.project__meta`           | Element  |                                         |
| `.v4-services` (+ `.services-content`) | `.services`                | Block    |                                         |
| `.v4-services-head`                    | `.services__head`          | Element  |                                         |
| `.v4-services-title`                   | `.services__title`         | Element  |                                         |
| `.v4-bento` (+ `.services-accordion`)  | `.bento`                   | Block    |                                         |
| `.v4-bento-item`                       | `.bento__item`             | Element  |                                         |
| `.v4-contact` (+ `.contact`)           | `.contact`                 | Block    |                                         |
| `.v4-contact-statement`                | `.contact__statement`      | Element  |                                         |
| `.v4-contact-meta`                     | `.contact__meta`           | Element  |                                         |
| `.v4-contact-icons`                    | `.contact__icons`          | Element  |                                         |
| `.v4-email-btn`                        | `.contact__email-btn`      | Element  |                                         |
| `.v4-email-meta`                       | `.contact__email-meta`     | Element  |                                         |
| `.v4-footer`                           | `.footer`                  | Block    |                                         |
| `.v4-footer-row`                       | `.footer__row`             | Element  |                                         |
| `.v4-footer-mark`                      | `.footer__mark`            | Element  |                                         |
| `.v4-footer-meta`                      | `.footer__meta`            | Element  |                                         |
| `.v4-footer-link`                      | `.footer__link`            | Element  |                                         |
| `.v4-footer-marquee`                   | `.footer__marquee`         | Element  |                                         |
| `.v4-section-tag`                      | `.section-tag`             | Block    | reusável em várias seções               |
| `.v4` (na body)                        | `.app` ou simplesmente removido | —    | discutido na fase 3                     |

Modificadores de tema também perdem o prefixo:

| Classe antiga       | Classe nova    |
|---------------------|----------------|
| `.v4.light-mode`    | `.light-mode`  |
| `.v4.dark-mode`     | `.dark-mode`   |

---

## 5. Fases de execução

A migração acontece em **seis fases**. Cada fase é commit-isolada, testável de forma independente e reversível. Nenhuma fase pode quebrar a página em produção — todas devem manter o site visualmente idêntico (com exceção da Fase 5, que pode descobrir regressões que se tornam visíveis após a remoção do legado).

### Fase 1 — Tokens e tema (zero impacto visual)

Cria `_tokens.scss` extraindo todas as variáveis CSS (`--ink`, `--cream`, `--signal`, `--pad-x`, `--pad-y`, `--font-display`, `--font-mono`, breakpoints, etc.) dos arquivos atuais. Cria `_theme.scss` com a estrutura de três camadas (`:root` + `@media (prefers-color-scheme: dark)` + `.light-mode/.dark-mode`).

Reordena `styles.scss` para importar esses dois primeiros. Os parciais existentes (`_header`, etc.) e o `playful.css` continuam intactos.

Validação: a página deve renderizar exatamente igual. As variáveis estão agora declaradas em dois lugares (parcial novo + arquivos antigos) — isso é OK temporariamente porque a definição posterior na cascade vence. Conferir com DevTools que `--ink` resolve para `#0a0a0a` em modo default. Comparar screenshots antes/depois.

Reverte em uma linha: deletar dois `@import` em `styles.scss`.

### Fase 2 — Extração estrutural do `playful.css`

Aqui o `playful.css` é despedaçado nos parciais SCSS correspondentes. Nenhuma classe é renomeada ainda; só movemos código de arquivo. Cada bloco do playful vira o conteúdo de seu partial SCSS:

A nav vai para `_nav.scss`. O drawer vai para `_drawer.scss`. O hero (incluindo todas as suas regras de aurora, orb, brush-reveal, decor chips, marquee interno) vai para `_hero.scss`. E assim por diante.

Decisões para tomar nesta fase: regras genuinamente compartilhadas (como `.v4-section-tag`, animações de keyframe, mixins de transição) vão para parciais utilitários (`_reset.scss`, `_animations.scss`, `_marquee.scss`).

No final da fase, o `playful.css` está vazio. O `<link rel="preload" href="playful.css">` no `index.html` é removido. Tudo passa por `styles.css` (compilado do SCSS).

Validação: comparação visual exaustiva. Como nenhuma classe foi renomeada, qualquer regressão é puramente de cascade — a ordem dos imports em `styles.scss` pode precisar de ajuste fino. O dev tools de "Computed" em vários elementos críticos confirma que os mesmos valores resolvem.

Reverte: revert do commit. O `playful.css` volta ao seu lugar.

### Fase 3 — Renomeação de classes (a fase grande)

A mudança de nomes acontece **por seção**, não tudo de uma vez. A unidade de trabalho é "uma seção completa" — `_hero.scss` + tags `.v4-hero*` no `index.html` + referências no `playful.js`/`.min.js` — tudo em um único commit por seção. Isso garante que se algo quebrar, o blast radius é localizado.

A ordem sugerida vai do mais isolado para o mais entrelaçado:

Primeiro `_badge.scss` (sozinho, sem dependências de seção). Depois `_drawer.scss` (também isolado). Depois `_nav.scss`. Depois cada seção da página: `_footer.scss`, `_contact.scss`, `_services.scss`, `_portfolio.scss`, `_timeline.scss`, `_expertise.scss`, `_stats.scss`, `_intro.scss`. O `_hero.scss` por último, porque é o mais complexo (mais elementos, mais JS interagindo, mais animações).

Para cada seção, o procedimento:

Edita-se o parcial SCSS substituindo todos os `.v4-foo-bar` por `.foo__bar` (ou o nome novo correspondente da tabela acima). Edita-se `index.html` removendo o prefixo `v4-` e a classe legada da seção (`<section class="header-content v4-hero">` vira `<section class="hero">`). Faz-se busca por `v4-hero` em `playful.js` e `playful.min.js`, substituindo todos os hits pela classe nova.

Validação por seção: compila SCSS, abre o site, verifica que a seção renderiza igual. Testa interações (hover, click, animação). Faz screenshot. Compara com baseline.

Reverte: o commit individual.

Casos especiais durante essa fase:

A classe `.v4` na `<body>` (`<body class="main-content v4">`) é usada como ancorador de especificidade em várias regras (`.v4 .v4-hero`, `.v4 section`). Discutir se deve virar `.app`, virar simplesmente removida (regras passam a usar apenas o nome do bloco) ou permanecer como flag de "novo design" enquanto o legacy existir. Recomendação: **remover** e ajustar as regras dependentes — não há motivo para manter um flag global se há um só design.

Classes utilitárias do CSS legado (`.bold`, `.highlight`, `.call-to-action`, `.btn-con`) podem ter colisões com BEM moderno. Auditadas individualmente — se ainda usadas, viram parciais próprios; se não, removidas.

### Fase 4 — Atualização do JavaScript

`playful.js` (e seu `.min.js` deployed) tem ~70 querySelectors com classes V4. Cada um precisa atualizar. Já catalogado durante a fase 3 (substituições já feitas por seção), aqui a fase é principalmente validação e cleanup.

Pontos críticos de JS a verificar:

`initCursor()` busca por `.v4-hero-photo`, `.v4-hero-badge`. Atualizar para `.hero__photo`, `.badge`.

`initMagnetic()` busca por `.v4-cta`, `.v4-utility`, `.v4-email-btn .glitch`, `.icon`. Atualizar.

`initHeroAurora()` (que carrega o efeito chip magnet + aurora) busca por `.v4-hero-photo`, `.v4-aurora`, `.v4-v4-hero-photo-cutout`, `.v4-hero-orb`, `.v4-v4-hero-decor-chip`. Atualizar para o novo BEM.

`initHeroBrushReveal()` busca por `.v4-hero-photo`, `.v4-hero-img`, `.v4-v4-hero-photo-cutout`, `.v4-hero-reveal`. Atualizar.

`initInfiniteSlider()` busca por `[data-infinite]`. Provavelmente OK (data-attr, não classe).

`initDragScroll()` busca por `[data-drag-scroll]`. OK.

Outros: cada `classList.add()` e `classList.remove()` no JS que adiciona classes (como `is-active`, `is-hover`, `is-on-photo`) — essas classes-state se mantêm, apenas as classes-base mudam.

O `playful.min.js` que está sendo carregado pelo `index.html` precisa ser regenerado (minificação) ou substituído pela versão atualizada do `playful.js`. Recomendação: pular esse arquivo dual e passar a carregar o `playful.js` não-minificado durante a transição; quando estável, rebuild do `.min.js` para produção.

### Fase 5 — Limpeza do legado

Com Fase 3 e 4 estáveis, hora de remover o `_legacy.scss` e o que sobrou de regras legadas:

Em `index.html`, o `<style>` inline com regras `.header-content .middle .image { ... }` (já parcialmente limpo em rounds anteriores) — remover totalmente, mover o que sobra para o partial relevante.

Em `_header.scss` legado, a palette `--color-*` provavelmente tem uso ainda em algum componente (marquee herdado). Auditar: cada `var(--color-*)` que sobreviveu virou alias de `--ink`/`--cream`? Refatorar para usar os tokens novos diretamente.

Em `styles.scss`, classes que sobreviveram à fase 3 (regras `.who-content`, `.work-content`, etc.) e não foram atacadas (porque acreditávamos que ainda eram usadas) — remover se a busca por `class="who-content"` no `index.html` voltar zero hits.

O `playful.css` (que ficou vazio na Fase 2) — deletar do projeto. Remover o `<link>` do `index.html`.

O `playful.min.js` — discutível. Se a Fase 4 deixou ele atualizado, mantém. Se durante a Fase 4 mudamos pra carregar o `playful.js` não-minificado, rebuilda agora.

Validação final: build limpo do Sass, screenshot completa da página em dois temas e dois breakpoints (mobile + desktop), comparação com baselines.

### Fase 6 — Documentação e métricas

`README.md` ganha seção sobre arquitetura de CSS: estrutura de parciais, convenção BEM, como adicionar uma seção nova, como adicionar um token novo.

Métricas de antes/depois (idealmente capturadas):

Tamanho do CSS gzipped servido para o navegador. Hoje aproximadamente 90KB ungzipped (styles + playful). Meta: <60KB ungzipped, <12KB gzipped.

Número de seletores totais. Hoje provavelmente perto de 1500. Meta: redução de 30%+ por remoção de duplicação.

Tempo de build Sass. Provavelmente sub-segundo. Manter.

Número de `!important` no codebase. Hoje passa de 300 ocorrências (forte sintoma de cascade conflict). Meta: <80 (apenas onde realmente necessário para sobrescrever inline styles ou third-party).

---

## 6. Análise por seção (o que muda dentro de cada partial)

Esta seção lista, para cada partial novo, as decisões específicas que precisam ser tomadas durante a Fase 2/3.

### `_tokens.scss`

Consolida três fontes hoje espalhadas: o `:root` em `playful.css` (linhas ~5-25), o `*` em `_header.scss` (carregava `--color-*`, `--font-thin`, etc.), e os clamps fluidos que criamos em `_header.scss`. Resultado: um arquivo único com seções comentadas: cores, tipografia, espaçamento, breakpoints, timing.

Decisão a tomar: manter os aliases legados `--color-primary`, `--color-secondary`, `--color-white` ou refatorar tudo para usar `--ink`, `--cream`, `--signal`? Recomendação: manter durante a Fase 1-3 para não exigir cascading edits em código de terceiros (toast, etc.); refatorar na Fase 5.

### `_theme.scss`

Aqui mora a lógica de tema. A estrutura criada nas últimas rodadas (`:root` defaults, `@media (prefers-color-scheme: dark) :root` swap, `.light-mode` / `.dark-mode` body class overrides) é fielmente transcrita aqui. Adicionalmente, as regras de section conversion (`section[data-section-bg="ink"] { background: var(--ink-soft); }` em light, etc.) vivem aqui.

Decisão a tomar: o uso de `data-section-bg` para selecionar palette é elegante mas acopla tema a markup. Alternativa: criar classes utilitárias `.surface--dark`, `.surface--light`, `.surface--accent`. Recomendação: manter `data-section-bg` (menos churn), documentar.

### `_reset.scss`

Absorve o reset global do `_header.scss` legado (`* { margin: 0; padding: 0; ... }`), o reset específico do v4 (`body.v4 { font-family, background, color }`), e regras de `section { min-height }`. Sem `.v4` na frente (a marcação é removida na Fase 3).

### `_typography.scss`

Recebe os clamps fluidos das variáveis `--text-*` e regras de tipografia globais. Fontes (Fraunces, JetBrains Mono) declaradas aqui via `@font-face` ou import de Google Fonts.

### `_cursor.scss`

Hoje contém apenas o cursor legado (`#cursor`, `#cursor-border`) com `display: none`. Será expandido para incluir o sistema v4 (`.pf-cur`, `.pf-ring`, `.pf-label`, `.pf-img-preview`). O nome do parcial mantém. A classe `.v4 *` que define `cursor: inherit` vira `body.app *` ou simplesmente `body *` dependendo da decisão sobre o `.v4` body class.

### `_hero.scss`

O maior parcial. Cerca de 800 linhas absorvendo: layout do hero grid, name + meta, photo container, aurora (5 blobs animados), orb (cursor-tracking glow), stage-inner (rounded card que clipa a foto), photo cutout (com brush-reveal canvas), decor chips com magnetismo, scroll cue, hero bottom (tags + cue), hero badge (rotating cursor-follow text), hero marquee (texto rolando atrás da foto).

Responsividade interna: o `@media (max-width: 900px)` do hero (unificado em rodada anterior) e os `@media (max-width: 480px)` adicionais — ambos transcritos para `@include respond-to("lg")` / `@include respond-to("xs")` usando os mixins do `_include.scss`.

Decisão a tomar: dividir `_hero.scss` em sub-parciais (`_hero/_layout.scss`, `_hero/_photo.scss`, `_hero/_decor.scss`)? Recomendação: não fragmentar inicialmente — fica em um arquivo até passar de ~1000 linhas, aí refatorar.

### `_intro.scss`, `_stats.scss`, `_expertise.scss`, `_timeline.scss`, `_portfolio.scss`, `_services.scss`, `_contact.scss`

Cada uma com seu BEM próprio, seus tokens consumidos via `var(--cream)` etc., suas media queries via `@include respond-to(...)`. Conteúdo extraído do `playful.css` correspondente, com ajustes para usar tokens em vez de hardcoded onde apropriado.

### `_footer.scss`

Inclui o footer + footer marquee (outline text com `text-stroke`). Os overrides de tema que adicionamos em rodada anterior (para light mode adaptar o bg e os strokes) vivem aqui dentro do mesmo arquivo, com seus `@include respond-to(...)` ou seletor `.light-mode &` (nested).

### `_marquee.scss`

Componente compartilhado por hero, expertise, footer, contact, etc. Define `.marquee`, `.marquee__wrapper`, `.marquee__wrapper-content`, e as classes utilitárias `.t100s`, `.t50s`, `.t25s` para duração do scroll. Inclui os `@keyframes marqueeLeft` / `marqueeRight`. Os spans dentro adaptam font-size e color via tokens.

Decisão a tomar: o marquee tem variações por uso (text-stroke no footer, mix-blend-mode no hero) — viram modifiers (`.marquee--outline`, `.marquee--blend`) ou vivem dentro do parcial pai? Recomendação: modifiers no `_marquee.scss`, aplicados conforme uso.

### `_badge.scss`

O badge circular rotativo (cursor-follow). Independente da hero — pode ser reusado. Inclui keyframes `v4BadgeRotate` (renomeado para `badge-rotate` ou similar).

### `_legacy.scss` (transitório)

Durante Fase 3, classes que ainda não foram migradas vivem aqui ou nos parciais legados originais. Cada bloco com comentário tipo `// TODO: migrar para .new-name na Fase 3 — remover este bloco quando hits = 0 no HTML`.

---

## 7. Considerações sobre JavaScript

`playful.js` precisa de uma passada completa de find-replace. Não-trivial porque ele usa muitas classes como flags-de-estado (`is-active`, `is-hover`, `is-on-photo`, `is-revealed`, `is-visible`, `is-engaged`) — essas se preservam. Apenas as classes-base mudam.

Approach recomendado: no início da Fase 3, criar um mapa em JS com `oldClass → newClass` e fazer o swap mecânico. Após cada commit de seção (Fase 3), rodar o site e verificar no console se há `Cannot read properties of null` — indica seletor não encontrado.

`playful.min.js` é o que de fato carrega em produção. Substituir por uma re-minificação do `playful.js` atualizado (qualquer minifier serve: terser, esbuild, online). Considerar manter só `playful.js` e remover o `.min.js` se o ganho de tamanho for marginal — moderno gzip cuida bem da minificação.

Outros JS no projeto: `app.min.js`, `console.min.js`, `cursor.min.js`, `toast.min.js`, `sw.min.js`. Audit individual de cada para verificar se referencia classes V4 — provavelmente sim, em menor grau.

---

## 8. Riscos e mitigação

**Risco: Cascade quebrado durante Fase 2.** Movemos código entre arquivos com regras `@import` diferentes — a ordem importa. Mitigação: a Fase 2 não muda nomes de classe, apenas localização do código. Se a ordem dos imports replicar a ordem original (legacy primeiro, v4 sobrescreve), a cascade preserva-se.

**Risco: Regression visual sutil na Fase 3 por causa de seletor não migrado.** Especialmente em regras compostas como `.v4-hero .v4-cta` — se só uma metade for migrada, a regra deixa de aplicar. Mitigação: cada commit por seção inclui audit de busca por `v4-` (deve voltar zero hits no escopo da seção).

**Risco: JS quebrando silenciosamente.** Um `querySelector('.v4-foo')` retornando `null` é catch-all em try-catch — falha silenciosa. Mitigação: na Fase 4, adicionar temporariamente um `console.warn` em caminhos que recebem null para detectar referências quebradas durante testes.

**Risco: Migração parcial sendo deployada.** Fase 3 toma vários commits — se um deploy pegar a metade da migração, a parte renomeada some (CSS não encontra) e a parte legada some (HTML não tem mais a classe antiga). Mitigação: feature branch dedicado para a migração; só faz merge para main quando todas as fases passaram QA.

**Risco: Build do Sass falhando pós-refactor.** A versão atual do SCSS usa sintaxe antiga (`/` para divisão, `darken()`) que está sendo deprecada no Dart Sass. Migrar pra `math.div()` e `color.adjust()` durante essa migração ou manter como está? Mitigação: pinar uma versão específica do `sass` no `package.json` (quando criado) que ainda suporta a sintaxe antiga. Refator para sintaxe nova fica como Fase 7 (post-migration).

**Risco: SEO/share-preview.** As classes não afetam SEO, mas alguma ferramenta externa pode ter selectors hardcoded para scraping. Improvável neste projeto pessoal. Mitigação: nenhuma necessária.

---

## 9. Critérios de aceite por fase

**Fase 1:** Diff visual zero entre antes e depois. DevTools mostra `--ink: #0a0a0a` resolvendo no `<body>`.

**Fase 2:** Diff visual zero. `playful.css` vazio. `<link>` removido. Tempo de Network do CSS reduzido (uma requisição a menos).

**Fase 3 (por seção):** A seção renderiza visualmente igual. Hover, click e animações funcionam. Console limpo (sem null errors).

**Fase 4:** Console limpo após interação completa com a página (hover em hero, click em chips, scroll cue, abertura do drawer mobile, hover em CTAs, etc.).

**Fase 5:** Build Sass roda em <1s. CSS final tem <60KB ungzipped. Número de `!important` reduziu pelo menos 50%. Página passa Lighthouse com score similar ao baseline (±2 pontos).

**Fase 6:** README atualizado. CSS bem comentado. Próximo dev que abrir o repo entende a arquitetura em <5min.

---

## 10. Estimativa de tempo

Para um desenvolvedor solo trabalhando em sessões focadas:

| Fase | Duração estimada |
|------|------------------|
| Fase 1 — Tokens + theme | 2-3h |
| Fase 2 — Extração estrutural | 4-6h |
| Fase 3 — Renomeação por seção (9 seções) | 8-12h |
| Fase 4 — JS update e validação | 2-3h |
| Fase 5 — Cleanup | 2-4h |
| Fase 6 — Documentação | 1-2h |
| **Total** | **19-30h** |

Pode ser distribuído em 1-2 semanas com sessões diárias de 2-3h ou condensado em 4-5 dias intensivos. Recomendação: distribuir, dar tempo entre fases para identificar regressões que só aparecem após uso real.

---

## 11. Checklist final

Quando a migração estiver pronta, esses pontos devem estar todos resolvidos:

Todas as classes `.v4-*` desaparecem do `index.html`, do CSS final e do JS. Busca por `v4-` no projeto inteiro retorna zero hits.

Todas as classes com prefixo duplo `.v4-v4-*` foram corrigidas (ou deletadas).

O `index.html` carrega um único `<link>` para `styles.css`. Não há mais `playful.css` no `<head>`.

Não há `<style>` inline no `index.html` (todas as regras migradas para parciais SCSS).

A pasta `assets/styles/` tem a estrutura de parciais documentada na seção 3.

O `_legacy.scss` está deletado.

O `package.json` (criado durante a migração se ainda não existir) tem scripts `npm run watch` e `npm run build` configurados com sass.

O `README.md` documenta a estrutura.

A página passa por uma checagem completa em dois temas (light/dark/system) e três breakpoints (320px, 768px, 1440px) sem regressão visual.

JavaScript funciona: cursor follow, magnet effect nos chips, brush-reveal canvas, drawer mobile, toggle de tema, infinite scroll do timeline, marquees animando.

Build do Sass roda limpo, sem warnings críticos.

---

## 12. Próximo passo concreto

Quando você der o sinal verde para iniciar, **a primeira sessão de trabalho** é a Fase 1: criar `_tokens.scss` e `_theme.scss`, refatorar `styles.scss` para importá-los, validar que o site renderiza igual.

Esse é o passo de menor risco e maior valor de aprendizado: você entende como o cascade vai se comportar quando começarmos a remover arquivos. Se Fase 1 funcionar limpa, as outras fases são mais variações do mesmo método.

---

## 13. Status pós-migração inicial (Fases 1-6 concluídas)

As seis fases originais foram executadas e commitadas. Resumo do estado atual e do que restou para refatorações incrementais:

**Concluído.** Tokens v4 (`--ink`, `--cream`, `--signal`) e tema light/dark/system centralizados. `playful.css` (93KB) extraído em 14 parciais SCSS. Renomeação BEM completa (119 classes `v4-foo` → `foo__bar` em SCSS, HTML, JS). JS validado e re-minificado. Cleanup do legado: 6 blocos top-level mortos do `_legacy-inline.scss` removidos (`-83%`), `playful.css` truncado, inline `<style>` do `index.html` reduzido (`-58%`), palette `--color-*` consolidada em `_tokens.scss`. README documentado com arquitetura, BEM, tokens, tema, build commands.

**Acrescido fora do plano original.** Migração `@import` → `@use`/`@forward` completa, eliminando o deprecation warning oficial do Sass 1.80+. `darken()` → `color.scale()` (22 sites). `/` division → `math.div()` (3 sites). `map-*` globais → `map.*` namespaced (2 de 9 sites, parcial). Bug fix crítico: `@media (prefers-color-scheme: dark)` agora respeita `.light-mode` toggle via `:not(.light-mode)` qualifier (32 selectors patcheados). Bug fixes de contraste: stats cards (cream + bright orange/pink/blue) com texto escuro WCAG AAA, portfolio numbers/meta com opacity calibrada. Restauração de `min-height: 100vh` por seção para sensação imersiva.

**Métricas finais.** CSS ungzipped: 135.6KB → 80.9KB (`-40%`). Gzipped: ~22KB → 15.3KB (`-30%`). Selectors únicos: 757 → 643 (`-15%`). HTTP requests para CSS: 2 → 1. Deprecation warnings: 2 → 0. Build Sass: ~1.4s média (3 runs).

**Itens ainda transitórios que não bloqueiam estabilidade.** Palette `--color-*` ainda consumida por ~60 call sites em parciais ativos (cursor, dropdown, sidebar, tooltip, scroll-icon, social-icons, toast, page-settings, independent-components, header body/section rules). `_legacy-inline.scss` mantém 193 linhas em 5 blocos genuinamente alive (`.expertise &-marquees`, `.contact-content` wrapper, `footer` tag rule, `.hidden`/`.show` utilities, responsive overrides do `.services .bento`). 7 chamadas `map-*` globais ainda no `_include.scss` (`respond-from` e `respond-between`). `playful.css` é 0 bytes mas arquivo físico permanece. `_legacy.scss` mantém `.mesh-rings`/`.mesh-scan` (visual easter eggs sem uso atual).

A partir daqui o trabalho é incremental e desacoplado. Cada fase abaixo pode ser executada isoladamente sem dependência das outras; a ordem é apenas sugestão por risco crescente.

---

## 14. Fase 7 — Migração final de `map-*` globais (baixo risco, mecânico)

Migra as 7 chamadas restantes das funções globais `map-has-key`, `map-keys`, `map-get` para a sintaxe namespaced `map.has-key`, `map.keys`, `map.get` do módulo built-in `sass:map`. O módulo já está importado em `_include.scss` desde a fase de migração ad-hoc.

**Sites a tocar.** Todos em `assets/styles/_include.scss`:

- Linha 140: `map-keys($breakpoints)` dentro do `@warn` do `respond-to` (single call).
- Linha 158: `map-has-key($breakpoints, $name)` no `@if` do `respond-from`.
- Linha 159: `map-keys($breakpoints)` no `@warn` do `respond-from`.
- Linha 161: `map-get($breakpoints, $name)` no `@media` do `respond-from`.
- Linha 172: `map-has-key($breakpoints, $from) or not map-has-key($breakpoints, $to)` no `@if` do `respond-between` (duas calls).
- Linha 176: `map-get($breakpoints, $from)` no `@media` do `respond-between`.
- Linha 177: `map-get($breakpoints, $to)` no mesmo `@media`.

**Procedimento.** Substituição mecânica `map-X(` → `map.X(` em cada linha. Compilação Sass valida que o output é idêntico ao byte (as funções built-in resolvem para o mesmo valor — só a sintaxe é diferente). Zero risco de regressão visual.

**Validação.** Build limpo, zero deprecation warnings. `styles.css` byte-idêntico ao baseline pré-fase.

**Reverter.** Trivial — `git checkout assets/styles/_include.scss`.

**Estimativa.** 15-20 minutos.

---

## 15. Fase 8 — Migração dos consumers de `--color-*` para tokens v4 (médio risco, requer mapeamento)

Migra as ~60 chamadas `var(--color-foo)` espalhadas pelos parciais ativos para os tokens v4 equivalentes (`--ink`, `--cream`, `--signal`, etc.). Permite remover a seção legada `--color-*` do `_tokens.scss` ao final.

**Mapeamento semântico.** Não é 1:1 — alguns tokens legados têm semântica contextual:

- `--color-secondary` → `--signal`. Já está aliado em `_tokens.scss` (`--color-secondary: var(--signal)`). Substituição literal nos call sites.
- `--color-primary` (legacy "background" — dark em dark theme, white em light) → não tem token v4 direto. Cada call site decide: se for body bg, usar `var(--cream)` (body.v4 já faz isso). Se for sidebar/dropdown bg em surface escura, usar `var(--ink)`. Se for surface clara, `var(--cream)`. Decisão caso a caso.
- `--color-white` (legacy "text color" — white em dark, black em light) → contextual. Em surface escura usar `var(--cream)`, em clara usar `var(--ink)`. Quase sempre o consumer está num contexto onde a surface é conhecida.
- `--color-white-2` (sempre `#fff`) → usar literal `#fff` ou criar novo token `--white`.
- `--color-black` (sempre `#000`) → usar literal `#000` ou criar `--black`.
- `--color-black-2` (white em dark, black em light) → contextual como `--color-white`.
- `--color-grey-*` → essas têm valores muito específicos. Avaliar se ainda fazem sentido ou se podem mapear para variações de `--ink-soft`/`--cream-soft`. Provavelmente manter por valor.
- `--color-opposite` (yellow accent, `#976d0c` em dark / `#edad19` em light) → criar `--accent-yellow` ou similar nos tokens v4.

**Ordem de execução (por parcial).** Começar pelos arquivos com poucos call sites e ir para os maiores:

1. `_scroll-icon.scss` (1-2 calls). Mais simples primeiro para calibrar o método.
2. `_selection.scss` (1 call).
3. `_dropdown.scss` (~3 calls).
4. `_tooltip.scss` (~3 calls).
5. `_social-icons.scss` (~2 calls).
6. `_toast.scss` (~4 calls).
7. `_cursor.scss` (~5 calls).
8. `_independent-components.scss` (~6 calls).
9. `_sidebar.scss` (~10 calls — depende do estado de uso do sidebar).
10. `_page-settings.scss` (~5 calls).
11. `_header.scss` — caso especial: body/section tag rules consomem `--color-primary` e `--color-white`. Reescrever as regras para usar `--cream` e `--ink` com fallback. Pode exigir adicionar a regra `body { background: var(--cream); color: var(--ink) }` se ainda não estiver coberta por `body.v4`.

**Procedimento por arquivo.**

a) Listar todas as `var(--color-*)` no arquivo.
b) Para cada, decidir o token v4 equivalente baseado no contexto (background vs text vs border).
c) Aplicar substituição.
d) Compilar e abrir DevTools com aba "Computed" comparando o elemento antes/depois — confirmar que o valor resolvido é idêntico ou visualmente equivalente.
e) Commit por parcial — facilita revert localizado se algo regredir.

**Validação por fase.** Screenshot do site em dark+light por seção que o parcial afeta. Comparar com baseline pre-Fase-8. Diferenças aceitáveis são apenas mudanças intencionais (ex.: trocar grey-3 por ink-soft talvez tenha leve diferença de tom — decidir se manter o valor exato via `--ink-soft-50` ou aceitar a aproximação).

**Encerramento da Fase 8.** Após todos os parciais migrados, deletar o bloco "Legacy palette" do `_tokens.scss` (linhas ~62-129). Confirmar zero referências `--color-*` no projeto inteiro: `grep -r "var(--color-" assets/` deve voltar zero hits. Recompilar e confirmar styles.css ainda renderiza correto.

**Reverter.** Cada commit por parcial é revertable individualmente.

**Estimativa.** 3-5 horas distribuídas (não fazer numa sessão só — fadiga visual prejudica audit).

---

## 16. Fase 9 — Dissolução do `_legacy-inline.scss`

Move os 5 blocos sobreviventes do `_legacy-inline.scss` para os section partials onde eles conceitualmente pertencem, e deleta o arquivo. Reduz o número de arquivos e elimina o conceito de "legacy inline" da arquitetura.

**Migrações por bloco.**

- **`.expertise &-marquees { ... }`** → mover para `_expertise.scss` (sem `&-marquees` que dependia do `&` do bloco pai; expandir para `.expertise-marquees { ... }` aninhado em `.expertise`).
- **`.contact-content { padding-top: 3.5rem; background-color: #0a0a0a; .text {...}; .contact-icons .icon {...} }`** → mover para `_contact.scss`. O `.text` e `.contact-icons` ainda casam com markup atual. O `background-color: #0a0a0a` hardcoded deve virar `var(--ink)`.
- **`footer { background-color: var(--color-white-2); padding: 1rem 0; text-align: center; ... }`** → mover para `_footer.scss` como regra tag (`footer { ... }`). Coexiste com `.footer { ... }` (especificidade tag < class, então `.footer` continua vencendo). Considerar consolidar com `.footer` BEM no mesmo arquivo.
- **`.hidden { opacity: 0; visibility: hidden; ... }` e `.show { opacity: 1; ... }`** → mover para `_reset.scss` ou criar `_utilities.scss` se preferir um partial dedicado a utility classes.
- **3 `@include respond-to("md/xs/lg") { ... }` blocks** → o `body { overflow-x: hidden }` em `lg` vai pro `_reset.scss`. Os dois blocks do `.services .bento` em `md` e `xs` vão pro `_services.scss` (já tem responsividade lá; consolidar).

**Procedimento.** Por bloco: cortar do `_legacy-inline.scss`, colar no parcial destino com possíveis ajustes (descompor `&` aninhamento, substituir hardcoded por tokens). Compilar após cada move, confirmar `styles.css` byte-idêntico (compressor Sass deve produzir mesmo output).

**Encerramento.** Após mover tudo, deletar `assets/styles/_legacy-inline.scss` e remover `@use "legacy-inline";` de `styles.scss`. Recompilar.

**Validação.** Build limpo. Selectors no `styles.css` final mantêm a contagem (não perdemos nem ganhamos regras — só reorganizamos). Screenshot por seção confirma zero regressão.

**Reverter.** Revert dos commits individuais por bloco.

**Estimativa.** 1-2 horas.

---

## 17. Fase 10 — Auditoria e remoção de parciais legacy não usados

Inspeciona cada um dos parciais "shared utilities" que sobreviveram da era pré-v4 e decide caso a caso: manter (se ainda no markup), refatorar (se em uso mas com código pesado), ou remover (se zero hits no markup).

**Candidatos para audit.**

- `_sidebar.scss` — implementa o sidebar lateral. Checar se ainda existe `<div class="sidebar">` no `index.html`. Provável: foi removido ou está oculto. Se confirmado dead, remover o partial inteiro e o `@use "sidebar"` no `styles.scss`.
- `_independent-components.scss` — verificar o que define. Provável: `.main-btn`, `.btn-con`, e outras utility classes da era anterior. Auditar uso vs markup.
- `_page-settings.scss` — pequeno (28 linhas?). Verificar o que estiliza.
- `_scroll-icon.scss` — provavelmente styling para o `.scroll-tag` que foi removido do markup. Confirmar e remover se dead.
- `_social-icons.scss` — define o icomoon font binding via `[class^=icon-]`. Crítico pois `<i class=icon-envelope-open>` ainda está no markup. Manter, mas verificar se há regras dead dentro.
- `_toast.scss` — toast messages. `toast.js` ainda carregado, `<div class=msgbox-area>` no markup. Provavelmente alive.
- `_dropdown.scss` — `<ul class=dropdown>` do translate menu ainda existe. Alive.
- `_tooltip.scss` — `cursor-tooltip` no markup. Alive.
- `_cursor.scss` — legacy `#cursor`/`#cursor-border` + v4 `.pf-cur`/`.pf-ring`. Alive.
- `_legacy.scss` — visual easter eggs `.mesh-rings`/`.mesh-scan`. Sem uso atual no markup. Decidir: manter como referência arqueológica vs remover.

**Procedimento.** Por arquivo:

a) `grep -ro 'class.*<classes-do-partial>' index.html` para confirmar uso.
b) Se zero hits, remover o `@use` em `styles.scss` e o arquivo `_foo.scss` físico.
c) Se uso parcial, refatorar para manter só as regras vivas.
d) Recompilar e validar.

**Encerramento.** Lista atualizada de parciais ativos no README seção 2.1 (Partial structure).

**Validação.** `styles.css` final pode reduzir mais 5-15KB dependendo do que foi removido. Screenshot confirma zero regressão.

**Reverter.** Commit por parcial revisado.

**Estimativa.** 2-4 horas (depende de quantos forem realmente dead).

---

## 18. Fase 11 — Otimização do critical-path para FOUT/CLS zero

Reorientação completa do escopo original. A versão anterior do plano sugeria "remover o `<style>` inline aceitando pequeno FOUC". **Errado** — o inline existe especificamente para prevenir FOUT (Flash of Unstyled Text) e CLS (Cumulative Layout Shift) que matam o Lighthouse score. A meta agora é o oposto: garantir que o inline contenha **exatamente** o que é necessário para layout estável no primeiro paint, eliminando FOUT/CLS sem inflar bytes.

**Audit do estado atual.** Detectado em pre-Fase-11:

  - **19 de 19 `<img>` SEM atributos `width`/`height`** — todos são CLS risk. Especial atenção à foto do hero (333×500) que é o primeiro elemento above-the-fold.
  - **Timeline cards** com 11 imagens de logos (330×180 cada) — todas reservam 0×0 até CSS carregar.
  - **Portfolio cards** com 7 imagens (1600×800 cada) escondidas em `<picture style="display:none">` — não contribuem CLS (display:none).
  - **`@font-face icomoon`** com `font-display: block` (inline). Comportamento: ícones ficam invisíveis até 3 segundos enquanto fonte baixa. Aceitável para ícones (não há fallback semântico).
  - **Google Fonts Fraunces** carregada via `<link rel=preload as=style onload="...">` pattern (Filament Group loadCSS). URL usa `&display=swap` — fallback aparece enquanto Fraunces baixa, depois swap. FOUT presente mas curto.

**Estratégia de implementação.**

A) **Adicionar `width` + `height` attributes em TODAS as `<img>`.** Mesmo quando o CSS define dimensões diferentes (`width: 100%; height: auto`), browsers modernos USAM os atributos HTML para calcular `aspect-ratio` implícito e reservar espaço no layout antes da imagem baixar. É a única solução efetiva para CLS de imagens. Sem isso, o navegador reserva 0×0 → imagem baixa → layout pula.

  - Hero photo: `<img class="hero__img hero__img--primary" src="..." width="333" height="500">`
  - Timeline logos: cada `<img>` ganha `width="330" height="180"`
  - Portfolio images: continuam sem dimensão pois ficam em `<picture style="display:none">` — nada renderizado.

B) **Garantir `aspect-ratio` no CSS dos containers** como cinto-e-suspensório. Adicionar `aspect-ratio: 333/500` (ou similar) nos `_hero.scss`, `_timeline.scss` para reservar espaço mesmo se o atributo HTML for ignorado por alguma razão.

C) **Manter inline `<style>` com o subset crítico para layout above-the-fold**. Atualmente tem 2.334 bytes. Deve continuar contendo:

  - **Tokens v4 cruciais** (`--ink`, `--cream`, `--signal`, `--pad-x`, `--pad-y`) + tema light/dark via `@media (prefers-color-scheme: ...)`. Sem isso, `var()` calls não resolvem antes do CSS carregar.
  - **Reset universal** (`* { margin: 0; padding: 0; box-sizing: border-box }`).
  - **`body`** background-color + color + font-family + font-size + font-weight. Previne flash branco se o tema for cream/dark.
  - **`section { min-height: 100vh; width: 100% }`** — RESERVA espaço vertical de cada seção. Crítico para CLS — sem isso a página inteira pula quando CSS final carrega.
  - **Hero layout crítico** (não presente atualmente):
    - `.hero { min-height: 100dvh; padding: var(--pad-y) var(--pad-x) 0; display: flex; flex-direction: column; justify-content: flex-end }`
    - `.hero__grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(32px, 4vw, 80px); align-items: center; flex: 1; padding-bottom: clamp(32px, 4vh, 60px) }`
    - `.hero__photo { position: relative; height: clamp(360px, 58vh, 580px) }`
    - `.hero__name { font-size: clamp(5.5rem, 13vw, 13rem); line-height: .88 }`
  - **`@font-face icomoon`** + `[class^=icon-]` font binding — sem isso ícones de tema/translate na nav ficam invisíveis ou viram boxes.
  - **`@keyframes marqueeLeft`** — marquee do hero precisa rolar imediatamente.
  - **`.marquee` + wrapper rules** — reserva espaço para marquees acima da dobra.

D) **`font-display` strategy.**
  - `icomoon` continua `font-display: block`. Para ícones, é a escolha correta — não há fallback semântico aceitável (mostrar "" ou chars random é pior que esperar). Block timeout de 3s, depois fallback. Tipicamente icomoon baixa em <500ms então usuários nunca veem fallback.
  - **Adicionar `<link rel=preload as=font>` para icomoon** — força o browser a baixar a fonte com prioridade alta, em paralelo com HTML parsing. Reduz tempo até ícones aparecerem de ~500ms para ~50ms.
  - `Fraunces` mantém `display=swap`. Fallback `ui-serif` tem métricas razoavelmente similares — FOUT visível mas curto.
  - **Considerar `font-display: optional`** para Fraunces se quisermos zero CLS — browser desiste se a fonte não baixar em 100ms (usuário em conexão lenta nunca vê Fraunces, mas zero shift).

E) **Otimizar `<link rel=preload>` pattern** existente. O `onload='this.onload=null,this.rel="stylesheet"'` é JavaScript inline que muitos auditores marcam negativamente. Alternativa moderna:
  ```html
  <link rel=preload as=style href=... onload="this.rel='stylesheet'">
  <noscript><link rel=stylesheet href=...></noscript>
  ```
  Ou ainda mais moderno (browsers modernos suportam):
  ```html
  <link rel=stylesheet href=... media=print onload="this.media='all'">
  ```
  Mas o pattern atual funciona — só polish opcional.

F) **Validação pós-implementação.**
  - **Lighthouse** (ou DevTools Performance tab): CLS deve ser **0**. LCP deve estar abaixo de 2.5s.
  - **WebPageTest** ou **PageSpeed Insights**: confirmar zero "Largest Contentful Paint" jumps.
  - **DevTools Network tab**: simular Slow 3G; observar que o hero não pula durante o load.
  - **Visual regression**: comparar screenshots antes/depois — devem ser idênticos quando totalmente carregado.

**Trade-offs aceitos.**

- O inline `<style>` cresce de 2.334 bytes para ~3.500 bytes (adicionamos hero layout crítico). Tradeoff vale a pena: cada KB inline custa ~50ms na conexão mais lenta, mas economiza um CLS shift que custa pontos no Lighthouse.
- Os `width`/`height` em `<img>` adicionam ~50 bytes ao HTML por imagem × 19 = ~1KB. Em troca: CLS=0 para todas as imagens.

**Encerramento.** Fase 11 é considerada completa quando:
  - `grep -c '<img[^>]\+\(width=\|height=\)' index.html` retorna 19+ (todas imagens com dimensões).
  - Inline `<style>` contém tokens, reset, body, section, hero layout crítico, font-face icomoon, marquee base, @keyframes.
  - Lighthouse Performance score = 100. CLS = 0.

**Reverter.** Cada mudança é commit-isolada — revert por seção (HTML attributes vs inline style vs SCSS aspect-ratio).

**Estimativa.** 2-3 horas (era 1h na versão original — escopo aumentado pelos requisitos de qualidade).

---


---

## 19. Fase 12 — Final polishing (opcional, baixíssima prioridade)

Items "would-be-nice" sem urgência:

**Deletar `_legacy.scss`.** Visual easter eggs `.mesh-rings`/`.mesh-scan` que ninguém usa. Tirar do `styles.scss` e deletar o arquivo. Reduz ~1KB.

**Deletar `playful.css`.** Arquivo físico em 0 bytes mas existe. `git rm` resolve. Plano não pode fazer no sandbox por permissões.

**Remover a body class `.v4`.** Atualmente serve como ancorador de especificidade em vários seletores (`.v4 .hero`, `.v4:not(.light-mode) .stat`, etc.). Se removida, todos esses seletores perdem 1 nível de especificidade — podem entrar em conflito com seletores legados. Refator possível mas requer audit cuidadoso da cascade. Provavelmente manter `.v4` indefinidamente como flag inerte.

**Sintaxe Sass moderna em todos os parciais.** Verificar se algum parcial ainda usa `@import` (não deve ter), `darken()` (zero), `lighten()` (zero), `/` arithmetic fora de calc (zero), `map-*` globais (7 ainda em `_include.scss`). Após Fase 7, tudo limpo.

**Auditar `!important` count.** Atualmente 356 ocorrências (legado v4 cascade fight). Após eliminação completa do legacy palette + dissolução do `_legacy-inline.scss`, muitas dessas `!important` podem ser removidas (foram defensivas contra rules que não existem mais). Meta original do plano: <80 ocorrências.

**Estimativa.** 1-3 horas total.

---

## 20. Critérios para encerrar definitivamente a migração

A migração pode ser considerada "definitivamente fechada" quando:

- `grep -r "v4-" assets/` retorna apenas matches em comentários históricos (zero referências funcionais).
- `grep -r "var(--color-" assets/` retorna apenas matches no bloco "Legacy palette" do `_tokens.scss` que pode ser deletado.
- `_legacy-inline.scss`, `_legacy.scss`, `playful.css` não existem no filesystem.
- O `<style>` inline em `index.html` foi removido ou reduzido a ≤500 bytes de critical-path essencial.
- Build Sass zero warnings, zero deprecations, em Dart Sass 2.0+.
- `styles.css` compilado ≤70KB ungzipped, ≤13KB gzipped.
- README documenta arquitetura final sem menção a "legacy" ou "transitional".
- `!important` count <100 ocorrências (relaxando a meta original de <80 dado que mantemos compatibilidade com Sass module isolation).

**Estimativa total para chegar lá a partir do estado atual.** Fase 7 (~20min) + Fase 8 (~4h) + Fase 9 (~1.5h) + Fase 10 (~3h) + Fase 11 (~1h) + Fase 12 (~2h) = **~12 horas** de trabalho concentrado, executável em 2-3 sessões de 4h cada ou ao longo de várias semanas com fases granulares.

A ordem recomendada é Fase 7 → 9 → 10 → 8 → 11 → 12, porque cada fase reduz o escopo da próxima. Mas qualquer ordem funciona; as fases são desacopladas por design.

---

## 21. Inventário do JavaScript atual (baseline para a migração)

Antes de detalhar as fases de remoção do `playful.js`, vale registrar o estado atual da camada JS para que o plano abaixo faça sentido.

**Arquivos carregados pelo `index.html` (ordem de carregamento)**

```
sw.min.js              service worker registration (async)
cursor.min.js          legacy custom cursor (#cursor / #cursor-border) (async)
app.min.js             theme toggle + sidebar toggle + IntersectionObserver (async)
console.min.js         easter-egg console.log messages (defer)
toast.min.js           job-history modal popups (defer)
playful.min.js         tudo do design v4: ~22 funções init*, ~66KB unminified (defer)
```

**Funções em `playful.js` (catalogadas)**

`initCursor` (v4 cursor `.pf-cur`/`.pf-ring`/`.pf-label`/`.pf-img-preview`), `initMagnetic` (hover atrai elemento), `initHeroReveal` (letter-by-letter do nome do hero), `initSectionMode` (nav muda cor por `data-section-bg`), `initActiveNav` (IntersectionObserver para highlight do link), `initCounters` (count-up nos stats), `initWordReveal` (palavras slide-in), `initVelocityMarquee` (marquee acelera com scroll), `initScramble` (scramble text), `initDragScroll` (carousel horizontal drag), `initRipple` (ripple effect em CTAs), `initScrollBar` (progress indicator), `initSmoothNav` (smooth scroll), `initHeroAurora` (parallax + magnetismo dos chips), `initHeroBrushReveal` (canvas brush-reveal sobre a foto), `initHeroLiquid` (WebGL Navier-Stokes fluid simulation, ~1000 linhas, o que mais pesa), `initInfiniteSlider` (marquee infinita), `initImgPreview` (preview de imagem seguindo cursor), `initThemeMode` (toggle de tema via botão `#theme`), `initDrawer` (drawer mobile), `initSectionTagCounter` (numerador de seção), `initBadge` (badge rotativo seguindo cursor).

**Sobreposições e conflitos identificados**

`cursor.min.js` legado implementa `#cursor`/`#cursor-border` que está com `display: none` por CSS na arquitetura v4. Funcionalmente substituído por `initCursor()` em `playful.js`. **Remover `cursor.min.js` é seguro.**

`app.min.js` implementa `toggleTheme()` que adiciona `.light-mode`/`.dark-mode` no body. `playful.js initThemeMode()` faz a mesma coisa com lógica ligeiramente diferente (transition animation, button feedback). **Decidir qual versão é autoritativa.**

`app.min.js` tem IntersectionObserver para sections + `.active-btn` toggle. `playful.js initActiveNav()` tem a mesma lógica com pequenas variações. **Duplicação clara.**

`app.min.js` tem `toggleSidebar()` para `.sidebar` legado. O design v4 não usa sidebar (usa drawer via `initDrawer()`). Se `.sidebar` estiver morto no markup, a função inteira é dead code.

`app.min.js` tem observer para `.hidden`/`.show` elementos. `playful.js` não duplica isso — coexistem.

`console.js` e `toast.js` são auto-contidos, sem sobreposição com outros arquivos. Manter como estão.

**Estado-alvo desejável**

Reduzir de 6 arquivos JS para 4: `app.min.js` (consolidado com tudo do `playful.js`), `console.min.js`, `toast.min.js`, `sw.min.js`. Eliminar `cursor.min.js` e `playful.min.js`. Total de bytes JS deve reduzir significativamente após remoção de duplicatas. O design v4 fica como **a** implementação (sem versões paralelas).

---

## 22. Fase 13 — Audit JS + consolidação de duplicatas (médio risco)

Resolve as três sobreposições funcionais entre `app.js`, `cursor.js` e `playful.js` antes de tocar na estrutura modular. Sem isso, qualquer reorganização vira um pesadelo de cascade event-listener.

**Sub-fase 13.1: Theme toggle.** Comparar `app.js#toggleTheme()` com `playful.js#initThemeMode()`. Critérios de decisão: qual versão lida melhor com transição (FOUC ao trocar tema), qual interage corretamente com o sistema OS preference (`window.matchMedia('(prefers-color-scheme: dark)')`), qual aplica state persistente (localStorage). Decisão recomendada: manter a versão `playful.js` (mais completa, com animação de toggle e correta interação com sistema). Em `app.js`, remover `toggleTheme()` e `initTheme()`. O event listener no `#theme` button passa a ser registrado APENAS em `playful.js`.

**Sub-fase 13.2: Active-nav highlighting.** Mesmo padrão. Comparar `app.js#initEventHandlers()` (parte da IntersectionObserver) com `playful.js#initActiveNav()`. A versão `playful.js` usa `data-id` mais explicitamente. Manter `playful.js`. Em `app.js`, remover a parte do IntersectionObserver que toca `.active-btn` — mas MANTER a parte que observa `.hidden`/`.show` (esse comportamento não está em playful).

**Sub-fase 13.3: Sidebar toggle.** Verificar se `<div class="sidebar">` ainda existe no markup ativo do `index.html`. Se zero hits, remover `toggleSidebar()` e o event listener correspondente de `app.js`. Se ainda em uso, manter.

**Sub-fase 13.4: Legacy cursor.** Confirmar via grep que `cursor.js` só toca `#cursor` e `#cursor-border` (não há ramificações). Confirmar que o CSS `#cursor { display: none !important }` está ativo (já está em `_cursor.scss` parte legacy). Decisão: remover `<script src=assets/js/cursor.min.js async>` do `index.html`. Deletar arquivos `cursor.js` e `cursor.min.js` do filesystem (após o commit confirmar nada quebrou).

**Validação.** Recarregar o site com DevTools aberto. Verificar:
- Toggle de tema funciona corretamente (light ↔ dark, persistência se houver).
- Active link na nav atualiza ao scrollar entre seções.
- Cursor v4 ainda visível em hover sobre `[data-cursor]` elements.
- Sidebar (se ainda existir no markup) abre/fecha pelo botão.
- Console limpo (sem `Cannot read property` de funções removidas).

**Reverter.** Cada sub-fase é um commit independente — revert localizado.

**Estimativa.** 1-2 horas.

---

## 23. Fase 14 — Modularização do `playful.js` em arquivos por feature

Divide o monólito de 66KB em ~8-10 arquivos menores, agrupados por responsabilidade. Não é um build step ainda — apenas reorganização física. O `<script>` em `index.html` passa a listar múltiplos arquivos (ou concatena via simples `cat` se preferir manter um único load).

**Estrutura sugerida de arquivos (em `assets/js/modules/`)**

```
cursor.js              initCursor + initMagnetic + initImgPreview  — sistema de cursor v4
hero.js                initHeroReveal + initHeroAurora + initHeroBrushReveal + initHeroLiquid + initBadge — tudo do hero
sections.js            initSectionMode + initActiveNav + initSectionTagCounter — comportamento por seção
animations.js          initCounters + initWordReveal + initVelocityMarquee + initScramble + initRipple — animações pontuais
scroll.js              initSmoothNav + initScrollBar + initDragScroll + initInfiniteSlider — interações de scroll
theme.js               initThemeMode + persistência localStorage + sync com prefers-color-scheme
drawer.js              initDrawer + focus trap + ESC + body-lock + theme proxy
main.js                bootstrap: importa todos os módulos acima e chama os init* em ordem
```

**Procedimento.** Por módulo:

a) Cortar as funções correspondentes de `playful.js` (manter formatação, comentários, todo `const`/`var` no escopo interno).
b) Colar em `assets/js/modules/<nome>.js`.
c) Identificar variáveis e helpers compartilhados (ex.: `prefersReduced`, `isTouch`, `canHover`) — extrair pra `assets/js/modules/_shared.js` ou inline em cada módulo (decisão por bloco).
d) Cada módulo termina exportando suas funções: `export { initCursor, initMagnetic }`.
e) `main.js` faz `import { initCursor } from './modules/cursor.js'` etc, e chama todos.
f) `index.html` carrega só `main.js` com `type="module"` ou compila para um bundle.

**Decisão de formato.** Duas opções:

1. **ES modules nativos (sem bundler).** `<script type="module" src="assets/js/modules/main.js">` carrega cada módulo como dependência via HTTP/2. Vantagem: zero build step. Desvantagem: várias requests, sem tree-shaking. Aceitável se cada módulo for pequeno.

2. **Bundler (esbuild, rollup, vite).** Compila todos os módulos em um único `app.bundle.min.js`. Vantagem: produção otimizada, tree-shaking elimina código morto. Desvantagem: introduz build step e dependência de Node tooling.

Recomendação: começar com opção 1 (ES modules nativos). Avaliar performance em Lighthouse. Se ficar marginal, mover para opção 2 numa fase futura.

**Validação.** Cada módulo extraído isoladamente deve continuar funcionando. Após o split completo, abrir o site em DevTools e validar cada feature (scroll, theme toggle, hover effects, marquees, drawer, etc.).

**Reverter.** Manter `playful.js` intacto durante a Fase 14 e fazer os splits em paralelo. Só remover o `<script src=playful.min.js>` quando todos os módulos estiverem validados.

**Estimativa.** 4-6 horas.

---

## 24. Fase 15 — Integração com `app.js` (consolidação final)

Funde o `app.js` original com os módulos extraídos da Fase 14. Resultado: um único `main.js` (que pode chamar-se `app.js`) que faz tudo. Os arquivos individuais por feature continuam existindo em `assets/js/modules/` mas são importados pelo entry point único.

**Procedimento.**

a) Renomear `assets/js/main.js` (criado na Fase 14) para `assets/js/app.js`, substituindo o `app.js` antigo. O conteúdo do `app.js` antigo (o que sobrou após Fase 13: IntersectionObserver para `.hidden`/`.show`, talvez `toggleSidebar()`) vira mais um módulo: `assets/js/modules/legacy-app.js` ou se integra a `sections.js`.

b) Atualizar `<script>` em `index.html`:

```html
<!-- antes -->
<script src=assets/js/cursor.min.js async></script>
<script src=assets/js/app.min.js async></script>
<script src=assets/js/playful.min.js defer></script>

<!-- depois -->
<script src=assets/js/app.js type="module" defer></script>
```

c) Ajustar a ordem de execução. Os `init*` originalmente eram chamados em ordem específica no IIFE do `playful.js`. Replicar essa ordem no `main.js` /`app.js`:

```javascript
import { initCursor, initMagnetic, initImgPreview } from './modules/cursor.js';
import { initHeroReveal, initHeroAurora, initHeroBrushReveal, initHeroLiquid, initBadge } from './modules/hero.js';
import { initSectionMode, initActiveNav, initSectionTagCounter } from './modules/sections.js';
import { initCounters, initWordReveal, initVelocityMarquee, initScramble, initRipple } from './modules/animations.js';
import { initSmoothNav, initScrollBar, initDragScroll, initInfiniteSlider } from './modules/scroll.js';
import { initThemeMode } from './modules/theme.js';
import { initDrawer } from './modules/drawer.js';

document.addEventListener('DOMContentLoaded', () => {
  initThemeMode();      // primeiro: define tema antes de qualquer paint
  initCursor();
  initMagnetic();
  initImgPreview();
  initHeroReveal();
  initHeroAurora();
  initHeroBrushReveal();
  initHeroLiquid();
  initBadge();
  initSectionMode();
  initActiveNav();
  initSectionTagCounter();
  initCounters();
  initWordReveal();
  initVelocityMarquee();
  initScramble();
  initRipple();
  initSmoothNav();
  initScrollBar();
  initDragScroll();
  initInfiniteSlider();
  initDrawer();
});
```

**Validação.** Site deve funcionar idêntico ao estado pré-Fase 15. Verificar Network tab em DevTools para confirmar que apenas `app.js` é carregado (+ os módulos importados dinamicamente).

**Reverter.** Mantém a opção de voltar a carregar `playful.min.js` revertendo o `<script>` no `index.html`.

**Estimativa.** 1-2 horas.

---

## 25. Fase 16 — Remoção física do `playful.js` e arquivos legacy

Após Fase 15 estável, remove os arquivos JS legados que viraram dead code.

**Arquivos a deletar.**

- `assets/js/playful.js` (66KB).
- `assets/js/playful.min.js` (33KB).
- `assets/js/cursor.js` (2KB — substituído na Fase 13).
- `assets/js/cursor.min.js` (1KB).
- `assets/js/app.js` (2KB — substituído na Fase 15 pelo módulo entry).
- `assets/js/app.min.js` (2KB).

Total bytes removidos: ~106KB de arquivos fonte/build, ~36KB do serving (que era só `app.min.js + cursor.min.js + playful.min.js`).

**Validação.** `grep -r "playful\|cursor.min\|app.min" .` confirma zero referências remanescentes (exceto comentários históricos). Lighthouse score mantido. Console limpo após interação completa.

**Reverter.** Restaurar do git histórico.

**Estimativa.** 30 minutos.

---

## 26. Fase 17 — Modernização e refator dos módulos JS (opcional)

Com a estrutura modular em vigor, oportunidade para refator de qualidade. Não-obrigatório — pode-se considerar a migração JS encerrada na Fase 16.

**Melhorias possíveis por módulo.**

- **`cursor.js`**: substituir `requestAnimationFrame` polling por CSS `transition` + `transform: translate3d()` puro (mais performante, menos JS rodando 60fps). A maioria dos cursor systems modernos usa essa abordagem.

- **`hero.js#initHeroLiquid`**: a WebGL fluid sim é ~1000 linhas e roda continuamente. Avaliar se vale o custo de performance. Alternativas: simplificar para CSS animation + canvas estático, ou lazy-load só quando o hero entra no viewport (já tem `IntersectionObserver` na arquitetura).

- **`sections.js`**: consolidar os 3 observers separados (`initSectionMode`, `initActiveNav`, `initSectionTagCounter`) em um único `IntersectionObserver` com handlers múltiplos — reduz overhead de callback.

- **`theme.js`**: adicionar persistência via `localStorage` (atualmente o toggle não persiste entre recargas).

- **`animations.js`**: avaliar se `initRipple`, `initScramble`, `initWordReveal` são notáveis na UX ou só CPU. Remover se sub-percebidos.

- **`drawer.js`**: revisar focus trap (acessibilidade) — confirmar que TAB cycle corretamente nos elementos do drawer e que ESC fecha.

**Validação.** Antes/depois com Lighthouse Performance score. Test em network throttling 3G simulado.

**Estimativa.** 4-8 horas dependendo do escopo.

---

## 27. Fase 18 — Build pipeline (opcional, considerar só se Fase 17 introduzir muitos módulos)

Se Fase 14 ficar com ES modules nativos e o número de módulos/HTTP requests virar problema (>10 requests no Network tab), introduzir bundler.

**Opção recomendada: `esbuild`.**

- Setup: `npm init -y && npm install --save-dev esbuild`.
- `package.json` script: `"build:js": "esbuild assets/js/app.js --bundle --minify --outfile=assets/js/app.min.js"`.
- Atualizar `index.html` para carregar `app.min.js` em vez do entry de módulo.
- Adicionar `assets/js/app.min.js` ao `.gitignore` (build output) ou comitar para deploys sem CI.

**Vantagens.** Single bundled file (menos HTTP requests), tree-shaking elimina código não usado, minificação avançada (~30-50% menor que minificação manual). Lighthouse melhora.

**Desvantagens.** Introduz dependência de Node tooling no projeto (atualmente Sass via `npx` é a única dep externa). Build step antes de cada deploy.

**Validação.** Comparar bundle size com sum-of-min.js anterior. Lighthouse mantém ou melhora.

**Estimativa.** 1-2 horas.

---

## 28. Critérios para encerrar a migração JS

A camada JS pode ser considerada totalmente migrada quando:

- `grep -r "playful" assets/js/ index.html` retorna zero hits (exceto possivelmente em comentários documentando o histórico).
- `assets/js/` contém apenas: `app.js` + `modules/*.js` + `console.js` + `toast.js` + `sw.min.js` (ou seu equivalente bundled).
- HTTP requests JS no Network tab ≤4 (módulos podem ser cached separately).
- Total JS gzipped servido ≤30KB (vs ~36KB atual com playful.min.js + app.min.js + cursor.min.js).
- Console limpo após interação completa: hover hero, click em chips, scroll cue, abrir drawer, toggle theme, hover CTAs, scroll por todas as seções.
- Cada arquivo de módulo tem cabeçalho com comentário explicando responsabilidade + dependências.

**Estimativa total para migração JS completa.** Fase 13 (~2h) + Fase 14 (~5h) + Fase 15 (~1.5h) + Fase 16 (~30min) + Fase 17 opcional (~6h) + Fase 18 opcional (~1.5h) = **~9 horas obrigatórias + 7.5 horas opcionais**, executável em 2-3 sessões focadas.

A ordem é obrigatória: Fase 13 deve vir antes de Fase 14 (sem isso, duplicatas migram pra módulos), Fase 14 antes de Fase 15 (sem isso, não há módulos pra integrar), Fase 15 antes de Fase 16 (sem isso, há referências quebradas no html). Fases 17 e 18 são desacopladas — podem entrar em qualquer ordem após Fase 16, ou não entrar.
