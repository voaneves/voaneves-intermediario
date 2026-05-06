1. User-Centred Design & Navigation
   1.1 — Mobile menu (HIGH / M). Em telas <900px os links da nav (QUEM / NÚMEROS / JORNADA / PROJETOS / SERVIÇOS) somem e não há hambúrguer. Quem entra pelo celular fica preso na primeira tela. Adicionar um drawer/sheet com tap target ≥44px.
   1.2 — Affordance de "click" nos projetos (HIGH / S). A lista de projetos parece estática até hoverar. Em mobile (sem hover) ninguém sabe que abre toast. Resolver com chevron → sempre visível + estado focus claro.
   1.3 — Drag-scroll da Jornada precisa de pista visual (MED / S). Hoje só tem o textinho "arraste ←→". Mostrar metade do próximo card aparecendo na borda direita + um scrollbar mínimo (3 dots indicando posição).
   1.4 — CTA Conversar deve ir pra #contact (MED / S). Hoje abre Koalendar direto. Faz sentido: scroll suave pra contato, ali o usuário vê 3 caminhos (email, WhatsApp, Koalendar) e escolhe.
   1.5 — Konami egg precisa ser descobrível (LOW / S). Adicionar uma micro-dica no rodapé tipo ↑↑↓↓... ou um shortcut visível em modo dev.

2. Mobile Responsiveness & Performance
   2.1 — Auditoria mobile real (HIGH / M). Testar 375 / 414 / 768. Suspeitas:
   - Nome VICTOR NEVES em 14vw provavelmente quebra em portrait pequeno
   - Stats slabs com rotate(2deg) translateY(20px) causam overflow horizontal
   - Bento grid em 1-col tem min-height: 280px × 8 = ~2240px de altura empilhada
   - Hero photo em 50vh corta na maioria dos celulares modernos
     2.2 — RIP no WebGL fluido (HIGH / M). Já tentamos 5 versões, está sempre bugado em algum browser. Sugiro arrancar e substituir por algo simples e confiável: grayscale→color crossfade com parallax sutil. O fluido pode voltar como bonus opcional só se ficar perfeito.
     2.3 — Self-host Fraunces (MED / S). Hoje vem do Google Fonts (DNS + handshake). Self-hostar 1 axis (variable font, ~70KB) economiza ~150ms TTFB.
     2.4 — Preload + fetchpriority no main_1.webp (MED / S). É o LCP. Adicionar <link rel="preload" as="image" fetchpriority="high">.
     2.5 — Lazy-load disciplinado (LOW / S). Vários <img> na timeline e portfolio têm loading="lazy" ✓. Verificar se nada acima da dobra é lazy (regressão de LCP).

3. Visual Aesthetics & Consistency
   3.1 — Cortar a paleta pela metade (HIGH / S). Hoje uso ink + cream + red + orange + pink + blue + yellow + maroon. Identidade real precisa de 3 cores + 1 acento. Proposta: ink #0a0a0a, cream #f4ead4, signal red #f50000. Os slabs de Idyllic ficam só em cream/ink/red — não em 4 cores diferentes.
   3.2 — Cortar a quantidade de motion language (HIGH / M). Inventário atual: marquees, glitch, drag-scroll, fluid hero, parallax, ripple, magnetic, scramble, drop-bounce, word-reveal, expanding chips, scroll-progress, letter-reveal, water displacement. 14 paradigmas. Manter no máximo 5: scroll-progress, magnetic em CTAs, marquee, ripple no click, parallax sutil. Tudo resto fica no chão.
   3.3 — Mais respiro no hero (MED / S). A linha inferior (tags + scroll cue) é densa. Mover as tags pra dentro do meta block, deixar o scroll cue sozinho.
   3.4 — Uma família de UI label só (MED / S). Hoje misturo Helvetica Neue Condensed Black, ui-monospace, var(--font-mono). Padronizar pra uma: stack mono pro UI/labels, Fraunces pra display. Dois fonts. Acabou.
   3.5 — Hero photo: decidir se a 2ª foto vai ficar (LOW / S). Se a transição main_1 ↔ main_2 não for signature, remover. Single shot bem tratada > duas tentando aparecer.

4. Actionable Content & CTAs
   4.1 — Hierarquia de CTA (HIGH / S). Hoje tudo é igual ("Conversar", "Contratar →", "Agendar →") — mesmo peso visual, mesmo vermelho. Estabelecer:
   - Primário (1 só): Agendar reunião — vermelho preenchido, grande
   - Secundário: WhatsApp / Email — outlined ou ink-filled
   - Terciário: Social — ícones discretos
     4.2 — Verificar telefone e copy (HIGH / S). O número 5563999999337 parece placeholder (todos 9s). Trocar pelo real ou avisar. Mesma coisa com victorneves478@gmail.com — confirmar.
     4.3 — Testimonials (MED / M). Nenhum lugar mostra que tem cliente feliz. Adicionar 2-3 quotes curtas (12 palavras max cada) entre Jornada e Projetos.
     4.4 — FAQ enxuto (MED / M). 4 perguntas antes do contato: "Quanto tempo leva?", "Como funciona o pagamento?", "Atende remotamente?", "O que precisa pra começar?". Cada uma 2 frases.
     4.5 — Trim service descriptions (MED / S). Hoje cada serviço tem ~3-4 linhas. Reduzir pra 1 frase + preço + botão. Quem quer detalhe pergunta.
     4.6 — Hero precisa de um CTA visível (LOW / S). Hoje a única ação no hero é "scroll". Adicionar um botão sutil "Ver projetos →" que pula direto pra #portfolio.

5. Accessibility & Speed
   5.1 — Lighthouse audit fresco (HIGH / S). Rodar mobile + desktop, anotar o que regrediu. Meta: 95+ nas 4 categorias. Suspeitos atuais: LCP do hero (Fraunces blocking), CLS (web font swap pode mover layout), TBT (WebGL fluid se ainda existir).
   5.2 — Touch targets ≥44px (HIGH / S). As bolinhas de tema/translate na nav são 38×38. Subir pra 44×44 (HIG/MD compliance).
   5.3 — Auditoria de keyboard nav (HIGH / S). Tab order deve seguir leitura. Focus rings visíveis em tudo clicável, inclusive nos cards de projeto, no drag-scroll, nas chips do hero. Hoje não testei.
   5.4 — Contraste de cor verificado (MED / S). Cream sobre ink: 16:1 ✓. Red sobre cream: 5.4:1 ✓ (AA). Mas red sobre ink (a CTA quando hover) precisa medir. E ink sobre red (botão preto na seção contato vermelha): 12:1 ✓.
   5.5 — Service Worker (MED / S). O sw.min.js é do site original e provavelmente cacheia a lista de assets antiga. Verificar se ele invalida o cache pra playful.css/js. Se não, atualizar a versão do cache.
   5.6 — Aria-live para o cursor label (LOW / S). Hoje a label-pill que aparece no cursor é decorativa (aria-hidden). OK pra usuários de mouse, mas screen readers perdem o contexto. Adicionar uma live region invisível que anuncia o nome do projeto/empresa quando focado.
   5.7 — Reduced-motion review final (LOW / S). Garantir que toda animação tem fallback. Já tem em quase tudo, mas: tilt 3D, drag-scroll inertia, sticky nav blur — confirmar.

X. Estratégico / Cross-cutting
X.1 — Auditoria de copy em PT-BR (HIGH / M). Texto está bom mas alguns trechos parecem inflados (services em particular). Passar uma vez cortando 30% das palavras.
X.2 — Decidir se a Jornada precisa de 11 cargos (MED / S). 11 cards é muito. Selecionar 5-6 highlights (UNICAMP, Coca-Cola FEMSA, IBM, SEBRAE, Freelance) e mover o resto pra um "Ver tudo" expandível.
X.3 — Decidir se o link Super Mario fica (LOW / S). É charming mas distrai. Manter? Remover? Mover pro footer?
X.4 — Página individual por projeto (LOW / L). Hoje toast popup é o detalhe. Eventualmente cada projeto deveria ter /project/caato, /project/boas-obras, etc. com case study real. Isso é um overhaul de outra escala.

Resumo de prioridades pra atacar primeiro (HIGH):

2.2 — Arrancar o WebGL fluido bugado, pôr algo simples e estável
1.1 — Mobile menu (sem isso celular tá quebrado)
3.1 + 3.2 — Cortar paleta + cortar motion paradigms (consolidação visual)
4.1 + 4.2 — Hierarquia de CTA + verificar telefone real
5.1 — Lighthouse audit pra ver onde estamos
2.1 — Auditoria mobile (reflow / overflow / type scale)
5.2 + 5.3 — Touch targets + keyboard nav
