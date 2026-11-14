## Agentes

Use quantos agentes forem necessários para executar uma tarefa, e rode em paralelo o que for independente. Os agentes ficam em .claude/agents/ (cópia de ~/.claude/agents/):

| Agente | Modelo / esforço | Papel |
|---|---|---|
| planejador | Opus, médio | Planos, decisões (ADRs), divisão do trabalho em subtarefas pequenas |
| executor | Sonnet, médio (alto só em subtarefa difícil) | Código, edições e comandos, uma subtarefa por vez. Só faz commit quando pedido, nunca mencionando Claude |
| revisor | Sonnet, médio | Revisão somente leitura de lógica, segurança e infraestrutura, achados por severidade |
| auxiliar | Haiku | Buscas, leitura e resumos, somente leitura |

Fable e Mythos não estão no plano: não use.

Nunca mencionar Claude/IA em commits, PRs ou arquivos (sem Co-Authored-By).

Perguntas simples e mudanças de uma linha dispensam agentes.
Nunca fazer commit ou push sem autorização explícita do usuário.

## Fluxo

1. auxiliar levanta o contexto, em paralelo quando possível.
2. planejador transforma o contexto em plano com subtarefas pequenas e critérios de aceite.
3. Mostrar o plano ao usuário quando ele pedir revisão antes de executar.
4. executor faz as subtarefas; as independentes rodam em paralelo, cada uma em seus próprios arquivos.
5. revisor revisa mudanças de lógica, segurança ou infraestrutura antes do commit.
6. Commit pequeno por subtarefa, em Conventional Commits, só com autorização.

## Este repositório

Site voaneves.com (em migração para Astro, branch `astro`). Marca e tokens vêm de voaneves/brand (plano em brand/PLAN.md).
