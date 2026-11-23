# Handoff — MVP2 completo (v1.0)

| | |
|---|---|
| **Data** | 23/11/2026 |
| **Para** | Nova sessão de orquestração (ou o designer) — contexto completo para continuar sem reler a conversa |
| **Estado** | MVP2 **construído, validado e publicado**; aguardando o teste do designer no celular («é xadrez agora?») e as sessões externas de calibração |
| **Origem** | Ciclo de 11 commits (`96fd6b3` → `b16ae75`, branch `main`), 9 épicos (M1–M9), 408 testes, 16 fases |
| **Regra de conflito** | **O GDD vence; a proposta define escopo.** Design é decisão do designer (com Hefesto) — agente registra, nunca fecha sozinho |

---

## 0. Resumo para a primeira mensagem da nova sessão

O protótipo P0–P3 (mecânica validada, 238 testes) virou a base do MVP2: **o tutorial tem 4 fases e o jogo real começa depois**. Em um dia de orquestração ponta a ponta — sem gates intermediários, por instrução explícita do designer — foram entregues seletor CW/CCW, save entre sessões com lista de fases, carteira com bônus superlinear, selo de perfeição estrela, loja com Resgate e Time-travel, tutorial reorganizado com transição de tom, e **12 fases reais em 3 faixas** (r1–r12). Tudo validado na prática (testes + build + jogo no browser via CDP, com soluções reais reproduzidas por toques) e publicado no Pages. **O próximo passo é o veredito do designer e os playtests externos; ajustes vêm como tuning ou revisão de nível.**

---

## 1. Leia nesta ordem (documentos)

1. `AGENTS.md` — regras do projeto (nome Trails; docs em `docs/`; subagentes `opencode-go/deepseek-v4.1-flash#max` com reasoning MAX; design é decisão do usuário; commit + push ao completar; não mexer em outros projetos).
2. `docs/readme-trails.md` — índice e resumo executivo (estado atual na linha 9; decisões-chave; documentos na tabela).
3. `docs/gdd-trails.md` — fonte única de verdade, **v1.4**; D1–D32; §6 registra o MVP2 como CONSTRUÍDO e as dívidas nomeadas.
4. `docs/proposta-mvp2.md` — escopo aprovado (v2): os 4 eixos, o checklist de 6 pontos da fase-boa, o gate final.
5. `docs/plano-implementacao-mvp2.md` — plano operacional: épicos M1–M9, tuning, D23–D32, fora-de-escopo.
6. `docs/brief-mvp2-hefesto.md` — de onde veio a proposta (veredito «mecânica validada; falta desafio e diversão»).
7. `docs/checklist-sessao-externa-p0-p2.md` — instrumento de calibração (think-aloud, failing vs. skipping), ainda não executado.
8. `docs/spec-tecnica-publicacao.md` — referência ativa para publicação em portais (save via abstração, `game_ready`, ads só via SDK); não implementado no MVP2.

**Código para ler antes de mexer:** `src/main.ts` (costura shell), `src/core/types.ts` + `game.ts` (contrato e fachada), `src/save/{storage,progress,economy}.ts`, `src/level/index.ts` (PHASES = 16), `src/config/tuning.ts`, um arquivo de fase de cada faixa (`src/level/p3.ts`, `src/level/real/r3.ts`, `r11.ts`).

---

## 2. Estado exato do repositório

- Branch `main`, working tree limpo, remoto `https://github.com/Rigato/trails`.
- **408 testes / 47 arquivos**, `npm run typecheck`, `npm test`, `npm run build`: todos verdes.
- Base de código: TypeScript ~7, Vite 8, Vitest 5, canvas 2D puro, sem dependências de runtime.
- `dist/` é **ignorado**; o GitHub Pages é servido pelo workflow `.github/workflows/deploy-pages.yml`, que reconstrói a cada push. **Todo push publica.**
- Jogo em `https://rigato.github.io/trails/` (aguardando o teste no celular).
- Teste limpo: abrir `?resetSave=1` **uma vez** e navegar para a URL sem a query (com a flag na URL, todo reload limpa).

### Commits do ciclo (ordem)

| Commit | Conteúdo | Testes |
|---|---|---|
| `6f7db7f` | Decisões D23–D32 fechadas pelo designer; GDD v1.4 + plano operacional | 238 |
| `c9ffecc` | M1 — seletor CW/CCW | 251 |
| `a0801ea` | M2 — save entre sessões + lista de fases | 285 |
| `5cb28d9` | M3 — bônus por trem + selo de perfeição | 299 |
| `efcbb15` | M4 — Resgate de trem | 314 |
| `c7deccf` | M5 — Time-travel | 327 |
| `9efeac2` | M6 — tutorial reorganizado (5→4 fases) | 333 |
| `62d63bd` | M7 — faixa 1 do jogo real (r1–r4) | 363 |
| `8b09cca` | M9 — faixas 2–3 (r5–r12) | 408 |
| `b16ae75` | Documentação final (GDD/readme com o ciclo completo) | 408 |

(Além destes, `ff33f13` registrou a decisão de seguir ponta a ponta sem gate por épico.)

---

## 3. Decisões fechadas pelo designer (22/11) — D23–D32

| # | Decisão | Materialização |
|---|---|---|
| D23 | Tutorial de **4 fases** (Contrato → Sincronia → Obstáculos → Densidade); P3+ sai da cadeia | `src/level/index.ts`; P3+ fica como referência E19 do pico 4 trens |
| D24 | Apresentação de conceitos novos = **wingdings puro** (pulso D6, zero texto) | `selectorHint` no P1 + pulso no botão do seletor após o 1º Y |
| D25 | Seletor na **fileira inferior, junto de «Passar turno»** | botão-ferramenta com seta circular ↻/↺, sempre visível |
| D26 | Modo **persistente**, não gasta ação; **ABAB ortogonal** ao sentido | `Action.tap.turn` capturado no enqueue; o «girar» do Y usa o sentido ativo |
| D27 | Bônus por trem = **tabela n×(n−1)** {1:+0, 2:+2, 3:+6, 4:+12}, legível na vitória | `bonusPerTrainTable: [0,0,2,6,12]` — índice = trens entregues; painel de vitória |
| D28 | **Resgate**: 1/run, ~8 moedas, último trem perdido, **não devolve vida**, oferecido no não-vencível | `Game.rescue`, prompt «Resgatar · 8 vs Desistir», `tutorial?` no dado |
| D29 | **Time-travel**: preço fixo ~4 por uso, 1 passo integral por compra | pilha de snapshots em `Game`, `undoStep()`, botão «⟲ 4» só em fase não-tutorial |
| D30 | Selo de perfeição = **estrela dourada** (forma + cor) | `drawSealStar` compartilhado entre lista e painel de vitória |
| D31 | Farm entre sessões **aceito e observado**; selo não é farmável | `addSeal` é set; carteira bancada a cada vitória |
| D32 | **Nenhuma fase com perda forçada**; toda fase 100% viável | verificadas soluções segura e perfeita em todas as 16 fases |

**Decisões de processo do designer (não são D):**
- «Vamos com os recomendados; depois de testar vemos se ajustamos ou mudamos» — todos os 10 cards da pergunta única seguiram as recomendações (marcadas `primary`).
- «Implemente tudo sem minha aprovação; termino o plano e só depois eu testo» — o gate M8 foi adiado para o teste final; **não há mais gates intermediários**.

---

## 4. O que foi construído — épicos e interfaces

| Épico | Frente | O que mudou na interface (importante para não quebrar ao continuar) |
|---|---|---|
| M1 | core + input + HUD | `Action.tap.turn?: 'cw'\|'ccw'` (default cw, retrocompatível); `rotatePiece(piece, turn)`; ABAB do Y usa o turn; `__trailsDebug.rotationDirection`; varredura de giro −90° no CCW |
| M2 | persistência + lista | `StorageService` com backend injetável (`src/save/storage.ts`), schema v1, `?resetSave=1`; `screenMode: 'list'\|'game'`; save = `{unlockedIndex, seals[], wallet}`; `nextUnlockedIndex`/`recommendedPhaseIndex`; `phaseListRects`; boot abre a lista; vitória persiste o unlock na hora |
| M3 | economia da vitória | `victoryBanking`, `sealCondition`, `addSeal`, `bonusForDelivered` (`economy.ts`); `consumableUsed` por run (bloqueia selo); `recordVictory` banca moedas+bônus, persiste wallet+seals+unlock **juntos**; painel de vitória; header mostra a carteira (o contador por run morreu) |
| M4 | resgate | `Game.rescue(trainId)` (só em `deadEnd`, trem → `waiting` no entry original, vida não volta, sem passo); `LevelLayout.tutorial?` (P0–P3 true); prompt de dois botões (`rescueButton`/`surrenderButton`); `spendFromWallet` |
| M5 | time-travel | pilha de `GameState` no `Game`; `undoStep()` recusa em passo 0/`won`/`lost`, permite `deadEnd`; `reset` limpa a pilha; compra cancela animação/buffer/fx e persiste a dedução **depois** da reversão confirmada; `timeTravelButton` + `timeTravelVisible` |
| M6 | tutorial | `LevelLayout.selectorHint?` (P1); pulso do seletor após 1º Y até 1º uso; P1 tem um contragiro obrigatório na solução; P2 perdeu a moeda 6ª inalcançável (oeste 5/5 = selo); P3 redesenhado (`P3_DENSITY`, id `p3-densidade-tutorial`) com rota segura vs perfeita; `P3_LEVEL` congelado para o `p3-overload` |
| M7 | faixa 1 | `src/level/real/r1–r4.ts`, 3 trens/3 vidas, `tutorial:false`; curva com vale; r3 tem colisão dupla real → `deadEnd` com 1 vida (o resgate enfim alcançável) |
| M9 | faixas 2–3 | `src/level/real/r5–r12.ts`; faixa 2 com duas disputas entrelaçadas e moedas no risco; r11 = pico com **4 trens** (Q7); r12 = vale calmo; **PHASES = 16** |

**Mapa mental do código:**
- `src/core/*` — regra pura, sem DOM; único autor de movimento/vitória/derrota.
- `src/save/*` — persistência e matemática da economia (funções puras testáveis).
- `src/render/*` — canvas 2D: `layout.ts` (todos os rects de hit-test), `hud.ts`, `phasesList.ts`, `victoryPanel.ts`, `seal.ts`, `scene.ts`.
- `src/input/pointer.ts` — traduz pointer events em `Action` ou comandos de ferramenta (selector/list/rescue/TT).
- `src/main.ts` — shell: `screenMode`, `saveState`, flags de run (`consumableUsed`, `rescuesUsed`, `undosUsed`), animação/buffer, e o hook de QA.
- `src/config/tuning.ts` — **todos os números ajustáveis** (ver §7).
- `src/level/index.ts` — a cadeia de 16; incluir fase nova é só adicionar o layout.

---

## 5. Como validar na prática (instrumento pronto)

```bash
npm run typecheck
npm test              # 408 testes
npm run build
python3 -m http.server 4173 --directory dist &
# Chromium headless com CDP na porta 9223; scripts descartáveis em /tmp/opencode
```

O hook **`window.__trailsDebug`** (somente leitura) expõe: `state`, `predictions`, `layout`, `phaseIndex`, `phaseCount`, `levelId`, `hasNextPhase`, `bufferSize`, `animating`, `pendingStepAt`, `firstHint`, `coinTickAt`, `stepStartedAt`, `stepEndsAt`, `rotationDirection`, `screenMode`, `save`, `wallet`, `unlockedIndex`, `recommendedIndex`, `phaseListRects`, `seals`, `consumableUsed`, `lastVictoryBanking`, `rescuesUsed`, `rescueAvailable`, `rescuePrice`, `lastDerailedId`, `tutorialPhase`, `canUndo`, `historyDepth`, `timeTravelPrice`, `undosUsed`, `selectorHintActive`.

**Harness CDP:** `/tmp/opencode/trails-harness.mjs` (Node 24, `fetch` + `WebSocket` globais, Chromium em `/usr/bin/chromium`). Flags em ordem: `--eval <js>` / `--eval-file <arquivo.mjs>` / `--shot nome.png` / `--reload` / `--goto <url>`. Lê o hook, imprime JSON, tira screenshot; `--reload` preserva `localStorage` na mesma sessão (teste de persistência). Roteiros salvos: `m{1,2,3,4,5,6,7,9}-*.mjs` + analisadores de pixel `m{1,2,3}-visual.mjs` (decodificam PNG com `node:zlib`). **Atenção: `/tmp/opencode` é descartável entre sessões — recrie o harness se não existir.** Armadilha já cometida: o regex `/tt/i` casa com `passButton` («Bu**tt**on») — use sempre `timeTravelButton`.

**Sequências de ouro já documentadas** (reproduzíveis por toques reais; ver relatórios dos épicos e os comentários dos arquivos de fase): P0 10 passos; P1 12 com contragiro; P2 oeste 5/5; P3 segura 12 / perfeita 16; r1 perfeita 20; r2 perfeita 13 com CCW; r3 colisão dupla: `tap (1,6)` + 12 passes → deadEnd 13, 1 vida; r5 perfeita 13; r11 segura 12 (4/4; bônus +12); r12 perfeita 13; r7 default 13 passes → deadEnd → resgate.

**Validação já executada e batida (resumo):** a) reversão integral do TT revive trens e vidas e restaura peças; b) resgate deduz da carteira persistida, não devolve vida e bloqueia selo; c) save/reload/`?resetSave=1`; d) estrela dourada desenhada nos cards com selo (análise de pixels); e) cadeia completa 16 fases e loja viva nas fases reais. Carteira de QA seguiu exatamente 20 → 31 → 42 → 49 → 41 (resgate) no M7 e 20 → 31 → 46 → 57 → 49 no M9.

---

## 6. Dívidas e pontos que o designer precisa julgar

1. **Variedade visual:** fases irmãs reutilizam geometria — r7 é remix da r3; famílias r5/r8/r11/r12 e r6/r9/r10. Rotas, janelas e nomes são distintos; o mapa é reconhecível.
2. **r7:** o default colide com aviso de **5 ações** (checklist pede ≥6). É anunciado no primeiro quadro e o conserto é o primeiro toque — não é emboscada, mas fora da letra.
3. **r11:** o 4º trem (laranja/diamante) é uma linha curta separada na borda esquerda — carga atencional do Q7, não congestionamento central (herança E19).
4. **Apresentação [PRES] marcadas no caminho:** pulso do seletor anima só o glifo (não a superfície); header mostra a carteira (não o contador por run); a Densidade ganhou hint D6 em (2,4), que a E19 não tinha; no P2 a rota leste coleta 2/5 (a moeda removida era do atalho leste).
5. **Save corrompido / storage bloqueado:** descarta com `console.warn` e cai para memória **sem pop-up visível** — o fallback visível da spec de publicação ficou para uma frente futura.

---

## 7. Onde ajustar sem tocar em regra (`src/config/tuning.ts`)

| Parâmetro | Default | Efeito |
|---|---|---|
| `bonusPerTrainTable` | `[0,0,2,6,12]` | índice = trens entregues (D27); 1→+0, 2→+2, 3→+6, 4→+12 |
| `rescuePrice` / `rescueLimitPerRun` | `8` / `1` | Resgate (D28) |
| `timeTravelPrice` | `4` | por uso, 1 passo (D29) |
| `selectorPulseMs` | `350` | pulso ao alternar CW/CCW |
| `stepDurationMs`, `rotationMs`, `yToggleMs`, `tunnelFadeMs` | `180`, `110`, `120`, `160` | feel do passo |
| `predictionVisibleSteps` | `6` | horizonte D21 |
| `saveKey` / schema v1 | `'trails-save'` | em `src/save/storage.ts` |

---

## 8. Próximos passos (o que fazer ao voltar)

1. **Receber o veredito do designer no celular** — pergunta central: «é xadrez agora?». Sinais de sucesso (proposta §7): querer rejogar por vontade própria; selo despertar ambição genuína; loja morder sem quebrar o desafio (margem, nunca vitória); mortes justas; failing vs. skipping por fase.
2. **Executar/consolidar sessões externas** com `docs/checklist-sessao-externa-p0-p2.md` (instrumento de calibração; nunca bloqueou o ciclo).
3. **Incorporar ajustes:** preços/tempos = uma linha no tuning; nível = editar o dado da fase (`src/level/*.ts`, `real/*.ts`) e atualizar soluções documentadas + testes dessa fase; qualquer apresentação [PRES] é local.
4. **Registrar decisões novas no GDD** com `[FECHADO]`/`[CONFIRMAR]`/`[A DEFINIR]` e numerá-las a partir de **D33**; documentação sempre em `docs/`; substituído vai para `docs/old/` (nunca apagar sem decisão explícita).
5. **Commit + push por mudança concluída** — o Pages reconstrói automaticamente.

### Fora de escopo do MVP2 (só se o designer pedir)

Gerador de fases + validador temporal · mundos temáticos · energia/ads (decisão de negócio, pós-MVP2) · áudio · paisagem · ranking · mais consumíveis · fases com perda forçada (D32) · direção de arte final. Spec de portais: `docs/spec-tecnica-publicacao.md`.

---

## 9. Regras de operação herdadas (para a nova sessão não reaprender)

- **Orquestrador verifica e valida — não implementa.** Código é dos subagentes (`opencode-go/deepseek-v4.1-flash#max`, um por frente). Validação do orquestrador: typecheck · testes · build · jogo aberto no browser via CDP com scripts descartáveis em `/tmp/opencode` e leitura de `window.__trailsDebug`.
- **Um épico por frente, commit + push ao fechar.** Revisar interfaces entre entregas antes de fechar.
- **Design é decisão do usuário** (com Hefesto); se algo não bastar para decidir, **pergunte** — nunca feche sozinho. Em conflito: **GDD vence; a proposta define escopo**.
- Usuário fala português; documentação e comentários de código em português. Não acessar pastas de outros projetos (ex.: Bricklike).
- Sessões externas com jogadores novos são **instrumento de calibração, nunca bloqueio**.

---

*Handoff v1.0 — escrito em 23/11/2026, logo após o commit `b16ae75`, com o ciclo MVP2 concluído e o jogo publicado, pronto para o teste do designer.*
