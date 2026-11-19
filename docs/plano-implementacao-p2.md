# Trails — Plano de Implementação P2 «Obstáculos»

| | |
|---|---|
| **Data** | 19/11/2026 |
| **Escopo** | P2 «Obstáculos» (brief em `plano-prototipo.md` §5/§8): **rio + ponte (uma por rio, fixa) + moedas como contador burro**. Nada além disso — ver §8. |
| **Base** | GDD v1.2 §3.4 (Rio/Ponte), §3.6 (ordem de resolução — o slot de coleta já existe vazio no `step.ts` desde o E1), §4 (faucets: moedas bônus sobre trilho; **fórmulas [A DEFINIR] ficam A DEFINIR**) · `plano-prototipo.md` §5-P2/§8-P2 (Q2 rota forçada, Q5 espera, posicionamento de moedas) · `plano-implementacao-v1.md` §2 (mapa: P2 = novos fixos em dados + render + slot de coleta — mudança de motor esperada: pequena) · P0 e P1 aprovados/validados |
| **Estado** | Ajustes pós-playtest do P1 em aplicação (entrada off-board D13, indicação do Y D12). **Aprovado pelo designer em 19/11/2026 — D14 decidida: manter rotação CW** (§7). |
| **Destino** | `docs/plano-implementacao-p2.md` |

> Regra de conflito herdada: o GDD vence; o plano-protótipo define escopo e ordem (P2 = + rio/ponte; moedas entram como **contador burro, sem fórmula** — §6 do plano-protótipo).

---

## 0. O que é o P2 (o que o jogador vive)

O chain cresce: tutorial → Sincronia → **«Obstáculos»**. No meio da fase, um **rio** — faixa de água inconfundível com qualquer trilho, que o trem não pode atravessar fora da **única ponte** (peça fixa perpendicular, sem ação do jogador). A rota ideal mora do outro lado: o jogador desvia, paga o custo de ação (1 giro = 1 passo dos trens) e administra a janela da ponte — **o primeiro elemento que PUNE em vez de apenas complicar**.

Sobre os trilhos, **moedas** brilham perto do risco: na ponte, nas junções disputadas, nos trechos apertados — rotear até elas é opcional e o desvio corajoso paga (lição Pipe Mania: o cruzamento é o bônus). No P2 elas são um **contador burro**: coleta ao passar, exibida no HUD, sem fórmula e sem sink — a leitura é só **posicionamento** (o jogador as quer? desvia por vontade própria?).

O que o P2 precisa provar: a **rota forçada com custo de ação é um problema a resolver, não uma punição arbitrária** (Q2); o que o jogador faz com a **espera de graça** quando ela importa (Q5 — «passar turno» vira planejamento legítimo ou droga que esvazia?); e o **posicionamento das moedas perto do risco** convida ao desvio. Sinais em `plano-prototipo.md` §8-P2: sucesso = o desvio obrigatório é sentido como puzzle; falha = rota única sem escolha — o rio vira corredor.

## 1. Base técnica — herdada, sem mudanças de stack

Motor N-trens, ordem §3.6 com **slot de coleta vazio pronto** (`StepOptions.collect`), previsão por trem, vidas por fase no dado, handoff `PHASES`, instrumento CDP com `__trailsDebug`. Requisitos da spec inalterados.

## 2. Mudanças no core

### 2.1 Rio e ponte (GDD §3.4)

- **Rio:** banda reta (horizontal ou vertical) de **células fixas** contíguas, definida no layout como dado. Trem que entra em célula de rio **sem ponte descarrila** — `DerailReason` ganha `'water'` (motivo próprio; a previsão mostra o trem parando na água com **marcador próprio**, distinto do `noExit`).
- **Ponte:** cada rio tem **exatamente uma** — célula fixa **perpendicular ao rio** (travessia), **sem ação do jogador** (não gira, não alterna); quem entra pela ponte atravessa na direção do eixo dela. Movimento: a ponte comporta um trem por vez (regra geral).
- **Modelagem:** `Fixed` ganha `River` (célula de água) e `Bridge` (célula de travessia com eixo horizontal/vertical); validação no setup: banda reta contígua, **uma ponte por rio**, ponte perpendicular e dentro da banda.
- **Previsão:** para na água com parada própria (`water`) — o aviso existe antes do passo, Pilar 3 intacto.

### 2.2 Moedas — contador burro (GDD §4, slot §3.6)

- **Overlay sobre células de trilho** (não são um tipo de célula): `LevelLayout.coins?: CellPos[]`; validação: cada moeda está sobre uma **peça de trilho**.
- **Coleta no slot existente:** na ordem §3.6 (entregas → **coleta** → colisões), o trem que passa por célula com moeda coleta — `GameEvent` ganha `coinCollected` (trem, célula); `GameState` ganha as moedas coletadas da run.
- **Contador burro:** HUD exibe o total coletado; **sem fórmula, sem bônus, sem sink** — as perguntas de fórmula do GDD §4 permanecem `[A DEFINIR]`. Derrota/desistência descarta (nada persiste mesmo); vitória «confirma» apenas cosmeticamente no P2.
- **`predictionSafetyCapSteps`** e o resto do core: intocados.

### 2.3 Vidas e o primeiro `lost` alcançável

O P1 registrou (plano §2.2): com 2 trens, 3 vidas nunca zeram. **O P2 pode usar 3 trens** (fora de escopo do P2 é 4; densidade MVP 2–3) — e com 3 trens, 3 eventos de perda tornam **`lost` alcançável pela primeira vez no conteúdo**. O estado existe, é testado desde o E6 e nunca foi visto em jogo: se a fase do P2 usar 3 trens, ela finalmente o exercita (decisão de design da fase — §3-E14).

## 3. Épicos E11–E15

Estimativas em sessões; E11 e E12 correm em paralelo após o contrato de tipos (padrão P0/P1).

### E11 — Core: rio/ponte + moedas · ~1 sessão · SA1
- **Destravador:** `types.ts` (River/Bridge em `Fixed`, `coins`, `coinCollected`, `DerailReason` += `'water'`, validação) — libera o SA2.
- Conteúdo: movement (ponte = passagem no eixo; rio = `water`); coleta no slot (`step.ts` — o slot já existe); previsão com parada `water`; testes: tabela ponte/rio nos 2 eixos, descarrilamento na água (eventos/vidas), coleta na ordem exata §3.6 (entregas → coleta → colisões — o teste do slot que o E1 esboçou), moeda coletada por trem que morre no mesmo passo (pergunta aberta do GDD §4: **no contador burro, conta** — documentado), validação de layout (banda reta, uma ponte, moeda sobre trilho).
- **Pronto quando (testes):** 1 ação = 1 passo com rio/ponte/moedas; ponte atravessa nos 2 sentidos do eixo; água descarrila com `water` + 1 vida; moeda coletada no slot, HUD conta; §3.6 ordem assertada; fases P0/P1 inalteradas.

### E12 — Render: rio, ponte, moedas · ~1 sessão · SA2 — paralelo após `types.ts`
- Rio inconfundível com trilho (faixa de água — cor própria na paleta; nada de cinza-trilho), ponte com linguagem de travessia (trilho perpendicular sobre a água), moeda como overlay brilhante sobre o trilho, **marcador de parada `water`** distinto (§3.4: «a previsão mostra o trem parando na água»), contador de moedas no HUD, `level/p2.ts` **rascunho** jogável.
- **Pronto quando:** o rio lê como água num relance em DPR 1 e 44 pt; a previsão distingue água de sem-saída; moedas visíveis e contadas; rascunho joga ponta a ponta.

### E13 — Feel do P2 · ~0,5 sessão · SA3
- Feedbacks: coleta (pulse curto na moeda/célula + tick no contador), descarrilamento na água (o ghost existente + variação «afunda»?), regressões de buffer com 3 trens e ponte (janela da ponte disputada).
- **Pronto quando:** rajadas com 3 trens na ordem; coleta visível em ~0 tempo; 60 fps; console limpo.

### E14 — Fase «Obstáculos» · ~1 sessão · SA4
- `level/p2.ts` definitivo + `test/level/p2.test.ts` + `PHASES` ganha a fase (handoff Sincronia→Obstáculos).
- **Requisitos da fase:** rio atravessando as rotas com **uma** ponte; **desvio com custo de ação real** (girar a rota para a ponte custa passos — o rio não pode ser corredor); **janela da ponte** disputável se 2 trens a usarem (o P1 ensinou sincronia; o P2 cobra na ponte); **moedas perto do risco** (na ponte, na junção, no trecho apertado — o desvio corajoso paga); 2–3 trens (com 3, `lost` alcançável — decisão documentada); solução 12–20 passos + **rota sacrificial** documentadas; Q5: uma situação em que **esperar é tentador** (deixe os trens assentarem antes da ponte) — a fase provoca a «espera de graça» para o playtest ler o que o jogador faz com ela. *(Realização E14: o piso 12–20 vale para a solução oficial — oeste, 14 passos; a rota alternativa leste entrega em 11 como a escolha barata do trade-off 14·5 vs 11·3 — exceção deliberada, a confirmar em playtest.)*
- **Pronto quando:** solução entrega sem punição arbitrária (desvio = problema a resolver); há ESCOLHA real (≥2 rotas viáveis com custos distintos — sinal de falha do brief é rota única); moedas posicionadas onde o desvio é corajoso; walkthrough próprio via CDP; wingdings (rio ≠ trilho num relance).

### E15 — Auditoria P2 + handoff · ~0,5 sessão · SA5
- Checklist §3.4 (rio/ponte), §3.6 (coleta no slot), §4 (moedas contador burro — fórmulas seguem A DEFINIR), §3.10; tuning honesto (novos params vivos); matriz (com água/ponte/moedas e 3 trens); escopo §8; **texto consolidado para o Hefesto: D1–D13 + D12/D13 (pós-playtest) + D14 (decidida aqui) + leituras novas (water, coleta)**; checklist manual do designer; veredito.

**Total estimado: ~4 sessões** (D14 decidida: sem épico de input).

## 4. Subagentes

Mesma regra: `opencode-go/deepseek-v4.1-flash#max`, um por frente; orquestrador valida na prática e versiona por épico (commit + push; Pages sempre jogável).

| SA | Frente | Épico | Depende de |
|---|---|---|---|
| SA1 `core-rules` | rio/ponte + moedas + testes | E11 | aprovação deste plano |
| SA2 `board-render` | água/ponte/moeda/contador + rascunho | E12 | `types.ts` do SA1; depois paralelo |
| SA3 `feel-engine` | feedbacks do P2 | E13 | E11 + E12 |
| SA4 `level-deploy` | fase «Obstáculos» | E14 | E11–E13 |
| SA5 `qa-audit` | auditoria + matriz + texto-GDD | E15 | E14 |

## 5. Riscos

| # | Risco | Ataque |
|---|---|---|
| 1 | **Rio vira corredor, não puzzle** (sinal de falha do brief) | E14 exige ≥2 rotas viáveis com custos distintos; o rio cruza as rotas (não paralelo a elas). |
| 2 | **Rio ilegível ↔ trilho** (DPR 1, 44 pt) | Cor/temperatura próprias na paleta (água nunca cinza-trilho); marcador `water` distinto; matriz em 907×510. |
| 3 | **Q5 responde «droga»** (espera de graça esvazia) | A fase provoca a espera de propósito (janela da ponte); a leitura é do playtest — variantes do núcleo (remover o botão) são decisão do designer, não pré-implementadas. |
| 4 | **Moedas viram fórmula/sink por inércia** (scope creep) | Contador burro: sem pontuação, sem fórmula, sem persistência; as perguntas §4 do GDD permanecem A DEFINIR. |
| 5 | **Custo de 270° (rotação CW-only, D14 decidida: manter)** pode pesar no desvio obrigatório do P2 | Dado de design documentado; reapreciação **pós-P2 concluído**; mecanismo candidato já registrado pelo designer (seletor de sentido fora do tabuleiro, §7-D14). Variantes continuam branches, não pré-implementadas. |
| 6 | Regressão de 1 ação = 1 passo (o coração) | Testes E11 item a item + auditoria E15 contra §3.3 com os novos elementos. |

## 6. Tuning — adições

| Parâmetro | Default | Efeito |
|---|---|---|
| `palette.river` | `#2f8f9d` (decidido no E12: teal distante do par azul `#3b82f6` e do trilho; o plano propunha `#3a6ea8` e pedia «decidir com o render em frente à paleta» — decidido) | Água das células de rio |
| `coinRatio` | 0.22 | Tamanho da moeda relativo à célula (piso de desenho ~6 px) |
| `coinPulseMs` | 300 | Feedback de coleta (pulse na célula + tick no HUD, nascendo no início do passo — D16) |

A ponte não ganhou `palette.bridge`: o deck usa `palette.background` + `palette.track` (o default «cor do trilho» honrado sem um knob a mais — decidido no E12).

Vidas e moedas por fase continuam no **dado do layout** (regra, não feel).

## 7. Decisões

**Já decididas pelo designer (pós-playtest P1, em aplicação):**
- **D12 — Indicação do Y:** seta da rota (talo→ponta ativa) + realce do canal ativo (redundância). Substitui a cunha central.
- **D13 — Entrada off-board:** trens esperam fora da grade; entrada é marcador de borda; a **primeira célula é trilho** (qualquer peça — o P2 usou um **Y de entrada** deliberadamente, com a agulha nascendo apontando para a água; o reta-alinhada ficou só no P0/P1). O `Entry` fixo de célula morre. **Pendência V-4 (pós-auditoria):** nas entradas laterais (P0/P1), o trem esperando fica cortado pelo canvas (P0: 3 px visíveis); o P2 evitou com entradas topo/fundo. Decisão de design em aberto: clampar o ponto de espera ao canvas, ampliar a margem do shell, ou mover as entradas do P0/P1 para topo/fundo.

**D14 (DECIDIDA pelo designer, 19/11/2026): manter rotação CW.** Raciocínio do designer: **estabilidade** — o que funciona não trava o desenvolvimento; a decisão volta à mesa **depois do P2 concluído**, com mais elementos em jogo e mais certeza da necessidade real (o desvio obrigatório do P2 dará dados novos sobre a dor de 270°). **Mecanismo candidato registrado (ideia do designer, para a eventual variante):** um **seletor de sentido FORA do tabuleiro**, em forma de seta, que o jogador alterna **antes** de selecionar a peça a girar — aplicável a **todas as peças**, não só ao Y. Questão aberta a examinar na hora: o seletor seria modo persistente (não gasta ação — escolha de ferramenta, não turno), com o risco de o jogador **esquecer o modo ativo** como nova classe de erro (mesma família que o Q3 mede no ABAB). Variantes de controle continuam branches — não pré-implementadas. Nenhum épico de input no P2.

**Recomendações técnicas (ratificadas pela aprovação):**
- **D15 — Ponte:** peça fixa perpendicular ao rio, uma por rio, sem ação do jogador (GDD §3.4 literal); rio = banda reta de células fixas; `DerailReason` += `'water'`.
- **D16 — Moedas burras:** overlay sobre trilho (`LevelLayout.coins`), coleta no slot §3.6, contador sem fórmula; **moeda coletada por trem que morre no mesmo passo conta no contador** (a pergunta de «base sem bônus» do GDD §4 fica A DEFINIR para o pós-sink; no contador burro não há base).

**Pendente de registro no GDD via Hefesto (consolidado no E15):** D1–D11 (textos prontos dos relatórios E5/E10) + **D12/D13** (este plano) + **D14/D15/D16** após a aprovação + as leituras de regra (§3.10-Y, `water`).

## 8. Fora de escopo (imutável)

Túnel · cruzamento · **montanha** (elemento do GDD ainda **não atribuído a nenhum nó** — flag para o designer decidir se entra no P3) · 4 trens (3 permitidos) · fórmula de moedas/bônus · sink/loja/consumíveis · desfazer · save · menu · áudio · paisagem · gerador · estrelas/ranking · **variantes de controle** (toque longo, botão dedicado — branches do plano-protótipo, não implementadas por D14). **1 ação = 1 passo é o coração: nada mais move os trens.**

## 9. Aceitação do P2

**Técnicos (verificáveis sem jogador):**
- [ ] 1 ação = 1 passo com rio/ponte/moedas — testes automatizados.
- [ ] Ponte atravessa nos 2 eixos; água descarrila (`water`, 1 vida); previsão para na água com marcador próprio.
- [ ] Coleta na ordem exata §3.6 (entregas → coleta → colisões) — assert de eventos.
- [ ] Moedas: contador burro (sem fórmula/persistência); validação (moeda sobre trilho, uma ponte por rio, banda reta).
- [ ] Fase com ≥2 rotas viáveis de custos distintos (o rio não é corredor).
- [ ] D14 registrada: rotação permanece CW (custo de 270° documentado para reapreciação).
- [ ] 44 pt / DPR 1–2 / console limpo / < 3 s / nada da §8 no build.

**De leitura (sessão com jogador — Q2/Q5 + posicionamento):**
- [ ] O desvio obrigatório é problema a resolver, não punição arbitrária?
- [ ] O que o jogador faz com a espera de graça quando ela importa (janela da ponte)?
- [ ] Moedas perto do risco: o desvio corajoso é convidado? O jogador desvia por vontade própria?
- [ ] (3 trens, se a fase usar) `lost` na tela: punição sentida como justa?
- [ ] Failing vs. skipping; think-aloud; checklist §9.

## 10. Próximos passos

1. ~~Designer aprova este plano~~ **Aprovado em 19/11/2026 — D14: manter CW; D15/D16 ratificadas.**
2. Orquestrador dispara E11 (SA1 — contrato destrava E12 em paralelo).
3. Cada épico = commit + push (Pages sempre jogável no celular).
4. Registrar no GDD via Hefesto o bloco consolidado (D1–D16 + leituras).
5. Playtest do P2 → leitura Q2/Q5/posicionamento → branch ou P3 «Densidade» (túnel + cruzamento + 3–4 trens — e a decisão da montanha).
