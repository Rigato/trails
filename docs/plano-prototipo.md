# TRAILS — Plano de Protótipo

| | |
|---|---|
| **Data** | 18/11/2026 |
| **Objetivo** | Descobrir se a mecânica base (trilhos + turnos) é divertida — antes de investir em sink, loja, gerador ou arte |
| **Base** | GDD v1.2 (`gdd-trails.md`) · referências (`referencias-comparativas.md`) |
| **Método** | Prototipar para expor incerteza, não para imitar produção |

> Princípio: **preprodução resolve "known unknowns"; protótipo existe para expor o que ainda não sabemos nomear.** Este documento define o que precisa ser *aprendido* — o que construir para aprender é consequência.

---

## 1. Enquadramento do conceito

- **Conceito atual:** puzzle de roteamento em grade; 1 ação = 1 passo de todos os trens; Y como desvio bidirecional; vitória dinâmica com vidas; previsão de trajetória como contrato (a colisão é a única incerteza).
- **Por que parece promissor:** cada ajuste custa tempo de trem → decisões com custo embutido, sem reflexo; a sincronização temporal (o Y certo no passo certo para trens diferentes) é um tipo de "aha" raro em puzzle casual; a leitura total do futuro promete mortes justas.
- **Por que ainda está nebuloso:** **o jogo nunca foi jogado.** Todo o design até aqui é analítico — regras coerentes no papel, feel desconhecido na mão. O ritmo 1-toque-1-passo pode ser tão bom quanto parece ou virar clique-mecânico. O toggle ABAB do Y pode ser elegante ou pé-no-saco exatamente nos momentos em que o jogador não pode errar.
- **Suposições que sustentam o conceito (e que o protótipo deve confrontar):**
  1. O jogador se importa em salvar trens mesmo sem sink de moedas.
  2. O botão "passar turno" alivia busywork sem esvaziar a tensão.
  3. Janelas temporais são legíveis em tela pequena com 2–4 trens.
  4. A fonte de diversão é o **planejamento**, não o clique.

---

## 2. Mapa de incerteza

| Quadrante | Itens |
|---|---|
| **Known knowns** | Regras fechadas (Y, vitória dinâmica, ordem de resolução, casos de borda do GDD §3.10) · escopo do MVP · comparáveis estudados · metas de tutorial (impossível de falhar, wingdings test) |
| **Known unknowns** | A base é divertida? · colunas do tabuleiro · fórmula do bônus de trem · custo de vida no caso colisão+descarrilamento · direção de arte · plataforma/engine |
| **Unknown knowns** | Intuição do designer (ex-indústria) de que timing frustra casual — o design deve prová-la errada ou certa, não presumi-la · a familiaridade física de desvios reais de ferrovia (o jogador já sabe como um switch funciona antes do tutorial) · o gosto declarado por "mecânicas criativas" vs. a clareza que casual exige |
| **Suspeitas de unknown unknowns** | **O feel do clique:** a animação entre toques É o jogo; se errar, tudo vira irritação · **comportamento de espera:** com o botão, o jogador pode alinhar tudo e só assistir — o jogo vira filme? · **a diversão inesperada:** sacrificar um trem pode ser mais dramático (e divertido) que salvá-lo · **a legibilidade sob stress:** a ponta ativa do Y lê-se bem no passo 12, com 3 trens e 1 colisão pendente? · **fonte de prazer:** talvez o prazer esteja no plano conjunto (ver 2 rotas se encaixarem), não no toque individual — o que mudaria o peso do botão e das animações |

---

## 3. Perguntas do protótipo

*Regra: pergunta descreve o que precisa ser aprendido — não o que precisa ser construído.*

| # | Pergunta | Suposição que ameaça |
|---|---|---|
| **Q1** | O jogador entende o contrato (toque = passo, previsão, entrega) sem explicação além do mínimo? | "é óbvio, o jogador vai entender" |
| **Q2** | 1-toque-1-passo gera tensão de decisão — ou vira busywork em que o clique substitui o pensamento? | a aposta central do jogo |
| **Q3** | O toggle ABAB do Y é operável quando não pode errar — ou o jogador erra a ação (troca ponta quando queria girar)? | o controle dual é bem-intencionado |
| **Q4** | A janela temporal (Y certo no passo certo para trens diferentes) produz "aha" — ou frustração de execução? | sincronização é o prato caro do jogo |
| **Q5** | O que o jogador faz quando descobre que pode "esperar de graça"? Passar turno viraplanejamento legítimo ou vira droga que esvazia o jogo? | o botão alivia sem esvaziar |
| **Q6** | A morte anunciada pela previsão é sentida como justa ("eu errei") ou como surpresa da UI? | o Pilar 3 |
| **Q7** | Onde o jogo quebra primeiro com 4 trens + 2 Ys + túnel + cruzamento? | densidade 2–4 é suportável |
| **Q8** | Sacrificar um trem é vivido como estratégia legítima — ou como derrota disfarçada? E qual dos dois é mais *divertido*? | sacrifício é degeneração a punir |

---

## 4. Tipo de protótipo por pergunta

| Pergunta | Tipo | Fidelidade mínima | Por quê |
|---|---|---|---|
| Q1, Q3, Q6 | **Interaction** (legibilidade/input) | Grade feia e funcional; formas geométricas; sem som | O que se testa é compreensão e operação, não beleza |
| Q2, Q4, Q5, Q8 | **Experience** (feel/ritmo/tensão) | Animação de passo real com duração ajustável; sem arte | A incerteza é emocional: tensão, ritmo, drama |
| Q7 | **Interaction + carga** | Tabuleiro grande sujo, 4 trens | Quer-se o ponto de quebra cognitiva, não o equilíbrio |
| *(todas)* | **P0a — papel** (pré-digital) | Fichas de papel, 1 sessão | Valida REGRAS e legibilidade bruta por quase zero custo — mas **não** valida feel (não há toque nem tempo); papel não substitui o digital, só o antecede |

---

## 5. Sequência (mapa com branches)

Cada protótipo faz uma de: matar ideia, estabilizar baseline, revelar direção mais forte, expor pergunta mais funda.

| Nó | Conteúdo | Aprende | Branch provável | Estado |
|---|---|---|---|---|
| **P0a — Papel** | Grade desenhada, fichas de trem, regras do GDD na mão | Ambiguidades de regra que o GDD esconde; leitura bruta do tabuleiro | Regras corrigidas no GDD antes do digital | — |
| **P0 — Contrato** | Tutorial impossível de falhar: 1 trem, retas/curvas, previsão, botão passar turno | Q1, Q2 (base), Q6 | Feel ruim → **dead end** do núcleo: repensar antes de avançar (variantes: sem botão; passo a cada 2 ações; trem mais lento) | — |
| **P1 — Sincronia** | + Y + 2 trens | Q3, Q4, Q8 | ABAB falha → testar controles alternativos (toque curto vs. longo; botão dedicado por peça). Sacrifício divertido → **abraçar como mecânica** e recalibrar economia | — |
| **P2 — Obstáculos** | + rio/ponte | Q2 com rota forçada; custo de desvio; Q5 em contexto real | Moedas perto do risco: testar posicionamento | — |
| **P3 — Densidade** | + túnel + cruzamento + 3-4 trens | Q7: ponto de quebra | Quebra cedo → teto de densidade do jogo base; mundos tardios assumem o excesso | — |

**Regra de sequência:** P1 só abre depois de P0 ser **baseline** (divertido o suficiente para construir sobre). Não empilhar variáveis: cada nó adiciona UMA incerteza dominante.

---

## 6. Anti-padrões vigiados (o que NÃO fazer)

- **Não polir antes de aprender:** o protótipo é feio e basta. Arte, som completo, menus: fora.
- **Não transformar em mini-produto:** sem meta-progressão, sem tutorial com múltiplas telas, sem orientação paisagem.
- **Uma variável por teste:** P0 não mede sacrifício; P1 introduz só o Y; moedas entram como contador burro, sem fórmula.
- **Não confundir viabilidade com desejo:** as regras funcionam no papel (P0a vai provar) — a questão é se são *gostosas*.
- **Não proteger o conceito:** se Q2 falhar, as variantes de núcleo (§5, P0) entram na mesa com o mesmo status da original.
- **Não estender a exploração após a clareza:** obtidas as respostas de Q1–Q6, o protótipo acabou — mesmo que "só falte uma coisinha".

---

## 7. Critérios de parada

**Parar quando:**
- Q1–Q6 responderem com clareza (não com esperança) — especialmente Q2 e Q4.
- O designer quiser rejogar P1–P3 **por vontade própria**, e 2–3 jogadores externos entenderem o contrato sem texto além do mínimo.
- As decisões de variante estiverem tomadas: botão fica ou sai; ABAB fica ou muda; sacrifício é punido ou abraçado.

**Ainda não está claro o suficiente se:**
- O núcleo parecer "ok, mas indiferente" — indiferença é resposta negativa para um jogo de puzzle.
- Jogadores externos precisarem de explicação verbal para o passo ou o Y.

**Não esperar:** fórmulas afinadas, arte, todos os casos de borda (a tabela do GDD já os resolve analiticamente), resposta econômica (sink é 2ª fase por decisão do designer).

---

## 8. Briefs dos protótipos

### P0a — Mesa de papel
- **O que aprende:** onde as regras do GDD são ambíguas quando alguém as opera sem o autor presente; leitura bruta do tabuleiro.
- **Por que agora:** custa uma sessão; todo erro de regra achado aqui é erro que o digital não precisa herdar.
- **Fora de escopo:** feel, timing, qualquer juízo de diversão.
- **Tipo:** interação/regras. **Fidelidade:** fichas de papel, grade desenhada, ~1 sessão de 7h/semana.
- **Sinal de sucesso:** completar a fase discutindo apenas decisões de jogo — nunca regras.
- **Sinal de falha:** discussão dominada por "como funciona isso?" → corrigir GDD e repetir.

### P0 — Contrato
- **O que aprende:** Q1 (contrato sem explicação), Q2 base (tensão do toque=passo), Q6 (morte justa).
- **Por que agora:** é a aposta central; tudo o mais depende dela.
- **Fora de escopo:** Y, 2+ trens, moedas com fórmula, arte, som, derrota real (impossível de falhar).
- **Tipo:** experience + interaction. **Fidelidade:** 1 tela, 6×6, formas geométricas, animação de passo real.
- **Sinal de sucesso:** jogador entrega e quer jogar DE NOVO na hora; descreve o jogo a alguém em uma frase correta.
- **Sinal de falha:** indiferença; ou jogador explica errado como o tempo funciona.
- **Branches:** dead end → variantes de núcleo; baseline → P1.

### P1 — Sincronia
- **O que aprende:** Q3 (ABAB sob pressão), Q4 (janela temporal = aha?), Q8 (sacrifício).
- **Por que agora:** o Y e o segundo trem são o jogo de verdade; P0 só provou o contrato.
- **Fora de escopo:** rio, túnel, cruzamento, 4+ trens.
- **Tipo:** experience. **Fidelidade:** a mesma do P0 + peça Y + segundo trem.
- **Sinal de sucesso:** o jogador ri ou xinga (de alegria ou raiva *saudável*) na primeira janela apertada; pede "mais um desses".
- **Sinal de falha:** errar repetidamente a AÇÃO do Y (não a decisão) → problema de controle, não de design de puzzle.
- **Branches:** ABAB falha → variantes de controle; sacrifício divertido → recalibrar economia para premiar o drama, não puni-lo; baseline → P2.

### P2 — Obstáculos
- **O que aprende:** rota forçada com custo de ação (rio/ponte); Q5 (espera de graça) em contexto que importa; posicionamento de moedas.
- **Por que agora:** o primeiro elemento que PUNE em vez de apenas complicar.
- **Fora de escopo:** túnel, cruzamento, 4 trens.
- **Sinal de sucesso:** o desvio obrigatório é sentido como problema a resolver, não punição arbitrária (lição Trainyard: obstáculo sem cleverness é pedra no caminho).
- **Sinal de falha:** rota única óbvia e sem escolha → o rio vira corredor, não puzzle.

### P3 — Densidade
- **O que aprende:** Q7 — o ponto de quebra cognitiva com 3–4 trens, túnel e cruzamento juntos.
- **Por que agora:** por último, porque só faz sentido sobre um baseline divertido; quebrar aqui informa o TETO do jogo base, não o seu fracasso.
- **Sinal de sucesso:** sobrecarga chega de forma *escalável* (legível com 3, caótica com 4) → a curva de mundos tem teto conhecido.
- **Sinal de falha:** caos já com 3 trens → reduzir densidade alvo do jogo base (média 2–3, não 2–4).

---

## 9. Instrumentos de leitura (durante as sessões)

1. **Failing vs. skipping** (lição Cut the Rope, já no GDD §6): descarrilar repetido no MESMO lugar = execução (alargar janela); desistir após poucas ações = ensino/legibilidade (reforçar apresentação).
2. **Think-aloud:** pedir ao jogador para falar o que acha que vai acontecer antes de tocar — expõe o modelo mental do contrato (Q1, Q6).
3. **Checklist pós-sessão:** Quer jogar de novo? · Entendeu por que perdeu? · O que foi mais tenso? · O botão foi usado para planejar ou para "assistir"? · Errar a ação do Y foi culpa do jogador ou do controle?
4. **Sinal de drama:** reações espontâneas (riso, xingo, silêncio de concentração) valem mais que qualquer nota.

---

## 10. Depois de cada protótipo

- Registrar resultado no nó correspondente (estado: dead end / baseline / branch trigger / production candidate).
- Decisões que nascerem vão para o GDD com a marcação adequada; lições de método para este plano.
- Ao fim de P3: **gate de decisão** — divertido o suficiente para a 2ª fase (sink + gerador de fases + produção de conteúdo)? Ou o design precisa de reformulação? Critério: as respostas de Q2 e Q4, e a vontade de rejogar.
