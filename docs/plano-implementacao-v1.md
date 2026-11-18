# Trails — Plano de Implementação v1 — Protótipo P0 «Contrato»

| | |
|---|---|
| **Data** | 18/11/2026 |
| **Escopo** | P0 «Contrato» (brief completo em `plano-prototipo.md` §8). Nada além disso — ver seção 8. |
| **Base** | GDD v1.2 (`gdd-trails.md`) §3 inteiro, incluindo tabela §3.10 · `plano-prototipo.md` §5/§8/§9 · `spec-tecnica-publicacao.md` (requisitos de build adotados onde baratos) |
| **Estado** | Ambiguidades de design resolvidas pelo designer em 18/11/2026 — decisões D1–D6 na seção 7. E4 desbloqueado; plano pronto para execução (aguardando início da sessão orquestradora). |
| **Destino** | Vive em `docs/plano-implementacao-v1.md` — promovido do diretório de planos em 18/11/2026. |

> Regra de conflito herdada: em conflito, o GDD vence sobre este plano; o plano-prototipo define escopo e ordem. Nenhuma pendência `[A DEFINIR]` do GDD é fechada aqui — as que bloqueiam a implementação viram pergunta numerada (seção 7).

---

## 0. O que é o P0 (contrato de leitura)

Uma única fase, 6×6, impossível de falhar: 1 locomotiva entra pela borda no **primeiro passo** (que é a primeira ação do jogador), o jogador gira retas e curvas por toque (**1 ação = 1 passo**), a previsão pontilhada mostra sempre onde o trem para, botão «passar turno» avança o tempo sem mexer no tabuleiro, entrega acontece na estação da mesma **cor + forma**. Sem derrota, sem vidas, sem moedas, sem Y, sem segundo trem, sem rio, sem túnel, sem cruzamento, sem menu, sem áudio, sem save.

O que o P0 precisa provar (sinais de `plano-prototipo.md` §8): jogador entrega **sem explicação verbal** (Q1); o toque=passo gera tensão de decisão, não busywork (Q2 base); a parada anunciada pela previsão é sentida como justa (Q6). Sinal de sucesso: quer jogar **de novo** na hora.

---

## 1. Stack recomendada

**TypeScript + Vite + Canvas 2D (vanilla), Vitest para o core. Zero dependências de runtime.**

| Critério de design | Como a stack atende |
|---|---|
| Jogo 2D em grade | Grade regular 6×6 é geometria pura: um canvas, `cell = floor(x/size)`. Hit-test trivial, sem framework de UI. |
| Toque com alvo de 44 pt/célula | 6×44 = 264 pt ≤ largura útil de qualquer celular. Pointer Events unificados (mouse + toque), `touch-action: none`, sem scroll/zoom acidental. |
| Roda em desktop para playtest com caminho claro para mobile | `vite dev` com mouse no desktop; o mesmo build estático serve no GitHub Pages do repo (`Rigato/trails`) — o mesmo URL abre no celular do designer. Portrait-first: no desktop a grade centra numa faixa vertical; legível em DPR 1 (spec §5: portrait-first, desktop secundário). |
| Arte geométrica por código | Tudo desenhado por código no canvas: retas/curvas = traços, trem = retângulo arredondado + símbolo, estação = casa + símbolo, previsão = pontilhado animado. Zero assets, zero pipeline de arte. |
| Fase carrega jogável em segundos | Sem engine (~1 MB de Phaser) e sem assets: bundle estimado em dezenas de KB; cache frio via Pages < 3 s. |
| Retry instantâneo | Estado inicial é um dado (`level/p0.ts`) reaplicado em 1 toque, sem reload, sem loading. |
| Buffer de input / feel crítico (GDD §3.3) | O loop de animação e o buffer são 100% código próprio — controle total do ritmo, que é o que o P0 testa. |

**Alternativas consideradas e rejeitadas:**

- **Phaser 3** (stack do Bricklike, familiaridade real): para 1 tela de 36 células, ~1 MB de engine não paga nada — o feel crítico (animação de passo + buffer durante animação) seria código próprio de qualquer forma. Custo de carga contraria o critério «segundos».
- **DOM/SVG por célula**: viável (36 células), mas interpolação suave do trem, pontilhado animado e feedbacks ficam mais simples num único `requestAnimationFrame` sobre canvas.
- **Godot/Unity web (WASM)**: boot lento, download inicial grande, threading restrita — contraria a spec (single-threaded, ~5 MB de primeiro load como benchmark) e o critério de carga.

**Requisitos da `spec-tecnica-publicacao.md` adotados já no P0** (baratos hoje, caros de retrotrocar): `index.html` na raiz do build, caminhos relativos (`base: './'` no Vite), **zero recursos externos**, single-threaded, sem aviso de WebGL, mouse + toque no mesmo build, DPR-aware e legível em DPR 1, safe-area, portrait-first com shell estreito aceito no desktop.

**O que deliberadamente NÃO entra no P0:** camada `PlatformService`, SDK de portal, storage/ads/lifecycle (nada usa: sem save, sem áudio, sem portais). O boot fica isolado em `main.ts` para a camada de plataforma nascer depois (pós-MVP) sem tocar no jogo. Sem `localStorage` (não há save).

---

## 2. Arquitetura do core — para P1–P3 entrarem como adição, não como reescrita

O GDD inteiro (§3, incluindo a tabela §3.10) é o estado final das regras. A arquitetura separa **regras puras** (sem DOM, determinísticas, testáveis) de **apresentação**, e o motor nasce com a forma geral que as regras já têm — não com a forma particular do P0.

```
src/
  core/            # puro, sem DOM, determinístico — todo o GDD §3 vive aqui
    types.ts       # contrato único: Direção, Célula, Peça{kind, rot}, Fixo, Trem, Ação, GameState
    movement.ts    # saída(piece, entrada) — tabela por tipo de peça
    step.ts        # resolve 1 passo na ordem do GDD §3.6
    prediction.ts  # caminho futuro por trem (§3.8)
    actions.ts     # giro, passar turno, toque nulo, célula ocupada (§3.2, §3.3)
    buffer.ts      # fila de ações durante a animação (§3.3)
    game.ts        # orquestra: setup(layout) → apply(action) → estado
  level/
    p0.ts          # a fase P0 como DADO puro (grade, entrada, estação) — editável sem tocar no motor
  render/          # canvas: board, pieces, train, predictionView, hud, fx
  input/
    pointer.ts     # Pointer Events → célula/botão; touch-action none
  config/
    tuning.ts      # TODOS os parâmetros ajustáveis (seção 6) num arquivo só
  main.ts          # boot + loop rAF
test/
  core/            # Vitest: regras, passo, previsão, buffer, §3.10
```

**Princípios que garantem os próximos nós:**

1. **Motor multi-trem por nascer da regra.** §3.6 diz «cada ação avança **todas** as locomotivas, simultaneamente» — o motor é N-trens de fábrica; o layout do P0 simplesmente usa 1. P1 adiciona o segundo trem **no dado do layout**, não no código.
2. **Resolução na ordem exata de §3.6** (entregas → coleta → colisões/descarrilamentos), com slot de coleta vazio no P0: P2 (moedas) preenche o slot sem mexer em `step.ts`.
3. **`step.ts` resolve por compute-then-resolve:** primeiro calcula o movimento de todos os trens, depois resolve destinos. A tabela §3.10 inteira cai como consequência (célula deixada no mesmo passo é livre; troca de células = colisão; entrega resolve antes da ocupação). No P0, os casos que exigem 2 trens já são **testes unitários do core** (o teste fabrica 2 trens; a UI não).
4. **`movement.ts` é uma tabela** `saída(tipo de peça, orientação, direção de entrada) → direção de saída | bloqueio`. Y (P1), cruzamento (P3) e túnel (P3) entram como novos cases na mesma tabela — o motor de passo não muda.
5. **`prediction.ts` já é por trem e ignora os outros** (§3.8: caminhos independentes; colisão é a única incerteza). P1 ganha N previsões de graça. Detecção de parada inclui o caso **loop** (revisitar célula+vindo-de = ciclo), que o GDD §3.8 não cobre — exibição conforme decisão D2 (seção 7).
6. **Elementos fixos** (estação, entrada) são tipos de célula em dados; rio, montanha e ponte (P2/P3) entram como novos tipos + um case no render — sem tocar no motor.
7. **Layout é dado.** P1–P3 = novos arquivos em `level/`, zero mudança de motor. Isso também deixa o designer iterar o layout tutorial sem código.

**Mapa de extensão:**

| Nó | Adiciona | Onde entra no core do P0 | Mudança de motor esperada |
|---|---|---|---|
| P1 — Sincronia | peça Y + 2º trem | novo case em `movement.ts`; trens a mais no dado do layout; colisão e §3.10 já implementados/testados | ~zero |
| P2 — Obstáculos | rio + ponte (+ moedas) | novos tipos de fixo em dados + render; slot de coleta em `step.ts` (já existe, vazio) | pequena |
| P3 — Densidade | túnel + cruzamento (+3º/4º trem) | túnel = par de células ligadas (case em `step.ts`/`movement.ts`); cruzamento = case de peça sem ação | pequena |

---

## 3. Épicos (E0–E5) com critério de pronto verificável

Estimativas em «sessões» (ritmo do projeto: ~7 h/semana em sessões curtas). E1 e E2 rodam em paralelo após a entrega do contrato de tipos.

### E0 — Fundação e trilha de publicação · 0,5 sessão · SA4
Repo já existe (`main` → `Rigato/trails`); falta a trilha Pages.
- **Conteúdo:** projeto Vite + TS; `base: './'`; workflow GitHub Actions (push em `main` → build → deploy Pages); `npm run dev` no desktop; canvas vazio centrado.
- **Pronto quando:** (1) URL do Pages abre no celular em < 3 s em cache frio; (2) console limpo, `index.html` na raiz do `dist/`, caminhos relativos; (3) qualquer push em `main` vira build publicado automaticamente (o Pages sempre reflete o último estado jogável — regra do projeto).

### E1 — Core de regras puro · 1,5 sessão · SA1
- **Entrega destravadora (primeira hora):** `core/types.ts` — o contrato de tipos que permite SA2 (render/input) rodar em paralelo.
- **Conteúdo:** grade/peças/trem em dados; `movement`, `step` (ordem §3.6, compute-then-resolve, N-trens), `prediction` (parada + loop), `actions` (giro/passar/nulo/bloqueio), `buffer`, `game`; layout P0 **rascunho** em `level/p0.ts`; Vitest.
- **Pronto quando (todos como testes automatizados):**
  1. **1 ação válida = exatamente 1 passo**: `apply(girar peça livre)` e `apply(passar turno)` movem o trem 1 célula; `apply(toque nulo)` (vazio, estação, célula do trem) **não** move.
  2. O trem entra pela entrada marcada **apenas no primeiro passo**; antes disso está fora da grade (§3.5), e a previsão pré-primeiro-passo parte da célula de entrada.
  3. Reta e curva: 4 orientações, giro 90° CW; **giro em célula ocupada pelo trem é bloqueado** e não avança passo (§3.2).
  4. **Previsão**: após qualquer giro ou passo, o caminho recalcula e termina no primeiro ponto de parada (estação / borda / célula sem saída); loop detectável.
  5. **Buffer**: FIFO; ações enfileiradas aplicam em ordem, cada uma com seu passo; ação enfileirada que virou inválida (célula ocupada) não executa e não avança — decisão D4.
  6. Resolução simultânea: testes de §3.10 que não dependem de peças futuras (célula deixada no mesmo passo é livre; troca de células = colisão; entrega resolve antes) — com 2 trens fabricados no teste.
  7. Entrega: trem na estação da cor certa sai do tabuleiro e emite o evento de vitória.

### E2 — Render e input (jogável sem animação) · 1 sessão · SA2 — paralelo a E1 após `types.ts`
- **Conteúdo:** canvas full-viewport DPR-aware; grade 6×6; peças desenhadas por código; trem e estação com **cor + forma redundantes** (acessibilidade, GDD §5); entrada marcada na borda; botões «passar turno» e «recomeçar» ≥ 44 pt; Pointer Events + `touch-action: none` + meta viewport + safe-area.
- **Pronto quando:**
  1. A fase inteira joga ponta a ponta em **passos instantâneos**: tocar peça gira 90° CW e o passo avança; «passar turno» avança; tocar vazio/estação/célula do trem não faz nada.
  2. Célula ≥ 44 pt CSS em viewport 390×844; no desktop a grade centra maior.
  3. Cor + forma presentes no par trem/estação desde a primeira build.
  4. Sem scroll/zoom acidental, sem seleção de texto; mouse e toque funcionam no mesmo build.

### E3 — Feel: animação, buffer, feedbacks · 1,5 sessão · SA3 — o coração do Q2
- **Conteúdo:** loop rAF; animação de passo célula-a-célula (curta, parametrizada); buffer ativo **durante** a animação; previsão pontilhada animada; feedbacks: giro, passo, entrega com pulse + botão «jogar de novo» (D5), saída do trem descarrilado com recomeço em 1 toque (D1), flash discreto em toque nulo/giro bloqueado (D3).
- **Pronto quando:**
  1. **Toques durante a animação não são descartados** (§3.3): 3 toques rápidos → 3 ações → 3 passos, na ordem.
  2. **O trem avança 1 célula por ação válida e a previsão atualiza corretamente após cada passo.**
  3. Animação de passo default 180 ms, ajustável **só** pelo `config/tuning.ts`; passos encadeados do buffer sem espera extra.
  4. 60 fps em desktop e celular comum (6×6 não tem desculpa para jank).
  5. **Recomeçar é instantâneo:** 1 toque restaura o estado inicial, sem loading.
  6. Feedbacks conforme D1/D3/D5: toque nulo e giro bloqueado → flash discreto; entrega → pulse + «jogar de novo»; descarrilamento → trem sai, sem custo, recomeço à mão.

### E4 — A fase «Contrato» · 1 sessão · SA4 — decisões D1–D6 embutidas
- **Conteúdo:** layout tutorial definitivo (6×6, 1 trem, 1 estação, 1 entrada) em dados; descarrilamento sem custo com recomeço em 1 toque (D1); pós-entrega com pulse + «jogar de novo» (D5); primeiro frame com destaque sutil na peça do primeiro giro (D6); Pages publicado.
- **Pronto quando:**
  1. Sessão de playtest executável: jogador novo entrega **sem explicação verbal** e o checklist de sessão do `plano-prototipo.md` §9 (think-aloud, failing vs. skipping, perguntas pós) roda sem atrito técnico.
  2. **Wingdings test**: o estado do tabuleiro (trem, estação, previsão, para-onde-vai) é legível sem texto nenhum.
  3. Fase carrega jogável em < 3 s (cache frio, celular, via Pages).
  4. Ausência de derrota **não é tratada como bug** — é o design (D1: impossível de falhar = a falha não existe como estado/custo).

### E5 — Auditoria de regras + tuning + matriz mínima · 0,5–1 sessão · SA5
- **Conteúdo:** auditoria linha-a-linha do GDD §3.1–§3.10 aplicável ao P0; `config/tuning.ts` completo com os defaults da seção 6; matriz mínima: Chrome desktop, Safari iOS, Chrome Android, DPR 1, shell estreito 907×510; revisão de escopo (flag de scope creep).
- **Pronto quando:**
  1. Checklist de auditoria sem divergências entre código e GDD (ou divergências documentadas com justificativa e registradas para o GDD).
  2. Qualquer parâmetro da seção 6 muda o jogo editando um arquivo, sem recompilar lógica.
  3. Nada da lista «fora de escopo» (seção 8) presente no build.

**Total estimado: ~6–7 sessões** (≈ 1,5–2 semanas no ritmo do projeto; E1∥E2 comprime o calendário).

---

## 4. Subagentes

Modelo dos subagentes (regra do `AGENTS.md`): `opencode-go/deepseek-v4.1-flash#max`, salvo indicação explícita em contrário.

**Orquestração:** a sessão orquestradora (GLM 5.3 #max) **não implementa** — dispara, valida e integra as entregas; a execução é 100% dos subagentes.

| SA | Nome | Responsabilidade (épicos) | Insumos (seções exatas) | Saídas esperadas | Depende de |
|---|---|---|---|---|---|
| **SA1** | `core-rules` | Motor puro + testes (E1) | GDD §3 completo (§3.1–§3.10, com a tabela de borda); brief P0 em `plano-prototipo.md` §8; decisões D1–D4 (seção 7) | `src/core/*` + `test/core/*` verdes + `types.ts` entregue cedo (destrava SA2) | E0 |
| **SA2** | `board-render` | Canvas + input + HUD (E2) | GDD §3.1–§3.2 (células e peças), §5 (minimalismo geométrico + acessibilidade cor/forma); `spec-tecnica-publicacao.md` §3 (requisitos universais) e §5 (portrait-first, legibilidade DPR 1); critério de 44 pt | `src/render/*`, `src/input/*` — fase jogável em passos instantâneos | `types.ts` do SA1 (depois disso, paralelo a E1) |
| **SA3** | `feel-engine` | Animação, buffer, feedbacks, ritmo (E3) | GDD §3.3 (ação=passo, buffer, passar turno), §3.8 (previsão), §3.9 (feel + feedbacks mínimos); decisões D1/D3/D4/D5 | Loop rAF + buffer com testes + fx parametrizados | SA1, SA2 |
| **SA4** | `level-deploy` | Trilha Pages (E0) e a fase final (E4) | `plano-prototipo.md` §8-P0 (brief, sinais, fora-de-escopo) e §9 (instrumentos); GDD §3.4–§3.5 (fixos/entrada/partida), §3.7 (retry); decisões D1/D5/D6 | Trilha Pages no CI + `level/p0.ts` definitivo + build publicada jogável | E0: nenhum. E4: SA1–SA3 (D1–D6 já decididas) |
| **SA5** | `qa-audit` | Auditoria de regras, tuning, matriz (E5) | GDD §3 inteiro como checklist; `spec-tecnica-publicacao.md` §9–§10 (QA/empacotamento); seções 6 e 8 deste plano | Relatório de auditoria + tuning finalizado + matriz de teste executada + flag de escopo | SA4 |

**Orquestração:** E0 (SA4) e E1 (SA1) abrem juntos. A primeira entrega do SA1 é `types.ts` — o contrato que destrava SA2 em paralelo. SA3 entra quando E1+E2 fecham. E4 espera SA1–SA3 (decisões D1–D6 já tomadas, seção 7); E5 fecha o ciclo. O agente orquestrador revisa a interface entre as entregas (não só cada SA isolado).

---

## 5. Riscos técnicos e ordem de ataque

| # | Risco | Ordem de ataque |
|---|---|---|
| 1 | **Feel do clique** — «a animação entre toques É o jogo» (suspeita de unknown-unknown nº 1 do mapa de incerteza). Se errar, tudo vira irritação. | Atacar **cedo e de frente**: E3 é épico próprio, não polish de fim. Duração/easing/buffer são parâmetros, para o playtest calibrar na hora. Se o feel fracassar, as variantes de núcleo (`plano-prototipo.md` §5/P0: sem botão; passo a cada 2 ações; trem mais lento) são **decisão de design** do usuário — o plano não as pré-implementa. |
| 2 | **Divergência plano ↔ GDD** — as decisões D1–D6 foram tomadas pelo designer, mas o GDD ainda não as registra (D1 e D2 cobrem lacunas de regra: leitura de «impossível de falhar» e exibição do loop). | Implementar E4 contra as decisões da seção 7; levar D1 e D2 ao GDD via Hefesto (como [FECHADO]) na promoção deste plano, para a fonte de verdade não ficar atrás do código. |
| 3 | **Loop infinito na previsão** (4 curvas em quadrado; §3.8 fala em «primeiro ponto de parada» que pode não existir). | Resolvido no core (E1): detecção de ciclo por revisita (célula + direção de entrada). Exibição conforme decisão D2 (anel fechado + marcador); um cap de segurança parametrizado garante que a simulação nunca corre infinito. |
| 4 | **Precisão de toque/viewport no celular** (44 pt, DPR, safe-area, gestos do navegador roubando o toque). | Desde o E2: Pointer Events + `touch-action: none` + meta viewport + safe-area; verificação em hardware real no E5, via Pages no celular. |
| 5 | **Regressão silenciosa de «1 ação = 1 passo»** (o coração do jogo). | Teste unitário que conta passos por ação em todos os caminhos de input (giro, passar turno, nulo, buffer, ação invalidada) + auditoria do SA5 contra §3.3. |
| 6 | **Escopo creep** (o risco crônico de protótipo: «só faltam as moedinhas…»). | Lista imutável na seção 8; SA5 audita contra ela; cada item fora é desperdício por definição do brief. |
| 7 | **Carga inicial no celular.** | Zero deps de runtime, bundle de dezenas de KB, Pages serve estático; medição no critério de E4 (< 3 s cache frio). Risco baixo, monitorado. |
| 8 | **«Casos especiais de 1 trem»** — implementar o P0 como se 1 trem fosse o caso geral, forçando P1 a reescrever. | Motor N-trens por nascer da regra (§3.6 é multi-trem por definição); casos §3.10 testados no core com 2 trens já no P0. |

---

## 6. Tuning parametrizável (defaults meus; todos ajustáveis pelo designer sem tocar em lógica)

Todos em `config/tuning.ts`, um arquivo. Valores são **default de protótipo**, não decisão de design fechada.

| Parâmetro | Default | Efeito |
|---|---|---|
| `stepDurationMs` | 180 | Duração da animação de 1 passo — a duração É o ritmo do jogo (§3.3) |
| `stepEasing` | `easeOutQuad` | Curva da animação de passo |
| `rotationMs` | 110 | Duração do giro da peça |
| `rotationOvershoot` | 1.08 | Sobregiro leve ao parar (leitura de direção) |
| `bufferedStepGapMs` | 0 | Pausa extra entre passos drenados do buffer |
| `maxBufferedActions` | 12 | Teto do buffer (FIFO; rajadas absurdas descartam o excesso) |
| `predictionDashMs` | 1200 | Período da «marcha» dos pontinhos |
| `predictionSafetyCapSteps` | 24 | Teto de células simuladas antes de declarar loop (com D2: é só trava da simulação; a exibição desenha o anel) |
| `trainSizeRatio` | 0.60 | Corpo do trem relativo à célula |
| `trackWidthRatio` | 0.16 | Espessura do trilho relativa à célula |
| `stationInsetRatio` | 0.74 | Tamanho visual da estação |
| `symbolSizeRatio` | 0.28 | Tamanho do símbolo de forma (no trem e na estação) |
| `cellMinCssPt` | 44 | Alvo de toque mínimo por célula |
| `buttonMinCssPt` | 44 | Alvo dos botões (passar turno / recomeçar) |
| `boardMaxWidthRatio` | 0.92 | Folga da grade na viewport |
| `deliverPulseMs` / `deliverPulseScale` | 450 / 1.25 | Feedback de entrega (D5) |
| `derailExitMs` | 300 | Saída visual do trem descarrilado (D1) |
| `firstHintPulseMs` | 900 (loop contínuo até a 1ª ação) | Pulso na peça que pede o primeiro giro (D6) |
| `nullTouchFlash` / `blockedTouchFlash` | `cellFlash` / `cellFlash` | Flash discreto em toque nulo / giro bloqueado (D3) — desligável |
| `palette.*` | fundo `#f4f1ea`, trilho `#3a3f44`, par trem/estação `#d64545`, previsão = cor do trem a 55% | Paleta inteira num objeto (feio-e-funcional; legibilidade > beleza) |

---

## 7. Decisões de design — ambiguidades resolvidas pelo designer (18/11/2026)

As seis ambiguidades identificadas no planejamento foram respondidas pelo designer. Registro abaixo com a consequência técnica. **D1 e D2 cobrem lacunas de regra do GDD** (o documento-fonte ainda não as traz) — levá-las ao GDD via Hefesto, preferencialmente como [FECHADO] em §3.6/§3.8; D3–D6 são feedback/feel e cabem como notas em §3.9.

**D1. Descarrilamento no P0: regra do GDD intacta — «impossível de falhar» = a falha não existe como estado/custo.**
Se o único trem descarrilar (só possível ignorando a previsão, que avisa antes — Pilar 3), sai do tabuleiro; sem vidas, sem derrota; o jogo detecta «sem trem ativo + entrega pendente» (§3.7) e o recomeço é 1 toque. Nenhuma punição ou travamento existe.
→ Técnico: motor de fim-de-jogo + aviso + retry instantâneo; feedback de descarrilamento parametrizado (`derailExitMs`). (E1/E3/E4)

**D2. Loop infinito: a previsão desenha o anel fechado com marcador de loop.**
Sem estado especial de jogo; o trem em loop segue «ativo» (o aviso de não-vencível do §3.7 não dispara — cobre só «sem trem ativo»). O cap de simulação é trava interna, invisível ao jogador.
→ Técnico: `prediction.ts` detecta ciclo por revisita (célula + direção de entrada) e devolve o anel; render desenha o ciclo pontilhado com marcador. (E1/E2)

**D3. Toque sem ação (vazio, estação, célula do trem): flash discreto na célula.**
Parametrizado e desligável; confirma que o toque foi registrado sem ensinar por ruído.
→ Técnico: `nullTouchFlash`/`blockedTouchFlash` no tuning. (E3)

**D4. Ação enfileirada que virou inválida: descartada, sem passo.**
Fiel a §3.3 (giro bloqueado não é ação, o tempo não anda). Sem feedback extra de «ação perdida»; a enfileiração em si não tem feedback — a resposta aparece quando a ação se aplica (rajadas drenam em sequência rápida).
→ Técnico: o buffer revalida a ação no momento de aplicar. (E1)

**D5. Pós-entrega: pulse + botão «jogar de novo» bem visível.**
O caminho para rejogar é óbvio por design — o sinal de sucesso do P0 é o jogador querer jogar de novo na hora.
→ Técnico: `deliverPulseMs`/`deliverPulseScale` + botão de replay no HUD. (E3/E4)

**D6. Primeiro frame: mudo com destaque visual sutil na peça que pede o primeiro giro.**
Pulso contínuo e discreto até a primeira ação; ensina o contrato sem texto (wingdings test). A dose exata é ajustável pelo parâmetro.
→ Técnico: `firstHintPulseMs` no tuning. (E4)

---

## 8. Fora de escopo (imutável)

Construir **só** o P0. Cada item fora é desperdício:

Peça Y · 2+ trens · vidas · moedas/contador · rio/ponte · túnel · cruzamento · montanha · menus ou meta-progressão · áudio · arte além de formas geométricas legíveis · orientação paisagem · loja · gerador de fases · estrelas/ranking · sistema de save (e qualquer `localStorage`) · desfazer · camada de portais/SDK · fórmula de bônus · tutorial multi-tela.

Qualidade de protótipo: **feio e funcional; legibilidade > beleza.** Cada trem/estação: cor **E** forma/símbolo (requisito de acessibilidade, não enfeite). Feel crítico: animação curta; toques durante a animação vão para o buffer e **não** são descartados (§3.3); fase carrega em segundos; recomeço instantâneo. **A fase é impossível de falhar por design — não é bug a ausência de derrota. 1 ação = 1 passo é o coração do jogo: nada mais move os trens.**

---

## 9. Aceitação do P0 (como saber que está pronto para o playtest)

Derivado dos sinais de `plano-prototipo.md` §8-P0 e dos instrumentos §9:

**Técnicos (verificáveis sem jogador):**
- [ ] 1 ação = 1 passo auditado em todos os caminhos de input (giro, passar turno, nulo, buffer, ação invalidada) — teste automatizado.
- [ ] Toques durante a animação enfileiram e aplicam em ordem — teste manual de rajada.
- [ ] Previsão recalcula após cada giro e cada passo, sem piscar.
- [ ] Célula e botões ≥ 44 pt; cor+forma redundantes; sem scroll/zoom acidental.
- [ ] Fase carrega jogável em < 3 s (cache frio, celular, via Pages); recomeço em 1 toque.
- [ ] Console limpo; zero recursos externos; `index.html` na raiz do build.
- [ ] Nada da seção 8 presente no build.

**De leitura (sessão real com jogador — o instrumento é humano, o jogo só não pode atrapalhar):**
- [ ] Jogador novo entrega **sem explicação verbal** (Q1) — think-aloud roda limpo.
- [ ] Quer jogar **de novo** na hora (sinal de sucesso do P0).
- [ ] Descreve o jogo a alguém em uma frase correta («girar trilho faz o trem andar; leve-o até a estação»).
- [ ] Explica errado como o tempo funciona? → sinal de falha do contrato, voltar ao E3/E4, não «consertar» com texto.
- [ ] Checklist pós-sessão §9 aplicável (quer jogar de novo? entendeu o que aconteceu? o que foi mais tenso? o botão foi usado para planejar ou para assistir?).

---

## 10. Próximos passos

1. **Registrar D1 e D2 no GDD via Hefesto** (lacunas de regra: leitura de «impossível de falhar» e exibição do loop; sugestão: [FECHADO] em §3.6/§3.8); D3–D6 como notas de feedback em §3.9.
2. ~~Promover este plano para `docs/plano-implementacao-v1.md`.~~ **Feito em 18/11/2026.**
3. Iniciar a sessão orquestradora (GLM 5.3 #max — valida e integra, não implementa); os subagentes DS 4.1 flash #max executam os épicos E0–E5 conforme a seção 4.
4. Cada épico fecha com commit + push (o Pages reflete sempre o último estado jogável — regra do projeto).
