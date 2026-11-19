# Trails — Plano de Implementação P3 «Densidade»

| | |
|---|---|
| **Data** | 19/11/2026 |
| **Escopo** | P3 «Densidade» (brief em `plano-prototipo.md` §5/§8): **túnel + cruzamento + 3–4 trens** — o nó que encontra o TETO cognitivo do jogo base. **Montanha** entra por decisão D17 (abaixo). Nada além — ver §8. |
| **Base** | GDD v1.2 §3.2 (cruzamento: canais independentes, **sem ação**; toque nulo [CONFIRMAR]), §3.4 (túnel: par bidirecional, travessia 1 passo; montanha: intransponível), §3.10 (túnel em sentidos opostos → colisão; cruzamento → colisão na mesma célula), §4 (densidade 2–3 média; 5+ exceção) · `plano-prototipo.md` §5-P3/§8-P3 (Q7) · `plano-implementacao-v1.md` §2 (P3 = pequena: pares de células + case de peça) · P0/P1/P2 aprovados e validados |
| **Estado** | Designer aprovou o ritmo **paralelo** (P3 constrói enquanto as sessões externas P0–P2 rodam — `checklist-sessao-externa-p0-p2.md`) e **este plano em 19/11/2026**: D17 (montanha ENTRA), D18/D19 ratificadas, D20 (sonda em duas fases: Densidade 3 trens + Densidade+ 4). V-4 decidida (margem 0,80, em aplicação); correções visuais pós-playtest em voo (D12-v2 conexão do Y; trilho-sempre-visível; horizonte D21). |
| **Destino** | `docs/plano-implementacao-p3.md` |

> Regra de conflito herdada: o GDD vence; o plano-protótipo define escopo e ordem. O P3 é o último nó: **quebrar aqui informa o TETO do jogo base, não o seu fracasso** (§8-P3).

---

## 0. O que é o P3 (o que o jogador vive)

A cadeia cresce para **cinco fases**: Contrato → Sincronia → Obstáculos → **Densidade** → **Densidade+**. A «Densidade» reúne tudo o que o jogo tem — **3 trens**, 2 Ys, um **túnel** (par de portais: entra por um, emerge no outro no passo seguinte) e um **cruzamento** (dois canais retos independentes, **sem ação**) — em 6×6. É legível por construção: janelas múltiplas com folga, rotas separáveis.

A «Densidade+» é a **sonda do teto**: o MESMO tabuleiro com **4 trens**. O alvo é o dado do Q7 — **legível com 3, caótico com 4** — para a curva de dificuldade dos mundos finais conhecer o teto do jogo base. As duas fases são o instrumento: o jogador externo joga a 3 e depois a 4, e a queda de legibilidade medida é o resultado do nó.

E, pela primeira vez em conteúdo, **`lost` acontece**: com 3–4 trens e 3 vidas, três perdas independentes são alcançáveis — o estado existe, é testado desde o E6, e o P3 finalmente o exercita de verdade (D11 vira experiência jogável, não só teste).

## 1. Base técnica — herdada, sem mudanças de stack

Motor N-trens, slot de coleta, vidas por fase, entradas-peça (D13), handoff `PHASES`, instrumento CDP. Novos: **túnel = par de células fixas ligadas** (case em `movement`/`step`); **cruzamento = peça de 4 lados em 2 canais, case sem ação**; **montanha = fixo intransponível** (D17). Tudo por adição, como o mapa do plano v1 prometia.

## 2. Mudanças no core

### 2.1 Túnel (GDD §3.4)
- **Modelagem:** `Fixed` += `Tunnel { kind:'tunnel', exit: CellPos }` — cada portal aponta para o parceiro; validação: pares simétricos, dentro da grade, sem compartilhar célula com outro fixo-macro (estação/ponte), portais distintos entre pares.
- **Movimento:** trem EM portal A → o passo o move para o **parceiro B** (travessia = 1 passo), **preservando a direção de deslocamento**; em B, o passo seguinte sai pelo lado correspondente a essa direção («sai pela direção da ponta oposta»). Vizinho sem trilho conectado na saída → descarrila (`noExit`).
- **§3.10-túnel:** dois trens entram em sentidos opostos no mesmo passo → cada um atravessa → **swap A↔B no mesmo passo = colisão pela regra geral** (a leitura do GDD «ambos emergem na mesma célula» satisfaz-se: ambos os movimentos cruzam na travessia). Teste com túnel real.
- **Previsão:** atravessa o par (path entra A, continua de B) — Pilar 3 intacto.
- Uma célula de túnel comporta um trem (regra geral).

### 2.2 Cruzamento (GDD §3.2)
- **Modelagem:** `PieceKind` += `'crossing'` — peça `{kind, rot}`: 4 lados em 2 canais retos independentes (canônico rot 0: N–S e E–W).
- **Movimento:** entra N → sai S; entra S → sai N; entra E → sai W; entra W → sai E. Canais independentes (não é zona segura — §3.10: dois trens na MESMA célula do cruzamento no mesmo passo = colisão, regra geral).
- **Ação:** **nenhuma — não gira** (§3.2); toque nele = **nulo** (§3.3 [CONFIRMAR]: «o passo só avança por ação real»); `NullTapReason` += `'crossing'` com o flash D3 — confirma ao jogador que o toque «entrou» sem custo.

### 2.3 Montanha (D17 — se aprovada) (GDD §3.4)
- `Fixed` += `Mountain { kind:'mountain' }`: célula intransponível, não recebe trilho, não ocupa espaço de rota.
- Chegada → descarrila com **motivo próprio `'mountain'`** (consistente com `water`: cada fatal fixo legível na leitura de sessão) + marcador de parada próprio na previsão.
- **Custo:** um case em `movement`/`step` + desenho + validação (não sobrecarregar rota). Completa o elenco de fixos do MVP (§3.4: rio/ponte/túnel/estação/montanha).

### 2.4 Densidade — as duas fases
- `level/p3.ts` (**Densidade**, 3 trens) e `level/p3-overload.ts` (**Densidade+**, 4 trens no mesmo tabuleiro ou variante próxima) — a sonda Q7.
- **`lost` alcançável:** com 3–4 trens, três perdas independentes existem — a fase DEVE torná-lo possível sem torná-lo provável (design de janela).

## 3. Épicos E16–E20

### E16 — Core: túnel + cruzamento + montanha · ~1–1,5 sessão · SA1
- Destravador: `types.ts` (Tunnel com `exit`, `'crossing'` em PieceKind, NullTapReason `'crossing'`, Mountain + `'mountain'`, validações) — libera SA2.
- Conteúdo: movement (túnel→parceiro preservando direção; cruzamento 2 canais; montanha), step (swap-túnel = colisão; cruzamento = regra geral; mountain derail), prediction (atravessa túnel; para na montanha), rascunho `level/p3.ts`.
- **Pronto quando (testes):** (1) tabela cruzamento: 4 entradas × saída correta, 4 rotações se aplicável, toque nulo `'crossing'` com flash, sem passo; (2) túnel: travessia 1 passo nos 2 sentidos, direção preservada, saída desconectada descarrila, **swap = colisão (§3.10) com túnel real**, previsão atravessa; (3) montanha: descarrila `mountain` + marcador, previsão para; (4) **`lost` em conteúdo-possível**: teste fabricado com 3 trens + 3 perdas → lives 0 → `lost`; (5) rajada com túnel/cruzamento (D4); (6) P0–P2 intactos (187 + novos).

### E17 — Render: portais, cruzamento, montanha · ~1 sessão · SA2 — paralelo após `types.ts`
- Portais de túnel com linguagem própria (boca escura; o par visível como pertencente — cor/composição), cruzamento como dois canais cruzados legíveis (≠ «é zona segura»), montanha inconfundível (massa, nunca parecida com trilho/água), marcadores de previsão (montanha própria; túnel atravessado), rascunho jogável ponta a ponta.
- **Pronto quando:** wingdings (túnel lê «passa por baixo»; cruzamento lê «cruz perigoso»; montanha lê «não passa»); 3 previsões simultâneas legíveis (3 trens); cadeia até o rascunho funciona.

### E18 — Feel: travessia e densidade · ~0,5–1 sessão · SA3
- **Túnel:** animação de travessia — o trem desliza PARA DENTRO do portal (fade) e emerge do parceiro (fade-in) no passo seguinte; sem teleporte seco.
- Colisão no cruzamento/túnel: os ghosts existentes cobrem; regressões de buffer com 3 trens (rajada na densidade), fps, reset.
- **Pronto quando:** travessia legível em 2× (túnel curto), 60 fps com 3 previsões + 4 trens, console limpo.

### E19 — Fases «Densidade» e «Densidade+» · ~1–1,5 sessão · SA4
- `p3.ts` (3 trens: **legível por construção** — janelas com folga; túnel+cruzamento+2 Ys em rota separável) e `p3-overload.ts` (4 trens: **a sonda do teto** — solvável por vitória dinâmica, deliberadamente no limite).
- **Requisitos:** ambos entram/passos conforme §3.5; solução 12–20 (Densidade) documentada + rota sacrificial + falhas (túnel em sentidos opostos, cruzamento simultâneo); Densidade+ documentada como **prova de carga** com solução possível e o caixo esperado; `PHASES` cresce (5 fases).
- **Pronto quando:** Densidade entrega legível (a leitura de 3 trens é confortável); Densidade+ é vencível e visivelmente difícil; walkthrough próprio com os dois; Q7 tem seu instrumento pronto.

### E20 — Auditoria P3 + texto-GDD · ~0,5 sessão · SA5
- Checklist §3.2 (cruzamento), §3.4 (túnel/montanha), §3.10 (casos túnel/cruzamento), §3.5 (3–4 partem juntos), D17–D20; tuning honesto; matriz com 3–4 trens; escopo §8; **texto-GDD consolidado final (D1–D20 + as leituras)**; checklist manual; veredito do protótipo completo.

**Total estimado: ~4–4,5 sessões.**

## 4. Subagentes

Mesma regra de sempre (DS 4.1 flash #max; orquestrador valida/versiona por épico; commit+push no Pages).

| SA | Frente | Épico | Depende de |
|---|---|---|---|
| SA1 `core-rules` | túnel/cruzamento/montanha + testes | E16 | aprovação |
| SA2 `board-render` | portais/cruzamento/montanha + rascunho | E17 | `types.ts` |
| SA3 `feel-engine` | travessia + densidade | E18 | E16+E17 |
| SA4 `level-deploy` | Densidade + Densidade+ | E19 | E16–E18 |
| SA5 `qa-audit` | auditoria + texto-GDD | E20 | E19 |

## 5. Riscos

| # | Risco | Ataque |
|---|---|---|
| 1 | **Densidade colapsa já com 3** (sinal de falha do brief → alvo do jogo base cai para 2–3) | Densidade desenhada legível-por-construção; o dado do Q7 vem dos externos nas DUAS fases. |
| 2 | Túnel/cruzamento legíveis como mágica/zona-segura | Linguagem visual própria (E17) + previsão atravessando + marcadores; cruzamento nunca desenhado «amigável». |
| 3 | Swap no túnel: regra geral vs leitura do GDD | Leitura registrada (swap = colisão; «mesma célula» = a travessia cruzada); teste com túnel real; texto-GDD. |
| 4 | `lost` alcançável vira frustração | Design de janela (possível, não provável); 1 toque recomeça; vidas visíveis. |
| 5 | 5 fases na cadeia alongam a sessão externa | Sessões externas P0–P2 rodam ANTES/independente; a cadeia 5-fases é para a sessão do Q7. |

## 6. Tuning — adições

| Parâmetro | Default | Efeito |
|---|---|---|
| `palette.mountain` | `#8a7a5c` (terra-pedra, distante de água/trilho) | Massa da montanha |
| `palette.tunnel` | `#3a3f44` (boca escura na cor do trilho) | Portais |
| `tunnelFadeMs` | 160 | Fade de entrada/saída do túnel |

## 7. Decisões (D17–D20) — APROVADAS pelo designer em 19/11/2026

**D17 (APROVADA): montanha ENTRA no P3.** Completa o elenco de fixos do MVP (§3.4); motivo próprio `'mountain'` + marcador (consistente com `water`).

**D18 (APROVADA): túnel como modelado** — par simétrico, travessia = 1 passo preservando direção, swap = colisão (leitura da tabela §3.10), previsão atravessa.

**D19 (APROVADA): cruzamento como modelado** — peça de 2 canais, **sem ação** (toque nulo `'crossing'` com flash D3), colisão na mesma célula pela regra geral.

**D20 (APROVADA): a sonda do teto em DUAS fases** — «Densidade» (3 trens, legível por construção) + «Densidade+» (4 trens, prova de carga vencível). O Q7 mede a queda de legibilidade 3→4 na cadeia publicada.

**Carregadas:** V-4 decidida (margem 0,80 — em aplicação); D14 com o gatilho do designer batido (pós-P2) — reapreciação após os externos trazerem a dor de 270° medida; Hefesto acumulado (D1–D16 + N1–N4 do playtest P2 + D17–D20 após aprovação).

## 8. Fora de escopo (imutável)

Gerador de fases · sink/loja/consumíveis · fórmula de moedas · save/localStorage · áudio · menu · paisagem · desfazer · estrelas · variantes de controle (D14 em espera) · formatos irregulares · blocos pós-MVP (semáforo, desvio fixo, vagões) · **5+ trens**. **1 ação = 1 passo é o coração: nada mais move os trens.**

## 9. Aceitação do P3

**Técnicos:**
- [ ] 1 ação = 1 passo com túnel/cruzamento/montanha (testes: giro/passar/nulo `'crossing'` sem passo/toggle/bloqueio/D4).
- [ ] Túnel: travessia 1 passo, direção preservada, swap = colisão, previsão atravessa, saída desconectada descarrila.
- [ ] Cruzamento: 2 canais, sem ação (nulo com flash), colisão mesma célula.
- [ ] (D17) Montanha: intransponível, motivo próprio, marcador próprio.
- [ ] `lost` exercitável em conteúdo (3–4 trens, 3 perdas possíveis).
- [ ] Densidade legível; Densidade+ vencível; cadeia de 5 fases no Pages; 44 pt/DPR/console/zero externos.

**De leitura (sessão Q7 — o ponto do nó):**
- [ ] Legível com 3, caótico com 4? (o teto do jogo base medido)
- [ ] Onde quebra primeiro: previsões simultâneas? janelas encadeadas? túnel+cruzamento juntos?
- [ ] Caos já com 3 → alvo de densidade do jogo base cai para 2–3 (informação, não fracasso).

## 10. Próximos passos

1. Designer aprova este plano (D17–D20; alternativas em §7).
2. Orquestrador dispara E16 (contrato destrava E17 em paralelo); commit+push por épico.
3. **Em paralelo, o designer roda as sessões externas P0–P2** (`checklist-sessao-externa-p0-p2.md`) — o gate do método; os dados alimentam as branches (D14, ABAB, botão, sacrifício) e o veredito.
4. Ao fim de P3 + externos: **gate do protótipo** (§10 do plano-protótipo) — divertido o suficiente para a 2ª fase (sink + gerador + produção de conteúdo)? Ou reformulação?
