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
