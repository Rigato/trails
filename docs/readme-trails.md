# README — Trails

**Porta de entrada do projeto.** Detalhes vivem nos documentos abaixo; a memória do agente guarda só o índice de jogos.

## O jogo
Puzzle de roteamento ferroviário em grade para telas de toque. Locomotivas coloridas avançam uma célula a cada ação do jogador — **1 ação = 1 passo** — e ele gira desvios, pontes e cruzamentos para entregar cada trem à estação da própria cor antes que o tabuleiro o destrua. Não basta conectar os pontos: é preciso conectá-los **no passo certo**.

## Estado atual
**MVP2 em implementação (22/11)** — proposta `proposta-mvp2.md` v2 aprovada; decisões abertas fechadas pelo designer (D23–D32 no GDD v1.4); plano operacional `plano-implementacao-mvp2.md`. Ordem: seletor CW/CCW → economia (save/bônus/selo/loja) → tutorial 4 fases → faixa 1 (4 fases de 3 trens) → **gate «é xadrez agora?»** → faixas 2–3. O protótipo P0–P3+ (mecânica validada pelo designer em 21/11; 238 testes) é a fundação — sem reescrita. **Derrota barata é design confirmado**; o valor vem da aspiração. Playtests externos pendentes — instrumento de calibração, não bloqueio.

## Decisões-chave já fechadas
- **Y = desvio ferroviário bidirecional:** talo → ponta ativa; qualquer ponta → talo. Toques alternam trocar-ponta-ativa ↔ girar 90° (8 estados).
- **Vitória dinâmica:** entregar todas as locomotivas ativas restantes; vidas (3) = orçamento de perdas. Detecção de não-vencível trivial: sem trem ativo + entregas pendentes → sugerir desistir.
- **Botão "passar turno"** + toque nulo em cruzamento/peças fixas.
- **Economia:** recompensa superlinear por trem entregue (vitória de 1 trem = "chocha"); sink (consumíveis + dicas progressivas) só no pós-MVP.
- **MVP:** fases manuais descartáveis (tutorial impossível de falhar → Y+2 trens → rio/ponte → túnel+cruzamento); gerador de fases fica para depois da validação.
- **Tutorial sem vidas (D1):** descarrilar no tutorial = recomeço em 1 toque, sem punição — momento didático.
- **Loops (D2):** anel fechado com marcador na previsão; trem em loop segue ativo — loop é ferramenta de espera/sincronização, não erro.
- **Horizonte da previsão (D21):** janela visível de ~6 células com corte esmaecido; morte local anunciada, morte remota vira descoberta (revisão do Pilar 3).
- **Y por conexão (D12-v2):** talo + braço ativo em L contínuo em negrito; braço inativo translúcido mas inteiro; sem setas — a conexão é a semântica.
- **Entrada off-board (D13):** trens esperam fora da grade; primeira célula é peça de trilho comum — "entrada" deixou de ser elemento fixo.
- **Moedas overlay (D16):** sobre célula de trilho/ponte, nunca água/estação/vazio; contador burro no MVP; fórmulas continuam [A DEFINIR].
- **Densidade (D20, revisada 21/11):** jogo real começa em 3 trens e sobe (4 no pico); 2 trens é linguagem de tutorial; 5+ fora do MVP.
- **Seletor CW/CCW (D22):** essencial por teste do designer em primeira mão — contragiro vira lance; fora do tabuleiro, modo persistente [CONFIRMAR].
- **Derrota barata é design (21/11):** restart em 1 toque permanece; o valor do êxito vem por aspiração — selo de perfeição + bônus por trem entregue. E3 do brief reformulado (proposta-mvp2.md).
- **MVP2 — sink aprovado (21/11):** save entre sessões (fases, selos, carteira); loja rudimentar com **Resgate de trem** (trem perdido volta ao início; não devolve vida; alternativa à desistência) e **Time-travel** (reverte 1 passo integral); ambos custam moedas e bloqueiam o selo; **energia** (F2P/ads) anotada para pós-MVP2.
- **MVP2 — decisões do designer (22/11, D23–D32):** tutorial de **4 fases** (P3+ sai; transição de tom no fim); **wingdings puro** para conceitos novos (D6, zero texto); seletor na **fileira inferior junto de «Passar turno»**, modo persistente + ABAB ortogonal; bônus por trem em **tabela n×(n−1)** (+0/+2/+6/+12, legível na vitória); Resgate **1/run ~8** (último trem perdido); Time-travel **fixo ~4/uso**; selo = **estrela dourada** (forma+cor); farm entre sessões **aceito e observado**; **toda fase 100% viável** (perda forçada fora do MVP2).

## Pendências principais
**Playtest de validação (Q1–Q8) — instrumento durante o MVP2** · colunas do tabuleiro (QA em curso) · preços vivos da loja (tuning) · direção de arte (candidata: minimalismo geométrico) · plataforma/engine (portais).

## Documentos da pasta
| Arquivo | Papel |
|---|---|
| `gdd-trails.md` | Fonte única de verdade — decisões com [FECHADO] / [CONFIRMAR] / [A DEFINIR] |
| `referencias-comparativas.md` | Estudo de Trainyard, Railbound, Pipe Mania, Mini Metro (+ lições do GDC de Trainyard/Cut the Rope) |
| `plano-prototipo.md` | O que o protótipo precisa provar, em que ordem, e como ler os resultados |
| `proposta-mvp2.md` | Escopo MVP2 aprovado (v2) — nasceu do veredito do designer + brief para o Hefesto |
| `brief-mvp2-hefesto.md` | Contexto: veredito do protótipo e os quatro eixos do MVP2 |
| `plano-implementacao-mvp2.md` | Plano operacional do MVP2 — épicos M1–M9, critério de pronto, decisões D23–D32 |
| `prompt-opencode.md` | Prompt pronto para o orquestrador (Opencode) criar o plano de implementação com subagentes |

## Como trabalhar neste projeto
- Decisões novas entram no GDD com as marcações; este readme é só resumo executivo.
- Ritmo: ~7 h/semana em sessões curtas.
- Implementação técnica: Opencode (plano opencode GO, LLM principal DeepSeek V4.1 Flash 1017) — gerida pelo usuário; Hefesto atua no design, não na implementação.
