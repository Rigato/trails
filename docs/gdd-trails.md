# TRAILS — Game Design Document

| | |
|---|---|
| **Versão** | 1.3 — protótipo P0–P3+ construído; decisões D1–D21 consolidadas (horizonte de previsão, entrada off-board, Y por conexão, densidade 2–3) |
| **Data** | 18–19/11/2026 |
| **Estado** | Protótipo completo (cadeia de 5 fases) — aguardando playtest de validação |
| **Fonte** | Especificação preliminar `trilhos-gameplay.md` + sessões de design + `referencias-comparativas.md` + decisões D1–D21 do planejador técnico |

> **Convenção de marcação:**
> **[FECHADO]** — decisão tomada, testável contra casos concretos.
> **[CONFIRMAR]** — recomendação do designer de jogo, pendente de aprovação.
> **[A DEFINIR]** — fronteira aberta, com pergunta-chave.

---

## 1. Visão Geral

### Elevator pitch
Trails é um quebra-cabeça de roteamento ferroviário em grade para telas de toque. Locomotivas coloridas avançam uma célula a cada ação do jogador — girar um trilho é gastar tempo — e cabe a ele alinhar desvios, pontes e cruzamentos para levar cada trem à estação da própria cor antes que o tabuleiro o destrua. Não basta conectar os pontos: é preciso conectá-los **no passo certo**.

- **Gênero:** puzzle de roteamento em grade, por turnos discretos (1 ação = 1 passo).
- **Plataforma-alvo:** **[A DEFINIR]** — candidato: mobile-first, orientação retrato no MVP. Alvo mínimo de toque: 44 pt por célula. Paisagem: pós-MVP. *Pergunta-chave: o alvo primário é smartphone, desktop ou ambos desde o início?*
- **Público:** jogadores casuais de puzzle de pensamento; sessões curtas, uma fase por pausa.
- **Engine/stack:** **[A DEFINIR]** — critérios de escolha: jogo 2D em grade, input por toque, deploy simples em mobile+desktop, pipeline de arte leve. A engine é decidida por escopo e objetivo deste jogo específico; coding é IA-driven.

### Pilares de design
1. **Tempo é ação.** O mundo só avança quando o jogador age; cada ação move todos os trens. *Teste: nenhuma mecânica avança o tempo sem input do jogador.*
2. **Rota, não trem.** O jogador nunca comanda locomotivas; só altera o estado do trilho. *Teste: todo input afeta peças, nunca trens.*
3. **O futuro próximo é legível.** A previsão mostra a janela próxima do destino de cada trem; morte dentro da janela é sempre anunciada; o além é descoberta por avanço. As únicas incertezas do jogo são a colisão e o além-do-horizonte. *Teste: toda morte foi visível dentro da janela antes de acontecer; morte remota só ocorre se o jogador não avançou para revelá-la.* **(Revisão D21 — o pilar original prometia o trajeto completo visível; o protótipo adotou horizonte finito: "morte local anunciada, remota vira descoberta".)**
4. **Margem de erro real.** Perder um trem não encerra a run; o objetivo se ajusta ao que sobrou. *Teste: toda run com ao menos um trem ativo permanece vencível.*

### Comparáveis (estudados — ver `referencias-comparativas.md` para o estudo completo)
- **Trainyard** — vizinho mecânico direto (trens coloridos → estações da cor), trilho desenhado livre e sem pressão temporal. Lições aplicadas: nível = lição; granularidade de combinações; tutorial distribuído; descoberta forçada; grade de dedo 7×7.
- **Railbound** — puzzle de trilho em grade para mobile, "quantidade limitada de algo" como núcleo. Lições aplicadas: primeira fase impossível de falhar; zero texto; hint progressivo; 1–4 vagões por nível; loops como mecânica central; **aviso de escopo: a arte consumiu mais da metade do desenvolvimento.**
- **Pipe Mania** — o avesso deste design: fluxo em tempo real com fila de peças aleatória. Confirma: tempo discreto e layout fixo eliminam pânico e sorte. Lição roubada: o cruzamento perigoso também é o bônus.
- **Mini Metro** — legibilidade minimalista; formas geométricas como segunda linguagem além da cor (resolve o requisito de daltonismo).
- **Cosmic Express** — citado como inspiração do Railbound; ainda não estudado.

---

## 2. Core Loop

### Segundo a segundo (micro)
1. Ler as previsões de trajetória de cada locomotiva (janela próxima do destino).
2. Agir: girar peça / alternar a ponta ativa do Y / passar o turno.
3. Assistir o passo resolver: entregas → moedas → colisões e descarrilamentos.
4. Ler as novas previsões. Repetir.

### Minuto a minuto (por fase)
Planejar rotas com antecedência; gerenciar **janelas de tempo** nos desvios (o Y precisa estar virado para o trem A no passo 7 e para o trem B no passo 9); usar **loops de espera** — um trem circula num anel até a janela do outro abrir; desviar de rios e montanhas; avançar para revelar destinos além do horizonte; decidir quais moedas bônus valem o desvio; decidir se um trem problemático vale ser salvo ou sacrificado; entregar todas as locomotivas ativas.

### Sessão a sessão
Protótipo P0–P3+ **construído**; a validação agora depende do **playtest** (instrumento no `plano-prototipo.md` §9). Pós-validação: progressão por mundos temáticos com blocos novos.

---

## 3. Mecânicas e Sistemas

### 3.1 Tabuleiro e células
- Grade retangular; tamanho fixo por fase, definido no layout. **[A DEFINIR]** número de colunas (teste em dispositivo) — *orientação do teste: começar em 6–8 colunas (referência de dedo: Trainyard usa 7×7); pequeno e denso > grande e raso, pois cada célula extra multiplica o custo de leitura por passo.* Pendências visuais/técnicas de shell estão fora deste documento.
- Cada célula contém: **peça móvel** | **elemento fixo** (rio, ponte, túnel, estação, montanha) | **vazio**. A entrada de locomotiva **não é mais elemento de célula** — ver §3.4 (D13).
- Layout fixo por fase. O jogador só gira peças móveis; nunca coloca, remove nem move peças. Não há editor de fases.

### 3.2 Peças móveis
| Peça | Conexões | Ação de toque |
|---|---|---|
| **Reta** | dois lados opostos | gira 90° CW |
| **Curva** | dois lados adjacentes | gira 90° CW |
| **Cruzamento** | quatro lados em dois canais retos independentes (N–S e E–W); a orientação visual não muda a função | **nenhuma — não gira; toque nulo** |
| **Y (desvio)** | talo + duas pontas (ver abaixo) | alterna: trocar ponta ativa ↔ girar 90° CW |

- **[FECHADO — D8/D9/D12-v2] O Y — desvio ferroviário bidirecional:**
  - **Fluxo:** trem entra pelo **talo** → sai pela **ponta ativa**. Trem entra por **qualquer ponta** (ativa ou inativa) → sai pelo **talo**. **Lado fechado → sem saída** (descarrilamento). Uma célula de Y comporta um trem por vez (regra geral).
  - **Controle ABAB por peça:** 1º toque **troca a ponta ativa**; 2º toque **gira 90° CW**; alterna para sempre. **O primeiro toque de cada Y é sempre "trocar ponta"**; dois Ys são independentes entre si. **[D9] Nenhum indicador da próxima ação é desenhado** — o jogador decora o ritmo.
  - **Estados:** 4 orientações (talo apontando N/E/S/W) × 2 pontas ativas = **8 estados**.
  - **Indicação visual por conexão [D12-v2]:** talo + braço ativo formam um **L contínuo em negrito**; o braço inativo fica **fino e translúcido, porém inteiro** (aceita entrada); o lado fechado fica **vazio**. O toggle faz crossfade dos braços. **Sem setas, cunhas ou triângulos** — a seta direcional mente em trilho bidirecional; a conexão é a semântica. A previsão de trajetória reflete o estado atual do Y.
- Não é possível agir em célula ocupada por um trem (giro bloqueado até a célula liberar).

### 3.3 Ações e o passo
- **Uma ação = um passo.** Cada ação válida do jogador avança **todas** as locomotivas uma célula, simultaneamente.
- **Ações válidas:** girar peça, alternar ponta ativa do Y, botão **"passar turno"** — avança um passo sem alterar o tabuleiro. Elimina a "queima-passos" (girar uma peça 4× só para fazer o tempo andar).
- **[FECHADO — D3] Toque nulo:** cruzamento (sem ação), elemento fixo ou célula vazia **não contam como ação** — o passo não avança; o feedback é um flash discreto, parametrizável e desligável.
- **[FECHADO — D4] Ação enfileirada que virou inválida** (ex.: peça ocupada quando o buffer a processa) é **descartada sem custo de passo**.
- **[FECHADO] Buffer de input:** toques durante a animação são enfileirados, não descartados. A duração da animação É o ritmo do jogo — mantida curta.
- **[FECHADO — D22] Sentido de rotação selecionável (CW/CCW):** seletor **fora do tabuleiro** — seta alternável antes de selecionar a peça — para todas as peças, não só o Y. *(Reverte a D14 «manter CW»: o designer testou o custo de 270° em primeira mão e decidiu — «essencial ter; abre oportunidades de level design»: o contragiro vira LANCE, não imposto.)* O seletor define o **sentido** do giro; o ABAB do Y alterna **qual ação** (trocar ponta ↔ girar) — ortogonais: no Y, o "girar" do ABAB usa o sentido atual do seletor. **[CONFIRMAR] Modo persistente** (não gasta ação — ferramenta, não turno) com **estado visível no HUD** (seta grande apontando o sentido ativo) para mitigar o "modo esquecido" (mesma família do ABAB/Q3). Tutorial: apresentar logo após o Y, antes da primeira fase que exige contragiro. Placement/visual exato: **[A DEFINIR]** na sessão dos três.
- Sem limite de ações por fase; sem desfazer no MVP.
- **Vigilância de playtest:** o botão "passar turno" pode reduzir a tensão temporal. Variante de fallback: removê-lo.

### 3.4 Elementos fixos (não giráveis)

**Rio [FECHADO — D15]**
- Banda reta contígua de células fixas; não recebe trilho; trem que chega **descarrila na água**, com marcador próprio na previsão.
- Cada rio tem **exatamente uma ponte**: fixa, perpendicular ao rio, sem ação do jogador. Atravessa **só no eixo perpendicular**; entrada pela lateral da ponte = **sem saída**. Uma ponte comporta um trem por vez (regra geral).
- Visual: rio inconfundível com qualquer trilho.

**Túnel [FECHADO — D18]**
- **Par simétrico de portais** (cada um aponta para o parceiro). Entrar num portal custa o passo e coloca o trem **no parceiro no passo seguinte**, **preservando a direção**; no passo seguinte, o trem sai pelo lado correspondente.
- Saída desconectada → **descarrila**. Uma célula de túnel comporta um trem.
- Visual/feel: travessia com fade em dois tempos.

**Estação**
- Tem uma cor; fica na borda ou em célula interna; não roda.
- Locomotiva da cor certa: **entregue**, sai do tabuleiro. Aceita por qualquer lado que tenha trilho conectado.
- Locomotiva de cor errada: **descarrila**.
- Máximo uma estação por cor por fase.

**Montanha [FECHADO — D17]**
- Célula intransponível; sem trilho; chegada → descarrilamento com **marcador próprio** na previsão; visual de massa/facetas, distinto de água, trilho e estação.

**Entrada de locomotiva [FECHADO — D13]**
- Os trens esperam **fora da grade**; a entrada é um **marcador de borda**, não um elemento de célula.
- A primeira célula é uma **peça de trilho comum** (qualquer peça), na borda, com direção perpendicular para dentro; entradas são distintas entre locomotivas.

### 3.5 Locomotivas
- Uma cor, uma célula; **esperam fora da grade** e entram pela borda, no ponto marcado.
- Máximo uma locomotiva **e** uma estação por cor por fase.
- **[FECHADO — D13] Partida:** todas partem juntas no **primeiro passo** (= primeira ação do jogador; com o botão "passar turno", o tempo pode andar antes do primeiro ajuste). Antes disso, o tabuleiro fica estático.
- **[FECHADO — D10] Sequência e handoff:** cadeia do protótipo: **P0 Contrato → P1 Sincronia → P2 Obstáculos → P3 Densidade → P3+ Densidade+**. Vitória → "Próxima fase"; última fase → "Jogar de novo"; fase não-vencível, derrota ou "Recomeçar" → **a mesma fase**. **Vidas e moedas pertencem à fase** e são restauradas no reset. Sem menu no MVP.

### 3.6 Resolução do passo e colisões
Ordem de resolução, após cada ação:
1. **Entregas** (trem na estação da cor certa sai do tabuleiro).
2. **Coleta de moedas bônus.**
3. **Colisões e descarrilamentos.**

- Movimento é **simultâneo**: todas as locomotivas movem no mesmo instante.
- **Colisão:** duas locomotivas ocupam a mesma célula no mesmo passo, **ou** trocam de células no mesmo passo. Ambas descarrilam.
- **Descarrila** ao chegar a: célula sem saída, célula vazia, montanha, estação de cor errada, borda do tabuleiro, água de rio sem ponte, saída de túnel desconectada.
- Trem descarrilado **sai do tabuleiro** e não retorna. A rota dos demais não é reiniciada.

### 3.7 Vidas, run, vitória e derrota
- **Run** = uma tentativa da fase. **3 vidas** (P0 sem vidas — ver abaixo; consumíveis pós-MVP podem aumentar).
- **[FECHADO — D7] Custo de vida:** cada descarrilamento independente ou **evento** de colisão custa **1 vida** — independentemente do número de trens envolvidos; **participantes de colisão não pagam descarrilamento adicional**; dois descarrilamentos que caem na **mesma célula** no mesmo passo = 1 evento de colisão = 1 vida.
- **[FECHADO — D11] Precedência no mesmo passo:** derrota por vidas **>** vitória **>** estado não-vencível — o pior resultado decide o passo.
- **Vitória dinâmica [FECHADO]:** entregar **todas as locomotivas ativas restantes**; cada trem perdido reduz o requisito. Perdas toleradas dentro do orçamento de vidas.
- **Derrota:** perder a última vida, ou desistir.
- **Detecção de fase não-vencível [FECHADO]:** `nenhuma locomotiva ativa em campo E existe locomotiva não entregue` → o jogo sugere desistir/recomeço.
- **Reiniciar = desistir:** gratuito e sempre disponível; efeito = reset da fase (vidas e moedas restaurados — D10).
- **[FECHADO — princípio] Derrota barata é design, não omissão:** o restart em 1 toque e gratuito é intencional — nas palavras do designer: «mantendo a derrota barata, o jogador vai tentando várias vezes até acertar o puzzle; acho isso bom; mantém o atrito baixo». A experimentação é o modo de jogo («xadrez consigo mesmo»); **a tensão mora no passo, não no restart**. O valor do êxito vem por **aspiração** (salvar todos + moedas + selo de perfeição), nunca por punição do erro. *(Corrige a leitura do Eixo 3 do brief-mvp2: o designer NÃO pediu "dentes" — 21/11.)*
- **[FECHADO — D1] Tutorial sem vidas:** no P0, o descarrilamento (só possível ignorando a previsão) não tem custo: o trem sai, o jogo oferece recomeço em **1 toque**. Momento **didático** — o jogador vê a morte existir sem punição.
- **Nota honesta [D7]:** em fase com 2 trens, a derrota por vidas é **inalcançável** (com duas perdas não resta trem ativo — a fase termina em não-vencível antes da terceira vida); com 3+ trens é alcançável e exercitada no conteúdo. **Implicação de design: em fases de 2 trens, vidas são decorativas — a dificuldade dessas fases mora nas rotas, não no orçamento de vidas.**
- **Atenção de design — sacrifício estratégico:** matar um trem problemático é estratégia válida; mitigação **econômica** (recompensa superlinear por trem entregue, §4). A calibração real acontece na entrada do sink.

### 3.8 Previsão de trajetória
- Traço pontilhado **na cor do trem**, do ponto atual até o primeiro ponto de parada; recalculado a cada giro, toggle e passo; reflete o Y; **atravessa o túnel** (nasce na boca de um portal, retoma no outro); para na água e na montanha com marcadores próprios.
- **[FECHADO — D21] Horizonte da previsão:** o caminho é calculado por inteiro, mas apenas as primeiras **~6 células** são visíveis (valor de tuning); o corte é **esmaecido**; **marcadores de parada só aparecem dentro da janela**. Consequência honesta: um destino a 10 células não tem marcador no primeiro quadro — conforme o trem avança, o destino entra na janela com antecedência mínima igual ao horizonte. **Contrato revisado: morte local anunciada; morte remota vira descoberta** — o jogador é responsável por avançar para ver. *Vigilâncias de design: (1) o esmaecimento precisa comunicar "continua além", senão morte remota parecerá quebra de contrato; (2) o P0 deve ensinar o horizonte — o jogador precisa perceber que a previsão tem alcance finito antes de encontrar a primeira morte remota.*
- **[FECHADO — D2] Loops:** caminho que re-entra num estado já visitado (mesma célula, mesma direção de entrada) → a previsão desenha o **anel fechado com marcador de loop**; o trem em loop permanece **ativo** (não dispara não-vencível). Loop é **ferramenta de espera e sincronização** — quebrável girando qualquer peça do anel não ocupada. *Referência: Railbound transforma loops em mecânica central.*
- **[FECHADO — V-1] Underlay:** o trilho permanece sempre visível sob a previsão; o traço usa um canal claro translúcido para a cor do trem ler sobre o trilho escuro.
- **[FECHADO — V-2] Destaques de destino:** estação de cor **errada** → **X no canto** do traço; estação **correta** → o traço termina em **anel**.
- **Ignora colisões** com outros trens — decisão consciente: caminhos são independentes; só colisões são interdependentes.
- *Referência de capricho (lição Mini Metro): a previsão é onde o jogador aprecia as consequências das próprias decisões — merece o melhor acabamento visual do jogo.*

### 3.9 Game feel e feedback
- **[FECHADO — D3–D6] Feedbacks do protótipo:**
  - Toque nulo ou giro bloqueado → **flash discreto**, parametrizável e desligável (D3).
  - Ação enfileirada que virou inválida → descartada sem passo (D4).
  - Entrega → **pulso de celebração** (D5).
  - Primeiro quadro da fase → **destaque sutil na peça do primeiro giro**, até a primeira ação válida (D6) — guia sem texto que resolve o "por onde começo?".
- Animação de passo curta; buffer de input; túnel com fade em dois tempos. **Sem áudio no MVP** [FECHADO].
- *Referência (lição Trainyard): o jogador já sente prazer ao resolver — os efeitos AMPLIFICAM o sucesso, não compram a motivação.*
- Áudio pós-MVP **[A DEFINIR]** (ver seção 5).

### 3.10 Casos de borda (resolvidos pela regra geral de movimento simultâneo)
| Caso | Resolução |
|---|---|
| Trem entra na célula que outro trem deixou no mesmo passo | Sem colisão (movimento em fileira funciona) |
| Trem entra na célula de entrega no passo em que o trem lá é entregue | Entrega resolve primeiro; célula livre; sem colisão |
| Dois trens → mesma célula do **cruzamento** no mesmo passo (canais diferentes) | Colisão — a regra geral se aplica; cruzamento **não é zona segura** [FECHADO — D19] |
| Dois trens entram no **túnel** em sentidos opostos no mesmo passo | **Trocam as células** (cada um emerge no portal do outro) → leitura de swap → colisão; 1 vida, ambos perdidos [FECHADO — D18] |
| Dois trens entram pelo Y em **pontas opostas** no mesmo passo | Colisão **na própria célula do Y** no mesmo passo (regra geral) [correção sobre a versão anterior do GDD] |
| Dois trens descarrilam na **mesma célula** no mesmo passo (ex.: mesma água) | 1 evento de colisão = **1 vida**, ambos perdidos [FECHADO — D7] |
| Dois trens no **mesmo anel fechado** (loop) | Nunca se alcançam: velocidade igual preserva a distância; colisão só na entrada do anel. Anéis são zonas de espera seguras |
| Vitória e derrota por vidas no **mesmo passo** | Derrota por vidas tem precedência (D11) |

---

## 4. Progressão e Economia

### Moedas (moeda única)
- **[FECHADO — D16] Posicionamento e coleta:** aparecem como **overlay sobre célula de trilho** (peça ou ponte) — nunca água, estação ou célula vazia; **máximo uma por célula**. Coleta por chegada, na ordem da resolução (§3.6: depois de entregas, antes de colisões), **uma única vez**; **a moeda coletada por um trem que morre no mesmo passo conta**.
- **[FECHADO — D16] No MVP o contador é burro:** só o total coletado; sem fórmula, bônus, sink ou persistência; vitória confirma cosmeticamente; derrota/desistência não persiste; reset zera.
- **[FECHADO] Direção da economia — círculo virtuoso (para o jogo final):** recompensa escala de forma **superlinear com os trens entregues**. Vitória entregando 1 trem = tecnicamente válida, de baixo mérito ("chocha"): recompensa mínima. Estímulo: mais moedas → consumíveis que ajudam nas próximas fases → o jogador se esforça para salvar mais trens.
- **[FECHADO] Ancoragem em trens entregues, não em vidas:** perder trens é o evento; vidas são só o orçamento. Uma colisão remove DOIS trens e deve custar DOIS bônus — ancorar em vidas deixaria o "combo colisão-parede" barato.
- **Posicionamento em tabuleiro [CONFIRMAR]: perto do risco** — cruzamentos, pontes, junções disputadas: o desvio corajoso paga (lição Pipe Mania).
- **Fórmulas exatas: [A DEFINIR — tuning].** *Perguntas-chave: bônus por trem linear, quadrático ou tabela por fase? Moedas de trem morto contam na base, sem bônus?*
- **Guard-rails do círculo virtuoso (pós-MVP):** (1) o círculo só fecha com **sink** — entra logo após a validação; (2) consumíveis dão **margem, nunca entregam trens**; (3) dicas progressivas (+1 segmento da solução por desistência, lição Railbound) são sink de informação, não de poder.
- Sem estrelas, ranking ou pontuação no MVP1 (validação de mecânica). **[FECHADO — MVP2, decisões do designer 21/11] Aposta por aspiração, agora com sink:**
  1. **Selo de perfeição por fase** — todos os trens + todas as moedas; **conquistado apenas em run sem consumíveis** (perfeição é run limpa).
  2. **Save entre sessões** — progresso de fases, selos e carteira persistem (16 fases exigem mais de uma sessão).
  3. **Loja rudimentar [CONFIRMAR]** com dois consumíveis, ambos custando moedas e **bloqueando o selo da fase**: **Resgate de trem** (um trem perdido volta ao ponto de espera fora da grade e entra no próximo passo; **não devolve a vida perdida** — recupera o requisito dinâmico, não o orçamento; apresentado como alternativa à desistência na detecção de não-vencível) e **Time-travel** (reverte **integralmente** o último passo: posições, peças, moedas, mortes, vidas e entregas). Preços e limite de usos por run: **[A DEFINIR — tuning]**. *Régua de preço do time-travel: desfazer a run inteira deve ser proibitivo; salvar 1 passo crítico deve ser tentador — senão o item desvaloriza a morte ou morre na loja.*
  4. **Energia** (limite de tentativas fora da run, recarregável por anúncios — padrão free-to-play): **[A DEFINIR — anotada, decisão de modelo de negócio, pós-MVP2]**. *Nota honesta: energia é o oposto da derrota barata; se um dia entrar, muda o DNA do jogo. O nome casa com a ideia futura de energia encadeada.*
  Guard-rails do §4 seguem valendo: consumíveis dão **margem, nunca solução**.

### Estrutura de fases do protótipo (construída)
**[FECHADO — D10] Cadeia de 5 fases** (critério: cada fase introduz no máximo uma novidade dominante):
| Fase | Novidade | Valida |
|---|---|---|
| **P0 — Contrato** | toque = passo, previsão, entrega (1 trem, retas e curvas) | o contrato básico de leitura do jogo |
| **P1 — Sincronia** | Y + 2 trens | sincronização temporal e colisão |
| **P2 — Obstáculos** | rio + ponte | rota forçada e desvio com custo de ação |
| **P3 — Densidade** | túnel + cruzamento, 3 trens | fluxo denso; colisões em cruzamentos e túneis |
| **P3+ — Densidade+** | 4 trens | prova de carga (Q7): onde a leitura colapsa |

- **[FECHADO na prática] Tutorial impossível de falhar** (P0): a falha não existe como custo; texto mínimo (meta: "wingdings test", lição Trainyard); tutorial **distribuído** — cada conceito se apresenta quando se torna necessário.
- **[FECHADO — D20, revisão do designer 21/11] Densidade de trens:** o jogo real começa em **3 trens e sobe** — «2 trens é muito fácil, coisa de tutorial». Padrão do jogo real = **3**; pico = **4** nas fases de dificuldade máxima; **2 trens é linguagem de tutorial**, apenas. 5+ permanece fora (exceção de mundos tardios). O aquecimento vem do **layout** (recursos disputados e janelas generosas), não de menos trens. *(Revisa o registro original: o P3+ provou 3 legível e 4 jogável — logo servem de piso e teto do desafio real.)*
- **Curva de dificuldade [CONFIRMAR]:** vales periódicos entre rampas (lição Trainyard); **combinações de blocos = elemento novo** com fases próprias; no jogo final, o último nível de um mundo apresenta a ideia mais nova, não a maior dificuldade (lição Cut the Rope).

### Geração de fases
- Especificação original: fases geradas proceduralmente por IA; layout fixo por fase; o jogador não cria nem altera fases.
- **[CONFIRMAR] Escopo:** o MVP usa **fases manuais**; o gerador entra **depois** da validação — gerador + validador temporal (solver que simula passo a passo; a solubilidade de Trails é **planejamento temporal**, não conectividade) é subprojeto para a segunda fase.
- *Nota de qualidade (lição Trainyard): fases geradas devem parecer intencionais — propósito, simetria, aparência handcrafted.*

---

## 5. Direção Temática e Estética

### Tema e tom
- Ferroviário, minimalista, foco absoluto em **legibilidade** do estado do tabuleiro. Direção estética específica **[A DEFINIR]**. *Pergunta-chave: tom lúdico-colorido ou maquete/sistema (blueprint, madeira, brinquedo)?*

### Pipeline de arte **[A DEFINIR]**
O designer descreve a visão; não produz arte. Candidatas:
1. **Asset pack 2D** (rápido, coerência garantida, menos identidade);
2. **IA generativa com guia de estilo** (identidade própria, risco de inconsistência entre peças);
3. **Minimalismo geométrico** produzido por código (zero dependência externa, máxima legibilidade, identidade "sistema/maquete").
Critério: trilho, rio, vazio e estação distinguíveis num relance — a arte serve o Pilar 3.
- **Aviso de escopo (lição Railbound):** a estética consumiu mais da metade do desenvolvimento de Railbound. Para este perfil, pipeline de arte é decisão de escopo: o minimalismo geométrico é o candidato de menor risco — e resolve a acessibilidade (lição Mini Metro).

### Acessibilidade — requisito, não enfeite
- A mecânica central é **cor**. Cada par trem/estação recebe **símbolo ou forma** além da cor, desde a primeira build. *Referência: Mini Metro usa formas geométricas como linguagem primária.*

### Áudio **[A DEFINIR — pós-MVP]**
- Feedbacks mínimos futuros: toque/giro, passo, entrega, coleta, colisão/descarrilamento. *Pergunta-chave: atmosfera ambiente ou silêncio + efeitos?*

---

## 6. Escopo e Roadmap

> Calibrado a ~7 h/semana em sessões curtas. O tempo calibra o realismo do roadmap, nunca a qualidade nem o escopo do documento.

### MVP de validação — **ESTADO: CONSTRUÍDO (18–19/11)**
Loop completo implementado: 4 peças móveis (reta, curva, Y, cruzamento), fixos (rio+ponte, túnel, estação, montanha), entradas off-board, previsão com horizonte e underlay, vidas, moedas overlay (contador burro), botão passar turno, cadeia P0→P3+ de 5 fases com handoff e reset por fase.

**Falta para validar:** **playtest** — a construção não responde Q1–Q8; jogadores respondem. Instrumento: `plano-prototipo.md` §9 (failing vs. skipping, think-aloud, checklist pós-sessão).

**Fora do MVP (pós-validação):** gerador de fases, progressão longa, mundos temáticos, paisagem, consumíveis/sink, desfazer, estrelas/ranking, semáforo, desvio fixo, formatos irregulares, trem de vagões, eventos aleatórios, combustível, clima, áudio.

**Critério de sucesso do MVP [CONFIRMAR]:** rejogar fases por vontade própria; mortes percebidas como justas — com o contrato local/remoto (D21): morte remota é descoberta, nunca surpresa instantânea; o sacrifício estratégico ocorre mas não domina; a economia-de-ação continua tensa.

**Instrumento de leitura (lição Cut the Rope):**
- *Descarrilamento repetido no MESMO lugar* = problema de **execução** (janela apertada → alargar).
- *Desistência após poucas ações* = problema de **ensino/legibilidade** (reforçar a apresentação do bloco).

### Pós-MVP (ordem proposta)
1. **Playtest → decisões de branch pendentes:** botão "passar turno" (fica/sai — Q5); ABAB sem indicador (Q3 — com o seletor de sentido D14 como variante registrada); sacrifício estratégico (Q8); morte remota no horizonte (D21 — as vigilâncias de §3.8).
2. **Sink de moedas — consumíveis e dicas** (guard-rails do §4): desfazer, criar ponte, ação durante animação, vida extra, dicas progressivas.
3. **Gerador de fases com validação temporal** (solver passo a passo; solubilidade = planejamento temporal).
4. **Atraso de partida** por locomotiva; **formatos irregulares**; **semáforo**, **desvio fixo**.
5. **Mundos temáticos**, cada um com um bloco novo.
6. **Ideias de longo prazo:** trem de vagões, energia encadeada, eventos aleatórios, outros transportes, combustível, clima/horário.

### Pendências (fronteira aberta)
1. **Playtest de validação (Q1–Q8)** — o próximo marco do projeto.
2. Fórmulas do bônus superlinear por trem entregue (tuning).
3. Número de colunas (pendências visuais/técnicas de shell em curso — fora deste documento).
4. Direção estética e pipeline de arte.
5. Plataforma-alvo primária e engine.

*Resolvidas nesta versão: caso colisão+descarrilamento simultâneo (D7 — 1 vida por evento); densidade alvo (D20 — 2–3); comportamento do tutorial (D1); entrada de trem (D13); horizonte da previsão (D21).*
