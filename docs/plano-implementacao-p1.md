# Trails — Plano de Implementação P1 «Sincronia»

| | |
|---|---|
| **Data** | 19/11/2026 |
| **Escopo** | P1 «Sincronia» (brief em `plano-prototipo.md` §5/§8): **peça Y + segundo trem + vidas**. Nada além disso — ver §8. |
| **Base** | GDD v1.2 §3 (Y [FECHADO] em §3.2; vidas em §3.7; tabela §3.10) · `plano-prototipo.md` §8-P1 (Q3/Q4/Q8) · `plano-implementacao-v1.md` (arquitetura do P0; épicos E0–E5 concluídos e aprovados em playtest) |
| **Estado** | P0 «Contrato» aprovado pelo designer em 19/11/2026. Decisão do designer para o P1: **com vidas** (D7, §7). Aguardando aprovação deste plano. |
| **Destino** | Vive em `docs/plano-implementacao-p1.md`. O plano v1 (P0) permanece como registro da execução do P0. |

> Regra de conflito herdada: o GDD vence sobre os demais; o plano-protótipo define escopo e ordem. O P1 do plano-protótipo é «+ Y + 2º trem»; **vidas entraram por decisão explícita do designer** (registrada como D7) — este plano a incorpora sem ampliá-la further.

---

## 0. O que é o P1 (o que o jogador vive)

O boot continua no tutorial aprovado (P0). Ao vencê-lo, o botão de largura total vira **«Próxima fase»** e carrega a fase **«Sincronia»**: dois trens (vermelho/círculo e azul/quadrado) entram juntos no primeiro passo, cada um rumo à estação da própria cor. No meio do tabuleiro, um **Y** — talo e duas pontas, com a **agulha desenhada alinhada ao canal ativo**. A previsão pontilhada de cada trem reflete o estado atual do Y: talo → ponta ativa; qualquer ponta → talo.

O coração da fase: **os dois trens passam pelo mesmo Y em passos diferentes** — a agulha precisa apontar para o trem A no passo *k* e para o trem B no passo *k+n*. Tocar o Y alterna **trocar ponta ativa ↔ girar 90° CW** (ABAB). Colisões e descarrilamentos custam **vidas** (3 por run, 1 por evento); perder tudo é derrota; perder um trem reduz o requisito de vitória (dinâmica) — entregar 1 de 2 ainda vence, e o playtest mede se isso é vivido como estratégia ou como «chocha» (Q8).

O que o P1 precisa provar (Q3/Q4/Q8): o **ABAB é operável sob pressão** (o jogador erra a decisão ou a ação?); a **janela temporal produz «aha»** (ri/xinga na primeira janela apertada, pede «mais um»); o **sacrifício é legítimo e divertido**. Sinais completos em `plano-prototipo.md` §8-P1.

## 1. Base técnica — herdada do P0, sem mudanças

Stack (TS + Vite + Canvas 2D, zero deps), arquitetura core-puro/render/input, trilha Actions→Pages, o loop rAF do E3 e o buffer D4 do E1 **permanecem exatamente como estão**. Este plano só descreve os deltas. Requisitos da spec continuam valendo (44 pt, DPR 1, safe-area, zero externos, single-threaded).

## 2. Mudanças no core

### 2.1 Peça Y — modelagem ([FECHADO] §3.2 + §3.8)

- `PieceKind` ganha `'y'`. **`YPiece = { kind: 'y', rot, arm: 0|1, next: 'toggle'|'rotate' }`** — a extensão do `Piece` é aditiva: o `switch` de `movement.ts` (sem case vira erro de compilação) recebe o case novo; o motor de passo não muda.
- **Orientação canônica (proposta, documentada no contrato pelo SA1):** `rot: 0` = **talo ao norte; pontas leste (braço 0) e oeste (braço 1); lado sul fechado**. Cada `rot` gira o conjunto CW; `arm` é **relativo à peça** (viaja com a rotação). 4 orientações × 2 braços = **8 estados**.
- **Movimento (tabela):** entra pelo lado do talo → sai pela **ponta ativa**; entra por **qualquer ponta** (ativa ou inativa) → sai pelo **talo**; lado fechado → `noExit`. `resolveCell` cobre passo e previsão de uma vez.
- **Controle ABAB por peça (D8):** cada Y carrega `next`; **todo toque no Y inverte `next`** — 1º toque troca a ponta ativa, 2º gira 90° CW, alternando para sempre. Primeiro toque de cada Y é sempre «trocar ponta» (GDD). Dois Ys independentes têm alternâncias independentes.
- **Classificação/estado:** `ActionOutcome` ganha `'toggled'` (com célula e before/after); `'toggled'` **avança o passo** como `'rotated'` (§3.3: alternar ponta é ação válida). `GameEvent` ganha `'pieceToggled'`. Célula ocupada por trem bloqueia o toque no Y (sem passo), igual a qualquer peça.
- **Previsão:** já cai de graça via `resolveCell` — recalculada a cada giro/troca, reflete o braço ativo (§3.8). Com 2 trens, **uma previsão por trem, na cor do trem** (P0 já desenha por trem).
- **Nota de leitura de regra (para registrar no GDD via Hefesto):** o caso §3.10 «dois trens entram pelo Y em pontas opostas no mesmo passo» resolve, no modelo compute-then-resolve, como **colisão na célula do Y** (ambos chegam nela no mesmo passo; «saem pelo talo» descreve a trajetória pretendida) — coerente com «uma célula de Y comporta um trem por vez». Trocas através do Y caem na regra geral de swap.

### 2.2 Vidas — por fase, no dado (D7, decisão do designer)

- **`LevelLayout.lives?: number`** — ausente/`undefined` = semântica D1 (a fase tutorial **não tem vidas**: «a falha não existe como estado/custo»); `3` = GDD §3.7. `GameState.lives: number | null`.
- **Custo:** cada **evento de colisão** custa 1 vida (independente do nº de trens); cada **descarrilamento** custa 1 (trens perdidos em colisão **não** pagam individualmente — já saíram no evento); dois descarrilamentos independentes no mesmo passo = 2; **descarrilamento duplo na mesma célula = colisão = 1** (ratifica o [CONFIRMAR] do §3.10 caso 6, já comportamento do motor).
- **Eventos/estado:** `GameEvent` ganha `'lifeLost'` (contagem do passo); `GameStatus` ganha `'lost'`. **D11: `lost` tem precedência** sobre `won`/`deadEnd` no mesmo passo (orçamento esgotado = derrota).
- **Derrota/desistência:** `lost` (perdeu a última vida) ou deadEnd (sem trem ativo + nenhuma entrega → sugere desistir). **Reiniciar = desistir** (GDD §3.7): gratuito, sempre disponível; no P1 não há moedas para descartar — a semântica fica registrada, o efeito visível é o reset (vidas restauradas).
- **Nota honesta de aritmética:** com 2 trens, 3 vidas **não zeram** (máx. 2 eventos de perda por run) — `'lost'` é inalcançável no conteúdo do P1 e só existe como estado testado (com 3 trens fabricados em teste). As vidas no P1 valem como **feedback visível de perdas** e preparam P2/P3 (F3, com 3–4 trens, torna `'lost'` alcançável). O designer deve saber disso ao ler o playtest.

### 2.3 Segundo trem — dado, zero motor

Motor N-trens de fábrica (§3.6 já é multi-trem; colisões/§3.10 testadas desde o E1). O segundo trem entra **no dado do layout**: nova entrada distinta, novo par cor+forma (azul/quadrado), nova estação — máximo uma locomotiva **e** uma estação por cor (§3.5). Ambos entram na grade **no primeiro passo** (§3.5: todas partem juntas). Previsões simultâneas, uma por trem, cores distintas — a legibilidade de 2 previsões é parte do que o P1 expõe.

### 2.4 Sequência de fases (D10) — handoff sem menu

`src/level/index.ts` exporta `PHASES = [P0_LEVEL, P1_LEVEL]`. O boot carrega a primeira; **vitória** numa fase que tem sucessora → botão de largura total vira **«Próxima fase»** (a maquinaria de botão é o E3/D5, sem menu); `Recomeçar`/deadEnd/`lost` recomeçam **a fase atual** (vidas junto). Vitória na última fase → «Jogar de novo» (fase atual). Menus continuam fora de escopo (§8).

## 3. Épicos E6–E10 com critério de pronto

Estimativas em sessões (~7 h/semana). E6 e E7 correm em paralelo após a entrega do contrato de tipos (o mesmo destravador do P0).

### E6 — Core: Y + vidas · ~1 sessão · SA1
- **Entrega destrutadora (primeiro bloco):** `types.ts` estendido (YPiece/arm/next, `'toggled'`, `pieceToggled`, `lifeLost`, `lives`, `'lost'`, `LevelLayout.lives?`) — destrava o SA2.
- Conteúdo: case Y em `movement.ts`; ABAB em `actions.ts`; custo de vidas + `'lost'` em `step.ts`; testes.
- **Pronto quando (testes automatizados):**
  1. Tabela Y: 8 estados; talo→ponta ativa; ponta qualquer→talo; lado fechado→noExit; giro CW do conjunto; braço ativo relativo.
  2. ABAB por peça: 1º toque troca, 2º gira, alterna; dois Ys independentes; **todo toque em Y avança exatamente 1 passo**; ocupado bloqueia sem passo; D4 com Y (toggle enfileirado que virou célula ocupada descarta sem passo).
  3. Vidas: colisão de 2 = 1 vida; 2 descarrilamentos independentes no mesmo passo = 2; duplo na mesma célula = 1; vitória com perdas; `'lost'` ao zerar (3 trens fabricados) com precedência D11; nível sem `lives` (tutorial) inalterado — **todos os testes E1 existentes continuam verdes**.
  4. §3.10 com Y real: dois trens → mesma célula Y no mesmo passo = colisão; swap através do Y.
  5. Janela de sincronia (fabricada): trem A cruza o Y no passo k, B no k+n, Y rearmado entre ambos → ambos entregues; sem rearmar → colisão.

### E7 — Render: Y, segundo par, HUD de vidas, handoff · ~1 sessão · SA2 — paralelo a E6 após `types.ts`
- Conteúdo: Y desenhado por código (3 stubs + **agulha alinhada ao canal ativo**, legível de relance — §3.2 game feel; sem indicador da próxima ação, D9); segundo par cor+forma; previsão por trem na cor de cada trem; **HUD de vidas** (marcas geométricas: cheias = vivas, vazias = perdidas; legível em DPR 1; sem texto); `level/index.ts` + handoff «Próxima fase» (§2.4); fase P1 **rascunho** editável para jogar ponta a ponta.
- **Pronto quando:** rascunho joga ponta a ponta com 2 trens + Y (agulha muda visível no toggle); 2 previsões simultâneas legíveis; vidas visíveis e decrescem; handoff tutorial→P1 funciona; 44 pt / DPR 1 / mouse+toque / sem scroll.

### E8 — Feel do Y + vidas · ~0,5–1 sessão · SA3
- Conteúdo: agulha anima (`yToggleMs`); giro do Y anima (`rotationMs`); pulse na marca de vida perdida (`lifeLostPulseMs`); regressão do buffer com 2 trens + Y (rajada na janela).
- **Pronto quando:** toggle e giro visíveis e suaves; 3 toques rápidos durante a animação → 3 passos na ordem (com 2 trens em campo); 60 fps; reset limpa buffer/animação/fx e restaura vidas; console limpo.

### E9 — Fase «Sincronia» · ~1 sessão · SA4
- Conteúdo: `level/p1.ts` **definitivo** (6×6; até 8 colunas se a janela pedir) + `test/level/p1.test.ts`; walkthroun próprio via CDP (padrão E4).
- **Requisitos da fase (o experimento Q3/Q4/Q8):** 2 entradas, 2 estações, **≥1 Y atravessado pelos DOIS trens em passos diferentes** (janela de 2–4 passos — apertada para exigir atenção, larga para ser planejável); solução 12–20 passos documentada no arquivo (mapa, tabela de paradas por passo, **o passo da janela**); colisão possível e dramática; **caminho sacrificial possível** (entregar 1 de 2 como escolha real); decoys opcionais (≤4); ambos entram no passo 1.
- **Pronto quando:** solução documentada entrega sem colisão; **a janela é exigente** (não vence sem rearmar o Y no meio da run); a rota sacrificial entrega 1 trem e vence (dinâmica); o arquivo documenta também a solução sacrificial; playtest executável sem atrito técnico.

### E10 — Auditoria P1 + handoff de playtest · ~0,5 sessão · SA5
- Conteúdo: auditoria linha-a-linha (§3.2 Y, §3.5 dois trens, §3.6/§3.7 vidas/`lost`/dinâmica, §3.8 previsão-Y, §3.10 casos Y) × código; honestidade do tuning (novos parâmetros vivos, provados na prática); matriz mínima (2 trens, Y, vidas; 907×510, DPR 1/2, toque real); varredura §8; texto consolidado D1/D2/D7–D11 + leitura do caso Y para o Hefesto; checklist manual do designer.
- **Pronto quando:** checklist sem divergências (ou documentadas); tuning provado; nada da §8 no build; veredito de prontidão para o playtest.

**Total estimado: ~4 sessões** (≈1 semana no ritmo do projeto).

## 4. Subagentes

Mesmo modelo e mesma regra do P0: `opencode-go/deepseek-v4.1-flash#max`, um por frente; o orquestrador (GLM 5.3 #max) não implementa — dispara, valida na prática, integra, versiona. Cada épico fechado = commit + push (Pages sempre jogável).

| SA | Frente | Épico | Depende de |
|---|---|---|---|
| SA1 `core-rules` | Y + vidas no motor + testes | E6 | aprovação deste plano |
| SA2 `board-render` | Y/2º par/HUD vidas/handoff | E7 | `types.ts` do SA1; depois, paralelo a E6 |
| SA3 `feel-engine` | agulha, pulses, regressões de buffer | E8 | E6 + E7 |
| SA4 `level-deploy` | fase «Sincronia» + trilha | E9 | E6–E8 |
| SA5 `qa-audit` | auditoria + matriz + escopo | E10 | E9 |

## 5. Riscos e ordem de ataque

| # | Risco | Ataque |
|---|---|---|
| 1 | **ABAB inoperável sob pressão** (Q3 — o coração do P1; sinal de falha: errar repetidamente a AÇÃO, não a decisão) | Agulha legível de relance (§3.2); **D9 mede o ABAB cru**; branches pré-definidos em `plano-prototipo.md` §5-P1 (toque curto vs. longo; botão dedicado) são decisão do designer, **não pré-implementados**. |
| 2 | **Janela mal calibrada** (Q4: «aha» vs. frustração de execução) | E9 itera com o designer; instrumento failing-vs-skipping na sessão; janela parametrizada pelo layout (dado), não por código. |
| 3 | **Geometria do Y (8 estados)** | Tabela exaustiva testada; convenção canônica única motor↔render (a lição do P0: `tracePiecePath` compartilhado). |
| 4 | **Vidas inalcançáveis com 2 trens** | Aritmética documentada (§2.2); `'lost'` testado com 3 trens fabricados; designer ciente no playtest. |
| 5 | **Regressão de 1 ação = 1 passo** (o coração) | Testes E6 item 2 + auditoria E10 contra §3.3 com Y; rajada do E8 com 2 trens. |
| 6 | **Legibilidade de 2 previsões simultâneas** (antecipação de Q7) | Cores distintas + formas redundantes; previsão na cor do trem (§3.8); observável no playtest. |

## 6. Tuning — adições ao `config/tuning.ts`

Os defaults do P0 permanecem. Adições (defaults de protótipo, não decisão fechada):

| Parâmetro | Default | Efeito |
|---|---|---|
| `yToggleMs` | 120 | Swing da agulha na troca de ponta ativa |
| `yNeedleRatio` | 0.38 | Tamanho da agulha relativo à célula |
| `lifeLostPulseMs` | 350 | Pulse na marca de vida perdida no HUD |
| `palette.pairs` | `['#d64545', '#3b82f6']` | Default dos pares por fase; `palette.pair` migra para `pairs[0]` (F-01 continua válido: a fase lê do tuning) |

Vidas ficam no **dado da fase** (`LevelLayout.lives`), não no tuning — são regra de run (§3.7), não feel.

## 7. Decisões — D7 a D11

**D7 (DECIDIDO pelo designer, 19/11/2026): vidas no P1, conforme GDD §3.7.** 3 por run; 1 por evento de colisão (independente do nº de trens) e 1 por descarrilamento independente; descarrilamento duplo na mesma célula = colisão = 1 (ratifica o [CONFIRMAR] §3.10-6); derrota ao perder a última (`lost`) ou ao desistir; **reiniciar = desistir** (gratuito, sempre disponível; sem moedas para descartar no P1). Modelagem: por fase, no dado; a fase tutorial segue D1 (sem vidas).

**D8 (recomendação): ABAB por peça.** Cada Y guarda a própria alternância (`next`), invertida a cada toque; primeiro toque de cada Y = trocar ponta (GDD). Alternativa global rejeitada: acoplaria peças distantes e tornaria o controle ilegível.

**D9 (recomendação): sem indicador visual da próxima ação ABAB no v1.** O Q3 mede o ABAB cru; um indicador mascararia o sinal. Se o playtest falhar por controle, o indicador (ou variantes) entra como branch com o mesmo status da original.

**D10 (recomendação): handoff tutorial → Sincronia.** Vitória na fase do P0 vira «Próxima fase» (botão de largura total existente); boot continua no tutorial. Alternativa (boot direto na fase nova) rejeitada: jogadores externos precisam do contrato ensinado antes de Q3/Q4 serem legíveis.

**D11 (recomendação): `lost` tem precedência sobre `won` no mesmo passo.** Orçamento esgotado encerra a run como derrota mesmo com entrega simultânea. Inalcançável com 2 trens; registrado para P2/P3.

**Pendente de registro no GDD via Hefesto (consolidado no E10):** D1, D2 (texto pronto no relatório do E5), D7–D11 e a leitura do caso §3.10-Y (colisão na célula do Y, §2.1).

## 8. Fora de escopo (imutável)

Além da lista do P0 (que permanece), **isto também não entra no P1**: moedas/contador (P2) · rio/ponte (P2) · túnel · cruzamento · montanha (P3) · 3+ trens no conteúdo (só em testes fabricados) · indicador da próxima ação ABAB (D9) · variantes de controle do Y (branches, não v1) · gerador de fases · save/localStorage · menu · áudio · paisagem · desfazer · consumíveis · fórmula de bônus · estrelas/ranking · tutorial multi-tela.

Qualidade de protótipo: feio e funcional; **cor E forma em todo par**; 1 ação = 1 passo é o coração — nada mais move os trens. A fase **tutorial** continua impossível de falhar por design (D1); a fase **Sincronia tem derrota real** — isso é o experimento, não um bug.

## 9. Aceitação do P1

**Técnicos (verificáveis sem jogador):**
- [ ] 1 ação = 1 passo auditado com Y (toggle, giro, passar turno, nulo, bloqueado, buffer, invalidada) — testes automatizados.
- [ ] Previsão reflete o braço ativo do Y; recalcula a cada ação; 2 previsões simultâneas.
- [ ] Vidas: custo por evento correto (colisão=1, descarrilamentos independentes=1 cada, duplo-na-mesma-célula=1); `lost` com precedência; reiniciar reseta vidas; tutorial sem vidas (testes E1 intactos).
- [ ] Janela da fase é exigente: a solução documentada exige rearmar o Y entre as passagens.
- [ ] Célula/botões ≥ 44 pt; DPR 1/2; zero externos; console limpo; < 3 s cache frio via Pages; recomeço em 1 toque.
- [ ] Nada da §8 no build.

**De leitura (sessão com jogador — Q3/Q4/Q8):**
- [ ] O jogador erra a **decisão** do Y ou a **ação**? (ação repetida = problema de controle → branches)
- [ ] Primeira janela apertada: riso/xingo saudável? Pede «mais um»?
- [ ] Sacrificar um trem é estratégia legítima — e qual dos dois é mais divertido?
- [ ] Failing vs. skipping; think-aloud; checklist pós-sessão §9 do plano-protótipo.

## 10. Próximos passos

1. Designer aprova este plano (D8–D11 são recomendações pendentes da aprovação).
2. Orquestrador dispara E6 (SA1) — contrato de tipos destrava E7 (SA2) em paralelo.
3. Cada épico fechado = commit + push (Pages reflete sempre o último estado jogável).
4. Registrar D1/D2/D7–D11 + leitura §3.10-Y no GDD via Hefesto (texto consolidado no E10).
5. Playtest → leitura Q3/Q4/Q8 → branch (controles/economia) ou P2 «Obstáculos» (rio/ponte + moedas contador burro).
