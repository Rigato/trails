# README — Trails

**Porta de entrada do projeto.** Detalhes vivem nos documentos abaixo; a memória do agente guarda só o índice de jogos.

## O jogo
**Trails** (ex-*Trilhos*) é um puzzle de roteamento ferroviário em grade para telas de toque. Locomotivas coloridas avançam uma célula a cada ação do jogador — **1 ação = 1 passo** — e ele gira desvios, pontes e cruzamentos para entregar cada trem à estação da própria cor antes que o tabuleiro o destrua. Não basta conectar os pontos: é preciso conectá-los **no passo certo**.

## Estado atual
Pré-protótipo. MVP de validação de regras com fases descartáveis. Decisão do designer: **validar a diversão da mecânica base antes de investir em loja/consumíveis (sink em 2ª fase).**

**P0 «Contrato» implementado (18–19/11/2026)**: fase tutorial 6×6 jogável de ponta a ponta — 1 ação = 1 passo, previsão de trajetória, botão «passar turno», animação com buffer de input, hint do primeiro giro; 91 testes. Pendente: a sessão de playtest com jogador (Q1/Q2/Q6 do plano de protótipo) e o registro de D1–D6 no GDD via Hefesto.

Versionamento: git com push constante para `https://github.com/Rigato/trails`; GitHub Pages servindo o último estado jogável em **https://rigato.github.io/trails/** (deploy automático a cada push em `main`).

## Decisões-chave já fechadas
- **Y = desvio ferroviário bidirecional:** talo → ponta ativa; qualquer ponta → talo. Toques alternam trocar-ponta-ativa ↔ girar 90° (8 estados).
- **Vitória dinâmica:** entregar todas as locomotivas ativas restantes; vidas (3) = orçamento de perdas. Detecção de não-vencível trivial: sem trem ativo + entregas pendentes → sugerir desistir.
- **Botão "passar turno"** + toque nulo em cruzamento/peças fixas.
- **Economia:** recompensa superlinear por trem entregue (vitória de 1 trem = "chocha"); sink (consumíveis + dicas progressivas) só no pós-MVP.
- **MVP:** fases manuais descartáveis (tutorial impossível de falhar → Y+2 trens → rio/ponte → túnel+cruzamento); gerador de fases fica para depois da validação.

## Pendências principais
Colunas do tabuleiro (testar 6–8) · fórmula do bônus de trem · caso de borda colisão+descarrilamento simultâneo · direção de arte (candidata: minimalismo geométrico) · plataforma/engine.

## Documentos da pasta
| Arquivo | Papel |
|---|---|
| `gdd-trails.md` | Fonte única de verdade — decisões com [FECHADO] / [CONFIRMAR] / [A DEFINIR] |
| `plano-prototipo.md` | O que o protótipo precisa provar, em que ordem, e como ler os resultados |
| `spec-tecnica-publicacao.md` | Referência técnica de publicação HTML5 (itch.io, GameFlare, Playgama, CrazyGames) — herdada do Bricklike; requisitos e features a considerar na implementação pensando na publicação |

## Como trabalhar neste projeto
- Decisões novas entram no GDD com as marcações; este readme é só resumo executivo.
- Documentação substituída ou de fases/projetos anteriores vai para `old/` — nunca apagar sem decisão explícita.
- Ritmo: ~7 h/semana em sessões curtas.
- Implementação técnica: Opencode (plano opencode GO, LLM principal DeepSeek V4.1 Flash 1017) — gerida pelo usuário; Hefesto atua no design, não na implementação.
