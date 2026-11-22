# TRAILS — Proposta de Escopo MVP2 (v2)

| | |
|---|---|
| **Versão** | 2 — incorpora as decisões do designer de 21/11: save entre sessões, loja rudimentar com 2 consumíveis, densidade começando em 3 trens |
| **Data** | 21/11/2026 |
| **De** | Hefesto (design) |
| **Para** | Sessão dos três (designer + Hefesto + orquestrador) — fechar o `plano-implementacao-mvp2` |
| **Base** | Brief MVP2 + veredito e ajustes do designer + GDD v1.3 + plano-protótipo |
| **Método** | Responde aos 4 eixos do brief com marcações do GDD; divergências sinalizadas |

> **Objetivo do MVP2:** testar se conseguimos deixar o jogo **divertido** — mecânica já validada; o que falta é **desafio com intenção** («xadrez consigo mesmo») e uma economia que dá **valor ao êxito**.

---

## 0. O veredito lido — e a correção do Eixo 3

**O que o P0–P3+ provou:** motor sólido (238 testes), contrato de leitura sustentado (wingdings aprovado na prática), feel no alvo, vitória dinâmica + `lost` funcionando, N-trens legíveis por construção.

**O sinal escondido no «não achei divertido»:** os momentos que o designer apontou como bons — dois trens na Sincronia, a armadilha da impaciência na Obstáculos — são **momentos de level design, não de mecânica**. A aposta está certa; faltou investir nela. O MVP2 é esse investimento.

**A correção do Eixo 3 (palavras do designer, 21/11):** «o erro precisa de dentes» era leitura errada do brief. Ele quis dizer: *«mantendo a derrota barata, o jogador vai tentando várias vezes até acertar o puzzle. Acho isso bom. Mantém o atrito baixo.»* **Derrota barata é design, não omissão** — as referências sustentam (Railbound é comfy porque o retry é livre; Cut the Rope: estrelas opcionais = dificuldade autogerenciada; Trainyard: o prazer de resolver não precisa de punição). A tensão de Trails **mora no passo** — cada giro errado move todos os trens na hora. O que faltava era **aspiração**: nada distinguia vencer mal de vencer bem. O remédio não é punir o erro; é **valorizar o êxito completo** — e, por decisão do designer, já dar às moedas **onde serem gastas** (loja rudimentar no MVP2, ver Eixo 3).

---

## 1. Eixo 1 — A cadeia atual vira o tutorial

- **Compressão 5 → 4 [CONFIRMAR]:** Contrato → Sincronia → Obstáculos → Densidade. O P3+ (4 trens) sai do tutorial — era prova de carga (Q7), não ensino; o pico de 4 trens vira conteúdo da faixa 3 do jogo real.
- **Contrato de saída — o tutorial termina quando o jogador:**
  1. entende que tocar move o tempo e **todos** os trens;
  2. lê a previsão e o **horizonte** (morte local anunciada; remota se revela ao avançar);
  3. opera o **Y** (ABAB + leitura por conexão);
  4. conhece o **seletor de sentido** (Eixo 4 — apresentar logo após o Y);
  5. sabe que moedas são **opcionais**;
  6. sabe que a perda é tolerada (**vidas** — margem de erro real);
  7. sabe que **reiniciar é grátis** — experimentar é o modo de jogo.
- **Transição de tom:** a última fase do tutorial entrega o **primeiro xadrez** — escolha real de trade-off (rota segura vs rota com moeda arriscada). O jogador sente o gênero do jogo real antes de sair do tutorial, sem troca de motor (lição Railbound/Trainyard).
- **[A DEFINIR]:** cada conceito novo usa o padrão D6 (destaque sutil sem texto) ou ganha apresentação própria? Wingdings permanece a meta.
- **Nota de densidade [FECHADO]:** o tutorial é o único lugar de 1–2 trens — «2 trens é muito fácil, coisa de tutorial» (designer). O jogo real começa em 3.

## 2. Eixo 2 — O jogo real: a gramática da fase-boa

**Uma fase de Trails é boa quando [CONFIRMAR — checklist de validação por fase]:**
1. **Recurso disputado** — pelo menos um trecho que dois trens precisam (ponte, Y, corredor) **em janelas diferentes**: a disputa é o xadrez.
2. **Janela legível e apertada** — o giro crítico é anunciado com antecedência ≥ horizonte; exige planejar 2–3 ações à frente. *Failing repetido na mesma janela = alargar; skipping = ensinar antes.*
3. **Dois andares de sucesso** — a rota mínima (vencer) é visível; a rota perfeita (todos os trens + todas as moedas) é **visivelmente mais difícil**; o jogador escolhe seu alvo (dificuldade autogerenciada, lição Cut the Rope).
4. **Uma ideia dominante** — a fase ensina/exige uma coisa; o nome da ideia cabe numa linha antes de desenhar (lição Trainyard).
5. **Morte com antecedência** — toda morte entra na janela com ≥6 ações de aviso; nenhuma emboscada dentro do horizonte.
6. **Espaço para experimentar** — a run tolera perda parcial (vidas); restart em 1 toque; a fase recompensa tentar de novo.

**Volume e curva [CONFIRMAR]:** 12 fases de puzzle em 3 faixas de 4 + 4 de tutorial = 16 no MVP2.
- **Faixa 1 (1–4) — 3 trens:** o aquecimento vem do **layout**, não de subtrair trens — uma disputa dominante, janelas generosas, contragiro como lance. A fase 1 da faixa é a mais suave do jogo real.
- **Faixa 2 (5–8) — 3 trens:** duas disputas entrelaçadas, túnel/cruzamento em rota, moedas em zona de risco (ponte/cruzamento — lição Pipe Mania), escolha salvar-vs-moeda com custo real.
- **Faixa 3 (9–12) — 3–4 trens:** janelas apertadas, combinação total, o pico de Q7 (4 trens legível por construção — E19).
- **Curva com vales dentro de cada faixa** (lição Trainyard): fase fácil → sobe → **pico na 3ª** → vale na 4ª (revista a ideia anterior em contexto novo).
- **Nota de coerência:** com 3+ trens desde a faixa 1, a derrota por vidas (`lost`) é alcançável desde o início do jogo real — as vidas deixam de ser decorativas (na nota do D7, isso só acontecia com 3+ trens).

**Fases com perda forçada («impossível salvar todos») [A DEFINIR — recomendação forte: NÃO no MVP2]:** perda projetada como solução ótima quebra o selo de perfeição e o Pilar 4 — é mudança de contrato que exige sinalização própria. Se o design pedir, é expansão pós-MVP2 com aviso na fase (ícone de contrato diferente). No MVP2, **toda fase é 100% viável** — e desenhar 100%-viável é o braço de ferro saudável do level design.

**Gerador de fases:** fora (decisão antiga mantida — handcrafted com intenção primeiro). As 12 fases são o trabalho central do MVP2.

**Gate interno [CONFIRMAR]:** produzir a **faixa 1 primeiro** (4 fases + seletor + selo + save/loja), o designer joga e dá o veredito **«é xadrez agora?»** — só então as faixas 2–3.

## 3. Eixo 3 — Economia: aposta por aspiração, não por punição — com sink desde já

**Princípio [FECHADO]:** derrota barata permanece (restart 1 toque, gratuito, sem perda de progresso *entre tentativas*). A tensão mora no passo; o valor vem da **aspiração** — e as moedas já têm onde serem gastas no MVP2.

**O que entra no MVP2:**
1. **Save entre sessões [FECHADO — decisão do designer]:** «várias fases e ninguém tem condição de jogar tudo de 1x». Persistem: **fases desbloqueadas + selos por fase + carteira de moedas**. *(Distinção que protege o princípio: save é ENTRE sessões; derrota barata é ENTRE tentativas — coisas diferentes, ambas mantidas.)*
2. **Carteira persistente:** moedas ganhas na vitória acumulam entre fases e sessões.
3. **Fórmula mínima viva:** coleta + **bônus por trem entregue, superlinear** [A DEFINIR — tuning; candidatos: tabela fixa {1: +0, 2: +2, 3: +6, 4: +12} ou multiplicador quadrático]. Exigência de design: bônus **legível na tela de vitória** («+12 — 3/3 trens entregues»).
4. **Selo de perfeição por fase:** «todos os trens + todas as moedas», **conquistado apenas em run sem consumíveis** — visível na saída e na lista de fases. *Nota honesta: revê o [FECHADO] «sem estrelas no MVP1» de forma consciente; estética do selo [A DEFINIR] — forma + cor, nunca cor sozinha.*
5. **Loja rudimentar [FECHADO — decisão do designer] com dois consumíveis [CONFIRMAR], ambos custando moedas e bloqueando o selo da fase:**
   - **Resgate de trem** — um trem perdido **volta ao ponto de espera fora da grade e entra no próximo passo** (comportamento idêntico à partida; sem exceção nova de regra). **Não devolve a vida perdida** — recupera o requisito dinâmico, não o orçamento. **Apresentado como alternativa à desistência** na detecção de não-vencível: «resgatar (custa moedas) vs desistir (grátis)» — a escolha econômica mais interessante do jogo. Preço e limite por run **[A DEFINIR — sugestão: 1 resgate por run, preço médio]**.
   - **Time-travel** — **reverte integralmente o último passo**: posições de trens, estado das peças, moedas coletadas, mortes, vidas e entregas voltam ao estado exato anterior à última ação. **Régua de preço [A DEFINIR]:** *desfazer a run inteira deve ser proibitivo; salvar 1 passo crítico deve ser tentador* — barato demais desvaloriza a morte; caro demais ninguém compra. Indisponível após vitória/derrota da run e no tutorial.
   - Ambos indisponíveis no tutorial; ambos são **margem, nunca solução** (guard-rails do GDD §4): o resgate devolve o trem, não a rota; o time-travel devolve o passo, não a resposta.
6. **Energia [A DEFINIR — anotada, NÃO implementada]:** limite de tentativas fora da run recarregável por anúncios (padrão free-to-play), ideia do designer — o nome casa com os trens e com a futura «energia encadeada» do GDD. *Ressalva honesta registrada: energia é o **oposto** da derrota barata — se um dia entrar, muda o DNA do jogo e o modelo de negócio; decisão de negócio, não de gameplay — pós-MVP2, com dados na mão.*

**O que NÃO entra [FECHADO na direção]:** perda de coisas conquistadas ao reiniciar; vidas por mundo; custo por tentativa; sistema de energia (anotado acima).

**Respostas às perguntas do brief (atualizadas):**
- *O que persiste?* Fases desbloqueadas + selos + carteira (save). *O que se perde ao errar?* Nada além da tentativa — **por decisão do designer**.
- *Sink mínimo?* **A loja de 2 consumíveis — agora, no MVP2** (o designer quis testar o efeito cedo; a v1 desta proposta empurrava para o MVP3 — revertida).
- *Save entre sessões?* **Sim** — reversão da recomendação anterior.

**Trade-offs nomeados com honestidade:**
- **Farm persistente:** com save, repetir fases fáceis por moedas acumula entre sessões. Mitigação barata: aceitar no MVP2 (o selo não é farmável — uma vez por fase) e ver nos dados; se doer, só moedas acima do recorde da fase contam [A DEFINIR].
- **Time-travel vs. morte:** o TT reverte morte E vida (reversão integral). Se for barato, morte perde sentido. A régua de preço acima é o controle; vigiar no playtest.
- **Selo exige run limpa:** o purista não compra consumíveis (quer o selo); o casual compra para progredir. Dois públicos, um sistema — intencional.
- **Trial-and-error bruto** (o risco real da derrota barata): mitigado pelas janelas legíveis (Eixo 2) e pelo selo (ambição faz pensar antes de tocar). Se o jogador vencer chutando, o level design falhou — não a economia.

## 4. Eixo 4 — Seletor de sentido (D14 → D22)

- **[FECHADO — D22]** Seletor CW/CCW **fora do tabuleiro** (seta alternável antes de selecionar a peça), para todas as peças — decisão do designer após testar o custo de 270° em primeira mão: «essencial; abre oportunidades de level design» — o contragiro vira lance, não imposto. Registrado no GDD §3.3.
- **Ortogonal ao ABAB do Y [CONFIRMAR]:** o seletor define o **sentido** do giro; o ABAB alterna **qual ação** (trocar ponta ↔ girar). No Y, o "girar" do ABAB usa o sentido atual do seletor.
- **Modo persistente [CONFIRMAR]:** não gasta ação (ferramenta, não turno). Mitigação do "modo esquecido": **estado visível no HUD** — seta grande apontando o sentido ativo; sem indicador por peça (coerente com D9/D12-v2). Placement e apresentação no tutorial: [A DEFINIR] na sessão dos três.
- **Em uso:** ao menos 2–3 fases do Eixo 2 exigem contragiro para o selo de perfeição.

## 5. Sequência de ataque (épicos sugeridos)

1. **E4 — Seletor** (médio): destrava o level design; entra primeiro.
2. **E3 completo — Save + carteira + bônus por trem + selo + loja com 2 consumíveis** (médio: voltou a crescer com as reversões do designer — sem sistemas de *perda*, porém; o item mais caro é o **time-travel**, que exige snapshot do estado por passo — apontar ao orquestrador como risco técnico do épico).
3. **E1 — Tutorial reorganizado** (baixo: dado `PHASES`).
4. **E2 faixa 1 — 4 fases de 3 trens** (o trabalho central começa).
5. **GATE do designer:** «é xadrez agora?» — veredito antes de produzir o resto.
6. **E2 faixas 2–3 — 8 fases** + calibração de curva pelos playtests externos (failing/skipping).

## 6. Playtests externos — continuam DURANTE o MVP2

- **O tutorial publicado é o instrumento** para Q1/Q3/Q6 (contrato lendo-se sozinho com novatos).
- **A curva nova** calibra por failing vs. skipping (instrumento do plano §9).
- **Q7 (3→4 trens)** confirma na faixa 3.
- **Sinal novo de economia:** a loja é **usada sem arrependimento** — consumíveis compram **margem**, não vitória. Se "comprar a vitória" for comum, o guard-rail falhou (preço errado, não jogador errado).
- O veredito do designer é o sinal principal; os externos afinam.

## 7. Critério de sucesso do MVP2 + fora de escopo

**Sucesso [CONFIRMAR]:**
- O designer **quer rejogar** as fases por vontade própria (o gate de cada faixa).
- 2–3 jogadores externos entendem o tutorial sozinhos e **pensam antes de tocar** (planejaram, não chutaram).
- O selo desperta ambição genuína («quero o perfeito nessa fase»).
- A loja morde: moedas são gastas em resgate/time-travel **sem quebrar o desafio**.
- Mortes locais sentidas como justas; morte remota = descoberta, nunca quebra de contrato.
- Failing vs. skipping dentro da faixa esperada por fase.

**Fora do MVP2:** gerador de fases · mundos temáticos · **sistema de energia/ads (anotado, decisão de negócio)** · áudio · paisagem · fases com perda forçada (recomendação) · ranking/leaderboards · mais consumíveis além dos dois.

---

*Para constar: a v2 desta proposta incorpora as três reversões do designer de 21/11 sobre a v1 — save entre sessões (antes "sessão-first"), loja com 2 consumíveis (antes "MVP3"), densidade 3+ desde a faixa 1 (antes "2–3 na faixa 1"). Divergências restantes do brief original: apenas a recomendação contra fases com perda forçada no MVP2.*
