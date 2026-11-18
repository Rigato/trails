# AGENTS.md — Trails

Instruções permanentes para agentes de IA trabalhando neste projeto. O usuário fala português; a documentação é mantida em português.

## O projeto

**Trails** (ex-*Trilhos*) — puzzle de roteamento ferroviário em grade para telas de toque. Fase atual: **MVP para validar as mecânicas básicas** (fases manuais descartáveis; gerador de fases, loja/consumíveis e arte ficam para depois da validação).

- Fonte única de verdade de design: `docs/gdd-trails.md` — decisões marcadas `[FECHADO]` / `[CONFIRMAR]` / `[A DEFINIR]`.
- Índice e resumo executivo: `docs/readme-trails.md`.
- O que o protótipo precisa provar, e em que ordem: `docs/plano-prototipo.md`.
- Requisitos técnicos a considerar na implementação pensando na publicação: `docs/spec-tecnica-publicacao.md` (referência ativa, herdada do projeto anterior).

## Regras

1. **Nome do jogo é Trails.** Renomeado de "Trilhos" para nome internacional; a palavra "trilho" como peça/célula do jogo segue em português normal.
2. **Toda documentação vive em `docs/`.** Documento substituído move-se para `docs/old/` — nunca apagar sem decisão explícita do usuário.
3. **Estrutura de pastas é similar entre os projetos** (`old/`; no futuro `release/`, `research/`) — use esses nomes quando as pastas surgirem. **Não acesse a estrutura de pastas de outros projetos** (ex.: Bricklike).
4. **Subagentes usam DeepSeek V4.1 Flash com reasoning MAX**: `opencode-go/deepseek-v4.1-flash#max`, salvo indicação explícita do usuário em contrário.
5. **Design é decisão do usuário** (com o agente de design dele, Hefesto). Agentes não fecham decisões de design sozinhos: registram no GDD como `[CONFIRMAR]` (recomendação pendente de aprovação) ou `[A DEFINIR]` (fronteira aberta).
6. **Git e GitHub.** O projeto é versionado com git e o remote é [`https://github.com/Rigato/trails`](https://github.com/Rigato/trails). Ao completar uma mudança, faça commit e push. O GitHub Pages do repositório servirá o jogo para testes — principalmente no celular — então o que estiver publicado precisa refletir sempre o estado mais recente jogável.
