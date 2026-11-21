# Brief MVP2 para o Hefesto — «validamos as mecânicas; agora validar o desafio e a diversão»

| | |
|---|---|
| **Data** | 21/11/2026 |
| **De** | Orquestrador (a pedido do designer) |
| **Para** | Hefesto (agente de design) — pensar, questionar e devolver uma proposta para bolarmos **juntos** (designer + Hefesto + orquestrador) o plano do MVP2 |
| **Base** | Protótipo P0–P3 completo e auditado (commit `7fb5e73`; 238 testes; cadeia de 5 fases no Pages) · veredito do designer abaixo · GDD v1.2 com D1–D21 registradas (o designer devolveu as alterações) |

---

## 1. O veredito do protótipo — nas palavras do designer

> «**Respondendo à sua pergunta, se é divertido: no MVP não achei, honestamente.** Eu acho que para esse jogo ficar divertido e desafiador, como eu já havia mencionado antes, a chave é o **level design** — transformá-lo num puzzle. O level design que foi feito até agora, para teste das mecânicas e das propostas, ok, mas **não serve de desafio como um jogo em si**.»

Leitura do orquestrador (para calibrar, não substituir):
- **O que o protótipo provou:** as mecânicas funcionam, são legíveis (wingdings aprovado na prática pelo próprio designer jogando) e o motor é sólido. O contrato de leitura — 1 ação = 1 passo, previsão, morte anunciada — sustenta-se.
- **O que ele não devia provar e não provou:** que as REGRAS são divertidas. O plano-protótipo sempre disse isso — «a fase é descartável»; as fases de teste validam MECÂNICA, não CONTEÚDO.
- **O sinal positivo escondido no negativo:** os momentos que o designer próprio relatou como bons — a dinâmica de dois trens na Sincronia («ficou legal»), a armadilha da impaciência na Obstáculos — são **momentos de DESIGN de nível**, não de mecânica. O norte declarado por ele («xadrez consigo mesmo; escolhas de trade-off») está confirmado como a aposta certa; faltou investir nela. O MVP2 é esse investimento.

---

## 2. As ideias do designer para o MVP2 — estruturadas em quatro eixos

### EIXO 1 — A cadeia atual vira o TUTORIAL do jogo real
> «Podemos até manter essas fases como um tutorial, porque as plataformas exigem um tutorial. Logo que abre o jogo, o jogador já consegue jogar e ir para o tutorial.»

- A cadeia Contrato → Sincronia → Obstáculos → Densidade → Densidade+ já é um tutorial funcional (cada fase ensina blocos; legibilidade aprovada).
- **Perguntas para o Hefesto:** a cadeia de 5 fases comprime? (P0 contrato + P1 Y/sincronia + P2 rio/moedas + P3 túnel/cruzamento/densidade podem virar 3–4 estágios de tutorial mais enxutos?) O que o tutorial precisa GARANTIR que o jogador saia sabendo antes do «jogo de verdade»? Onde termina o tutorial e começa o jogo (transição de tom)?

### EIXO 2 — O jogo real começa onde o protótipo acabou: puzzle de verdade, mínimo 3 trens
> «Começar mesmo de verdade, eu acho que no mínimo três trens para ficar desafiador e o jogador ter que pensar e testar. [...] O desafio tem que ir escalando, aumentando.»

- Fundação pronta: o motor é N-trens, todos os blocos existem (Y, rio/ponte, túnel, cruzamento, montanha, moedas, vidas, `lost`), e o E19 provou que 3 trens legíveis e 4 trens no limite são construíveis.
- O jogo real = **fases de puzzle com intenção**: o designer descreveu o alvo como «xadrez consigo mesmo», com **escolhas de trade-off**: salvar um trem vs pegar moedas; salvar um pode custar outro; e a pergunta que ele mesmo abriu no P2 — **«não sei se vamos conseguir fazer com que toda fase seja viável salvando todos os trens»** (fases com perda PROJETADA como solução ótima?).
- **Perguntas para o Hefesto:** qual é a gramática de uma fase-BOA (janela + recurso disputado + escolha de rotas + sacrifício possível)? Quantas fases por «mundo» e quantos mundos no MVP2? A curva (rampa e VALES — a lição Trainyard já no GDD: rampa constante é sufocante)? A resposta 2/2-viável por fase fica aberta como espaço de design ou se decide agora? Onde o gerador de fases entra nisso (o designer sempre disse: **handcrafted com intenção primeiro**; o gerador é pós-MVP2)?

### EIXO 3 — O ERRO PRECISA DE DENTES: a economia e o custo de errar
> «Acho que **errar é muito barato** começar de novo — não tem uma penalidade que **perde coisas já conquistadas**.»

Este é o insight mais afiado do veredito. O estado atual:
- Morte → perde o trem (dinâmica reduz o requisito) e 1 vida; restart → **1 toque, tudo restaura, zero custo**. As moedas da tentativa se descartam no papel (§3.7), mas com contador burro descartar não dói. **Nada persiste entre tentativas** → sem perda → sem tensão real (a Q2 do plano-protótipo — «tensão de decisão» — não tem apostas para se apoiar).
- O GDD já desenhou os dentes e avisou: «o círculo só fecha com sink... a calibração real acontece na entrada dos consumíveis». O veredito do designer acaba de mover isso de «pós-validação» para **AGORA**.
- **A tensão honesta a resolver (Hefesto, atenção):** o GDD tem [FECHADO] que «reiniciar é gratuito e sempre disponível». O instinto do MVP2 («perder coisas já conquistadas») toca essa regra fechada. As opções não são mutuamente exclusivas:
  - **(a) Dentes econômicos, restart continua grátis:** moedas ganhas **persistem por sessão/mundo** (não por tentativa); uma run ruim descarta as da tentativa E as gastas; consumíveis comprados (o slice fino do sink: desfazer, vida extra, ponte) dão margem — perder a run custa o investimento. O restart segue livre (UX de laboratório para o «xadrez consigo mesmo»), mas o que se perde tem valor.
  - **(b) Dentes de progresso:** vidas/estrelas/moedas por MUNDO (não por fase); uma fase falida queima o orçamento do mundo; `lost` vira evento comum e temido.
  - **(c) Híbrido com escada:** tentativas baratas, run cara; ou「primeira tentativa grátis, o resto custa moedas」— pune farm, preserva exploração.
- **Perguntas para o Hefesto:** o que exatamente persiste (moedas? estrelas? vidas do mundo?) e o que se perde ao errar/reiniciar? O slice mínimo de sink para o persistence morder (2–3 consumíveis? loja entre mundos? milestone locks?) — lembrando os guard-rails do §4 do GDD: consumíveis dão **margem, nunca solução**; dicas dão informação, não poder. E: o MVP2 precisa de save entre sessões, ou a economia vive na sessão (evitando localStorage por ora)?

### EIXO 4 — Sentido de rotação: ESSENCIAL (D14 revisada pelo próprio teste do designer)
> «O sentido da rotação, conforme eu fui jogando e testando, **eu acho que é essencial ter**, porque inclusive abre mais oportunidades de level design.»

- O designer testou, sentiu a dor de 270° em primeira mão e **inverteu a D14** (manter CW) que ele mesmo havia decidido com cautela. O mecanismo candidato já registrado com as palavras dele: **«um seletor fora do board de jogo, em forma de seta, que o jogador altera antes de selecionar a peça que quer girar»** — aplicável a todas as peças, não só ao Y.
- A oportunidade de design que ele nomeou: com CCW disponível, **o giro de 270° vira LANCE, não imposto** — fases podem exigir o contragiro como solução.
- **Perguntas para o Hefesto:** o seletor é modo persistente (não gasta ação — escolha de ferramenta) — e o esquecimento do modo ativo como nova classe de erro (a mesma família do ABAB) precisa de mitigação visual? Como coexiste com o ABAB do Y (o seletor muda o SENTIDO do giro; o ABAB alterna toggle↔giro — ortogonais, confirmar)? O seletor mora onde no HUD (fora do tabuleiro, perto do «passar turno»)? E o tutorial ensina o seletor quando?

---

## 3. O que NÃO muda (as fundações que o protótipo aprovou)

1. **1 ação = 1 passo** — o coração; inegociável (auditado 4 vezes).
2. O **contrato de leitura**: previsão com horizonte D21 («morte local anunciada, remota vira descoberta» — palavras do designer), wingdings, Y por conexão, trilho sempre visível.
3. O **feel**: passo 180 ms, buffer, feedbacks mínimos, travessia do túnel em dois tempos.
4. **Vitória dinâmica** + vidas por evento + `lost` — o modelo de run.
5. A estrutura de **tutorial como dado** (PHASES) — o jogo real acopla depois do tutorial na mesma sequência.

## 4. O método no MVP2 (a proposta do orquestrador para «bolarmos juntos»)

1. **Hefesto pensa primeiro**: responde às perguntas dos quatro eixos, devolve UMA proposta de MVP2 (escopo, curva, economia, tutorial, seletor) — com as marcações do GDD ([FECHADO]/[CONFIRMAR]/[A DEFINIR]) onde decidir.
2. **Sessão dos três**: designer + Hefesto + orquestrador fecham o plano `docs/plano-implementacao-mvp2.md` (a mesma gramática dos planos anteriores: escopo imutável, épicos, critério de pronto, fora-de-escopo, decisões D numeradas).
3. **A mesma máquina executa**: subagentes por frente, validação prática por épico, commit+push no Pages — a orquestração provou o método (21 épicos, zero bugs de entrega).
4. **As sessões externas continuam válidas DURANTE o MVP2** (não o bloqueiam): o designer ainda não conseguiu rodá-las; elas continuam sendo o instrumento para (a) Q1/Q3/Q6 — contrato lendo-se sozinho com novatos (o tutorial é o instrumento perfeito, já publicado), (b) calibrar a CURVA nova (failing vs. skipping), (c) o Q7 (3→4 trens). O veredito do designer é o sinal principal; os externos afinam.

## 5. A estimativa honesta de custo por eixo (visão do orquestrador para o plano)

| Eixo | Custo de engenharia | Nota |
|---|---|---|
| E1 tutorial (reorganizar a cadeia) | baixo | dado puro (`PHASES`); talvez comprimir fases |
| E2 fases reais de puzzle (10–15?) | médio | level design de verdade é o trabalho central; o motor está pronto |
| E3 economia com dentes | **alto** | novos sistemas (persistência por sessão, carteira entre fases, consumíveis); revisita o [FECHADO] do restart; é o coração do MVP2 |
| E4 seletor de rotação | médio | input + direção no core + tuning + tutorial do controle |

O maior risco do MVP2 é o E3 — e é também a aposta central do veredito («errar é muito barato»). O plano deve tratar a economia como épico próprio, com validação cedo (o GDD: sem sink, moedas não disciplinam ninguém — com sink parcial, disciplinam logo).

---

*Prova de conceito do método, para constar: o protótipo inteiro (P0→P3, 21 épicos) respondeu às perguntas que existia para responder. A resposta negativa à diversão não é fracasso do protótipo — é o resultado dele: exposta a incerteza, tomada a direção.*
