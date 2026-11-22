# Trails — Plano de Implementação MVP2 «Xadrez consigo mesmo»

| | |
|---|---|
| **Data** | 22/11/2026 |
| **Escopo** | `proposta-mvp2.md` v2 (APROVADA): seletor CW/CCW · economia com sink (save entre sessões, carteira, bônus por trem, selo de perfeição, loja com 2 consumíveis) · tutorial de 4 fases · 12 fases reais em 3 faixas (3 trens desde a faixa 1, pico 4 na faixa 3) · gate do designer após a faixa 1. Nada além — ver §8. |
| **Base** | GDD v1.4 (D1–D32) · protótipo P0–P3+ completo (commit `96fd6b3`; 238 testes; cadeia de 5 fases publicada) · `spec-tecnica-publicacao.md` §7 (save: uma abstração só, schema versionado, default seguro, reset explícito) |
| **Estado** | Decisões abertas da proposta fechadas pelo designer em 22/11 — D23–D32 (§7). Primeira leva de épicos liberada. |
| **Destino** | `docs/plano-implementacao-mvp2.md` |

> Regra de conflito herdada: **o GDD vence; a proposta define escopo**. Derrota barata permanece (restart 1 toque, gratuito — a tensão mora no passo); o valor do êxito vem por **aspiração**. O motor P0–P3+ não é reescrito: `PHASES` é dado puro, economia acopla no shell, core muda por adição.

---

## 0. O que o jogador vive

O jogo abre na **lista de fases** (o tutorial no topo). O tutorial tem **4 fases** (Contrato → Sincronia → Obstáculos → Densidade; D23) e termina com a **transição de tom**: um trade-off real — rota segura vs rota com moeda arriscada — o primeiro «xadrez». O contrato de saída (o jogador sai sabendo): toque = passo de todos os trens · previsão e horizonte (morte local anunciada, remota vira descoberta) · Y por ABAB e conexão · **seletor de sentido** (apresentado logo após o Y) · moedas opcionais · perda tolerada (vidas) · reiniciar é grátis.

O jogo real começa em **3 trens** (D20/D32): 12 fases em 3 faixas de 4, cada fase 100% viável, com recurso disputado em janelas diferentes — a gramática da fase-boa da proposta (checklist de 6 pontos, §2-M7). Vencer bem paga mais: **bônus n×(n−1)** por trem entregue na vitória, moedas acumulam na **carteira persistente**, e o **selo de perfeição** (todos os trens + todas as moedas, run sem consumíveis) marca a fase na lista. A **loja** vende margem, nunca solução: **Resgate de trem** (1/run) e **Time-travel** (1 passo por compra) — ambos bloqueiam o selo.

## 1. Base técnica — herança sem reescrita

- **Motor N-trens pronto** (Y/rio/ponte/túnel/cruzamento/montanha/moedas/vidas/lost; 238 testes). Toda mudança de core é adição.
- **`GameState` é snapshot imutável completo** (board + trens + vidas + moedas + passo + status): o Time-travel é restaurar o snapshot anterior à última ação — sem sistema novo de undo.
- **Buffer D4** já revalida ações no dreno; o seletor captura o sentido no enqueue.
- **`__trailsDebug`** (hook somente-leitura do build) cresce por épico: `rotationDirection` (M1), `save`/`wallet`/`phaseList` (M2+).
- **Save:** `StorageService` como única fronteira (spec §7 — o jogo nunca chama `localStorage` direto); adapter localStorage no Pages, schema versionado, default seguro (sem save = do zero; corrompido = descarta e avisa), reset explícito de QA (`?resetSave=1`).
- **Tuning é dado** (`src/config/tuning.ts`): preços, bônus e tempos vivem lá; a régua é fechada (§7), os valores são ajustáveis.

## 2. Épicos M1–M9 (ordem da proposta §5; um subagente por frente)

### M1 — E4 · Seletor CW/CCW · core+input+HUD
- **Destravador:** destrava o level design (contragiro vira lance); primeiro da fila.
- **Conteúdo:** `tap` ganha `turn` (`'cw'|'ccw'`, default cw — retrocompatível); giro e «girar» do ABAB do Y usam o `turn` da ação (D26: ABAB decide *qual* ação, seletor decide *o sentido*); buffer captura o sentido no enqueue (D4); botão-ferramenta compacto na fileira inferior entre «Recomeçar» e «Passar turno» (D25), glifo de seta circular grande (↻/↺), pulso breve ao alternar, **não gasta ação** (modo persistente, sobrevive a reset/troca de fase); animação de giro varre **−90°** no CCW (nunca 270° CW fake); `__trailsDebug.rotationDirection`.
- **Pronto quando:** testes cobrem CCW em reta/curva/Y, ABAB com ccw, sentido capturado no buffer (rajadas misturadas), toques nulos/bloqueados sem passo, Y com toggle inalterado pelo seletor; os 238 existentes verdes; no browser (CDP + hook): alternar não avança passo, o giro segue o sentido ativo, o estado persiste após reset e entre fases; fim de run mantém o botão único de largura total.

### M2 — E3.1 · Save entre sessões + lista de fases · shell
- **Conteúdo:** `StorageService` (adapter localStorage, schema versionado `trails-save-v1`, default seguro, `?resetSave=1`); persistem **fases desbloqueadas + selos por fase + carteira**; **lista de fases** como home do jogo (tutorial no topo; cadeado p/ bloqueada; selo visível; toque joga); vitória desbloqueia a sucessora; boot abre a lista; reset de run NÃO toca no save (derrota barata entre tentativas ≠ save entre sessões).
- **Pronto quando:** reload preserva progresso/selos/carteira (verificado no browser); save corrompido não trava o boot; `?resetSave=1` limpa; os 238 + novos verdes; **o designer rejoga do ponto onde parou no celular**.

### M3 — E3.2 · Vitória econômica: bônus + selo · core+shell
- **Conteúdo:** bônus por trem entregue em **tabela n×(n−1)** {+0/+2/+6/+12} (D27, tuning), coletadas contam 1 cada; **tela de vitória legível**: «+6 — 3/3 trens entregues» + total bancado na carteira; **selo de perfeição** — todos os trens entregues + todas as moedas + run sem consumíveis; estrela dourada (D30) na saída e na lista; **banco só na vitória** (derrota/desistência descarta a run — derrota barata intacta); derrota/desistência não persiste moedas; wallet no HUD (header).
- **Pronto quando:** vitória 3/3 com todas as moedas e sem consumíveis → selo na lista; vitória com perda → sem selo, bônus menor legível; restart não banca nada; testes de fórmula/tabela; regressão dos 238+M1/M2.

### M4 — E3.3 · Loja: Resgate de trem · core+shell
- **Conteúdo:** na detecção de **não-vencível** (deadEnd, trens perdidos + entregas pendentes), o prompt oferece «**Resgatar** (~8 moedas) vs **Desistir** (grátis)» (D28); o resgatado é o **último trem perdido**, volta `waiting` ao ponto de espera e **entra no próximo passo** (idêntico à partida — sem exceção nova de regra); **não devolve a vida perdida**; **1 por run**; custa moedas da carteira; **bloqueia o selo da run**; indisponível no tutorial; sem moedas suficientes → só desistir.
- **Pronto quando:** resgate devolve o trem e a run segue vencível; regras de colisão/entrada valem sem exceção nova (testes core); selo bloqueado; prompt nunca aparece no tutorial; `lost` (vidas zeradas) não oferece resgate (a vida não volta).

### M5 — E3.4 · Loja: Time-travel · core+shell — **o risco técnico do MVP2**
- **Conteúdo:** reverte **integralmente** o último passo — restaura o `GameState` anterior à última ação (posições, peças, moedas da run, mortes, vidas, entregas, status); preço **fixo ~4 por uso** (D29; cada compra = 1 passo; run inteira fica proibitiva por acumulação); botão na fileira inferior, opaco/indisponível quando não aplicável; **indisponível** no tutorial, passo 0, após vitória/derrota e sem moedas; **bloqueia o selo da run**; cancela animação em curso e limpa o buffer ao reverter (nada de ação órfã).
- **Pronto quando:** reverte morte E vida E coleta E giro simultaneamente (o snapshot é exato — testes com passo composto); o buffer não vaza ações pré-reversão; o hook expõe `step` pré/pós; regressão total verde.

### M6 — E1 · Tutorial reorganizado · level data
- **Conteúdo:** cadeia tutorial **4 fases** (D23): Contrato → Sincronia → Obstáculos → **Densidade** (redesenhada como fechamento: túnel+cruzamento ensinados + **transição de tom** — a escolha segura vs moeda arriscada, dois andares de sucesso explícitos); P3+ sai da cadeia (vira base da faixa 3); **seletor apresentado na Sincronia, logo após o Y** (D24: pulso D6 no botão-ferramenta + momento em que o contragiro é o lance óbvio — zero texto); contratos de saída §0 atendidos um a um.
- **Pronto quando:** walkthrough documenta cada contrato ensinado e onde; 4/4 vencível com folga; contragiro exigível na Densidade sem frustração; o designer atravessa no celular sem texto de ajuda.

### M7 — E2a · Faixa 1 do jogo real · level design — **o trabalho central começa**
- **Conteúdo:** 4 fases de 3 trens (`level/real/`), **toda 100% viável** (D32); aquecimento pelo **layout** — recurso disputado em janelas diferentes, janelas generosas, contragiro como lance; fase 1 = a mais suave do jogo real; curva com vale interno (fácil → sobe → pico na 3ª → vale na 4ª); validação por fase contra o **checklist de 6 pontos** (recurso disputado · janela legível · dois andares de sucesso · uma ideia dominante · morte com antecedência ≥6 · espaço para experimentar).
- **Pronto quando:** cada fase tem nome-de-ideia numa linha, solução documentada (12–20 passos), solução perfeita (todos+moedas) visivelmente mais difícil, walkthrough + testes de solvabilidade/viabilidade; `lost` alcançável sem provável; **o designer quer rejogar**.

### M8 — GATE do designer
- «**É xadrez agora?**» — o designer joga a faixa 1 no celular e dá o veredito. Ajustes de level/curva/economia incorporados **antes** de produzir as faixas 2–3. Playtests externos (failing vs. skipping) afinam; não bloqueiam.

### M9 — E2b · Faixas 2–3 + calibração · level design
- **Conteúdo:** faixa 2 (5–8, 3 trens): duas disputas entrelaçadas, túnel/cruzamento em rota, moedas em zona de risco (lição Pipe Mania), escolha salvar-vs-moeda com custo real; faixa 3 (9–12, 3–4 trens): janelas apertadas, combinação total, **pico de 4 trens** (herança do P3+); calibração por failing/skipping (instrumento `checklist-sessao-externa-p0-p2.md` e §9 do plano-protótipo).
- **Pronto quando:** 12 fases no total, curva com vales, checklist de 6 pontos por fase, Q7 confirmado na faixa 3; veredito final do designer + sinais de economia (loja usada sem arrependimento, consumível compra margem).

## 3. Subagentes

Mesma regra de sempre: **um subagente por frente** (`opencode-go/deepseek-v4.1-flash#max`, reasoning MAX); o orquestrador valida na prática por épico (typecheck · testes · build · jogo no browser via CDP, scripts descartáveis em `/tmp/opencode`, hook `__trailsDebug`) e fecha com **commit + push** — o Pages reflete sempre o último estado jogável; o designer testa no celular entre épicos e o feedback vira ajuste antes do próximo disparo.

| SA | Frente | Épico | Depende de |
|---|---|---|---|
| SA-M1 | core+input+HUD (seletor) | M1 | D23–D32 registradas |
| SA-M2 | persistência + lista de fases | M2 | M1 |
| SA-M3 | economia da vitória (bônus/selo) | M3 | M2 |
| SA-M4 | loja: resgate | M4 | M3 |
| SA-M5 | loja: time-travel | M5 | M3 (idealmente após M4) |
| SA-M6 | tutorial (dados + apresentação) | M6 | M1–M5 |
| SA-M7 | level design faixa 1 | M7 | M6 |
| — | **gate do designer** | M8 | M7 |
| SA-M9 | level design faixas 2–3 + calibração | M9 | M8 |

## 4. Riscos

| # | Risco | Ataque |
|---|---|---|
| 1 | **Time-travel** (nomeado pela proposta): reversão integral vira bug farm | `GameState` é snapshot imutável — restaurar é trocar referência; spec explícita de buffer/animação no M5; testes com passo composto (morte+coleta+giro no mesmo passo). |
| 2 | Lista de fases vira "menu burro" que atrasa o jogo | Home minimalista: lista = cadeado/selo/toque-joga; boot direto quando há progresso; feedback do designer no épico. |
| 3 | Economia infla (farm persistente, bônus generoso) | D31: aceitar e **observar**; selo não é farmável; tabela fechada D27; preços são tuning. |
| 4 | 12 fases 100% viáveis + 3 trens = o braço de ferro demora | Checklist de 6 pontos como critério de pronto por fase; faixa 1 primeiro (gate antes de investir nas 2–3); o E19 provou 3 trens legíveis por construção. |
| 5 | Seletor "esquecido" (modo errado ativo) gera erro de ação | Seta grande sempre visível (D25/D26); apresentação D6 na Sincronia (M6); vigilância no playtest (mesma família do ABAB/Q3). |
| 6 | Save no Pages/iframe | `StorageService` abstraído (spec §7); corrompido → default seguro com aviso; testado com reload real no browser. |

## 5. Tuning — adições (dados; a régua é fechada em §7)

| Parâmetro | Default | Efeito |
|---|---|---|
| `bonusPerTrainTable` | `[0, 2, 6, 12]` | Bônus por trem entregue (D27, índice = trens entregues) |
| `rescuePrice` / `rescueLimitPerRun` | `8` / `1` | Resgate de trem (D28) |
| `timeTravelPrice` | `4` | Por uso; 1 passo por compra (D29) |
| `selectorPulseMs` | ~350 | Pulso ao alternar o sentido |
| `saveKey` / `saveSchemaVersion` | `'trails-save'` / `1` | Persistência (spec §7) |

## 6. Instrumento de validação por épico (o orquestrador confere)

1. `npm run typecheck` · `npm test` (238 + novos, sem enfraquecer asserção) · `npm run build`.
2. Jogo aberto no browser via CDP (build servido local, scripts descritáveis em `/tmp/opencode`) lendo `window.__trailsDebug` — comportamento por épico conferido no jogo real, não só em teste.
3. Interfaces entre entregas revistas antes de fechar o épico; commit + push; **Pages sempre jogável**.

## 7. Decisões D23–D32 — APROVADAS pelo designer em 22/11/2026

- **D23:** tutorial comprimido para **4 fases** (P3+ sai; transição de tom na última).
- **D24:** apresentação de conceitos novos = **wingdings puro** (padrão D6, zero texto).
- **D25:** seletor na **fileira inferior, junto de «Passar turno»**; seta circular grande.
- **D26:** seletor **modo persistente** (não gasta ação) + **ABAB ortogonal** (o «girar» usa o sentido ativo).
- **D27:** bônus por trem em **tabela fixa n×(n−1)** — +0/+2/+6/+12, legível na vitória.
- **D28:** Resgate — **1 por run, ~8 moedas, alvo = último trem perdido** (não devolve vida; alternativa à desistência).
- **D29:** Time-travel — **preço fixo ~4 por uso** (1 passo integral por compra).
- **D30:** selo de perfeição = **estrela dourada** (forma + cor, nunca cor sozinha).
- **D31:** farm entre sessões **aceito no MVP2** — observar nos dados; mitigação por recorde só se doer.
- **D32:** fases com perda forçada **NÃO no MVP2** — toda fase 100% viável.

*(D22/D20 e as diretrizes estruturais da proposta — volume 12+4, curva com vales, checklist de fase-boa, gate após a faixa 1 — seguem [FECHADO]/ratificadas pela aprovação da proposta v2.)*

## 8. Fora de escopo (imutável)

Gerador de fases · mundos temáticos · **sistema de energia/ads** (anotada — decisão de negócio, pós-MVP2) · áudio · paisagem · ranking/leaderboards · mais consumíveis além dos dois · **fases com perda forçada** (D32) · 5+ trens · direção de arte final (o feio-e-funcional segue até as fases provarem divertidas). **1 ação = 1 passo é o coração: nada mais move os trens.**
