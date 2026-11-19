# README — Trails

**Porta de entrada do projeto.** Detalhes vivem nos documentos abaixo; a memória do agente guarda só o índice de jogos.

## O jogo
**Trails** (ex-*Trilhos*) é um puzzle de roteamento ferroviário em grade para telas de toque. Locomotivas coloridas avançam uma célula a cada ação do jogador — **1 ação = 1 passo** — e ele gira desvios, pontes e cruzamentos para entregar cada trem à estação da própria cor antes que o tabuleiro o destrua. Não basta conectar os pontos: é preciso conectá-los **no passo certo**.

## Estado atual
Pré-protótipo. MVP de validação de regras com fases descartáveis. Decisão do designer: **validar a diversão da mecânica base antes de investir em loja/consumíveis (sink em 2ª fase).**

**P0 «Contrato» implementado e aprovado em playtest (18–19/11/2026)**: tutorial 6×6 jogável de ponta a ponta — 1 ação = 1 passo, previsão, «passar turno», animação com buffer, hint do primeiro giro.

**P1 «Sincronia» implementado (19/11/2026)**: peça Y (8 estados, ABAB por peça, agulha animada), 2º trem (azul/quadrado), vidas por fase no dado (3 na Sincronia; tutorial sem vidas), handoff tutorial→Sincronia, fase definitiva de 12 passos com janela de sincronia (passos 9→11), colisão por convergência e rota sacrificial. Ajustes pós-playtest: trens esperam FORA do tabuleiro (entrada = marcador de borda + trilho na primeira célula) e indicação do Y = seta da rota + realce do canal ativo.

**P2 «Obstáculos» implementado (19/11/2026)**: rio (banda reta, `water` com marcador próprio) com ponte única fixa, moedas como contador burro (slot §3.6, coleta por chegada, sem fórmula), fase definitiva com escolha real de rotas (oeste/ponte 14 passos·5 moedas vs leste 11·3), janela do split com a tentação de espera do Q5 e sacrifício de água.

**P3 «Densidade» implementado e o protótipo COMPLETO no ar (19/11/2026)**: túnel (par simétrico, travessia 1 passo, fade em dois tempos), cruzamento (2 canais, sem ação), montanha (motivo próprio), fases «Densidade» (3 trens, legível por construção, 15 passos) e «Densidade+» (4 trens, prova de carga do Q7, `lost` alcançável pela primeira vez) — cadeia de 5 fases, 238 testes. Correções pós-playtest no caminho: Y por CONEXÃO (D12-v2), trilho sempre visível na previsão, horizonte D21 (6 células), trens fora com margem (V-4). Pendências: as sessões externas (o gate do método — checklist em `docs/checklist-sessao-externa-p0-p2.md` + a sessão Q7 do contraste 3→4), o registro de **D1–D21 no GDD via Hefesto** (texto consolidado pronto no relatório E20), V-4-907 (decisão do designer), `__trailsDebug` (gate antes de release público).

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
