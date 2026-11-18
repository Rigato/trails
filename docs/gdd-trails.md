# TRAILS — Game Design Document

| | |
|---|---|
| **Nome** | **Trails** (ex-*Trilhos* — rebatizado para nome internacional) |
| **Versão** | 1.2 — rebatização Trilhos → Trails (nome internacional); design da v1.1 inalterado |
| **Data** | 18/11/2026 |
| **Estado** | Pré-protótipo — MVP de validação de regras (fases descartáveis) |
| **Fonte** | Especificação preliminar `trilhos-gameplay.md` + sessões de design + `referencias-comparativas.md` |

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
3. **O futuro é legível.** A previsão de trajetória sempre mostra onde cada trem para; a colisão é a única incerteza permitida. *Teste: todo descarrilamento era visível na previsão no passo anterior.*
4. **Margem de erro real.** Perder um trem não encerra a run; o objetivo se ajusta ao que sobrou. *Teste: toda run com ao menos um trem ativo permanece vencível.*

### Comparáveis (estudados — ver `referencias-comparativas.md` para o estudo completo)
- **Trainyard** — vizinho mecânico direto (trens coloridos → estações da cor), trilho desenhado livre e sem pressão temporal. Lições aplicadas: nível = lição; granularidade de combinações; tutorial distribuído; descoberta forçada; grade de dedo 7×7.
- **Railbound** — puzzle de trilho em grade para mobile, "quantidade limitada de algo" como núcleo. Lições aplicadas: primeira fase impossível de falhar; zero texto; hint progressivo; 1–4 vagões por nível; **aviso de escopo: a arte consumiu mais da metade do desenvolvimento.**
- **Pipe Mania** — o avesso deste design: fluxo em tempo real com fila de peças aleatória. Confirma: tempo discreto e layout fixo eliminam pânico e sorte. Lição roubada: o cruzamento perigoso também é o bônus.
- **Mini Metro** — legibilidade minimalista; formas geométricas como segunda linguagem além da cor (resolve o requisito de daltonismo).
- **Cosmic Express** — citado como inspiração do Railbound; ainda não estudado.

---

## 2. Core Loop

### Segundo a segundo (micro)
1. Ler as previsões de trajetória de cada locomotiva.
2. Agir: girar peça / alternar a ponta ativa do Y / passar o turno.
3. Assistir o passo resolver: entregas → moedas → colisões e descarrilamentos.
4. Ler as novas previsões. Repetir.

### Minuto a minuto (por fase)
Planejar rotas com antecedência; gerenciar **janelas de tempo** nos desvios (o Y precisa estar virado para o trem A no passo 7 e para o trem B no passo 9); desviar de rios e montanhas; decidir quais moedas bônus valem o desvio; decidir se um trem problemático vale ser salvo ou sacrificado; entregar todas as locomotivas ativas.

### Sessão a sessão
No MVP: validar as regras — tutorial + fases incrementais descartáveis, rejogadas até a diversão ser confirmada ou as regras reformuladas. Pós-MVP: progressão por mundos temáticos com blocos novos.

---

## 3. Mecânicas e Sistemas

### 3.1 Tabuleiro e células
- Grade retangular; tamanho fixo por fase, definido no layout. **[A DEFINIR]** número de colunas (teste em dispositivo) — *orientação do teste: começar em 6–8 colunas (referência de dedo: Trainyard usa 7×7); pequeno e denso > grande e raso, pois cada célula extra multiplica o custo de leitura por passo.*
- Cada célula contém: **peça móvel** | **elemento fixo** (rio, ponte, túnel, estação, montanha, entrada de locomotiva) | **vazio**.
- Layout fixo por fase. O jogador só gira peças móveis; nunca coloca, remove nem move peças. Não há editor de fases.

### 3.2 Peças móveis
| Peça | Conexões | Ação de toque |
|---|---|---|
| **Reta** | dois lados opostos | gira 90° CW |
| **Curva** | dois lados adjacentes | gira 90° CW |
| **Cruzamento** | quatro lados em dois canais retos independentes (N–S e E–W) | **nenhuma — não gira** |
| **Y (desvio)** | talo + duas pontas (ver abaixo) | alterna: trocar ponta ativa ↔ girar 90° CW |

- **[FECHADO] O Y é um desvio ferroviário bidirecional:**
  - **Fluxo:** trem entra pelo **talo** → sai pela **ponta ativa**. Trem entra por **qualquer ponta** (ativa ou inativa) → sai pelo **talo**. A ponta inativa aceita entrada, só não é destino de quem vem do talo.
  - **Controle:** 1º toque **troca a ponta ativa**; 2º toque **gira 90° CW**; alterna nesse padrão (ABAB).
  - **Estados:** 4 orientações (talo apontando N/E/S/W) × 2 pontas ativas = **8 estados**.
  - Uma célula de Y comporta um trem por vez (regra geral de colisão).
  - *Game feel:* a ponta ativa deve ser legível de relance (agulha desenhada alinhada ao canal ativo) — a previsão de trajetória também a reflete.
- Não é possível agir em célula ocupada por um trem (giro bloqueado até a célula liberar).

### 3.3 Ações e o passo
- **Uma ação = um passo.** Cada ação válida do jogador avança **todas** as locomotivas uma célula, simultaneamente.
- **Ações válidas:** girar peça, alternar ponta ativa do Y, **[FECHADO]** botão **"passar turno"** — avança um passo sem alterar o tabuleiro. Existe para eliminar a "queima-passos" (girar uma peça 4× para voltar ao estado original só para fazer o tempo andar).
- **[CONFIRMAR] Toque nulo:** tocar no cruzamento (peça sem ação), em elemento fixo ou em célula vazia **não** conta como ação — o passo não avança. O passo só avança por ação real (giro/alternância) ou pelo botão. *A alternativa seria o cruzamento contar como "passar turno" disfarçado — rejeitada por esconder a economia de tempo.*
- Toques durante a animação do passo: **[CONFIRMAR]** enfileirar em buffer de input (não descartar). A duração da animação É o ritmo do jogo — mantê-la curta.
- Sem limite de ações por fase; sem desfazer no MVP.
- **Trade-off a vigiar no protótipo:** o botão "passar turno" pode reduzir a tensão temporal. Variante de fallback: removê-lo e deixar o giro como única forma de adiantar o tempo.

### 3.4 Elementos fixos (não giráveis)

**Rio**
- Faixa reta horizontal ou vertical, definida pelo layout. Não recebe trilho.
- Trem que entra em célula de rio **sem ponte** descarrila.
- Cada rio tem **uma única ponte**: peça fixa, perpendicular ao rio, sem ação do jogador. Quem entra pela ponte atravessa.
- Visual: rio inconfundível com qualquer trilho; a previsão mostra o trem parando na água.

**Túnel**
- Par de células ligadas, bidirecional. O trem que entra por uma ponta **aparece na outra no passo seguinte** (atravessar custa 1 passo) e sai pela direção da ponta oposta.
- Se a célula vizinha à saída não tiver trilho conectado de volta, o trem descarrila.

**Estação**
- Tem uma cor; fica na borda ou em célula interna; não roda.
- Locomotiva da cor certa: **entregue**, sai do tabuleiro. Aceita por qualquer lado que tenha trilho conectado.
- Locomotiva de cor errada: **descarrila**.
- Máximo uma estação por cor por fase.

**Montanha**
- Célula intransponível; não recebe trilho; o trem precisa desviar.

**Entrada de locomotiva**
- Ponto marcado na borda por onde a locomotiva entra.

### 3.5 Locomotivas
- Uma cor, uma célula; entram pela borda, na entrada marcada.
- Máximo uma locomotiva **e** uma estação por cor por fase.
- **[CONFIRMAR] Partida:** todas partem juntas — os trens entram na grade no **primeiro passo** (que é a primeira ação do jogador; com o botão "passar turno", é possível fazer o tempo andar antes do primeiro ajuste). O jogador observa o tabuleiro estático antes da primeira ação. *Alternativa: partida automática no carregamento — rejeitada por violar o Pilar 1.*

### 3.6 Resolução do passo e colisões
Ordem de resolução, após cada ação:
1. **Entregas** (trem na estação da cor certa sai do tabuleiro).
2. **Coleta de moedas bônus.**
3. **Colisões e descarrilamentos.**

- Movimento é **simultâneo**: todas as locomotivas movem no mesmo instante.
- **Colisão:** duas locomotivas ocupam a mesma célula no mesmo passo, **ou** trocam de células no mesmo passo. Ambas descarrilam. Custa **uma vida por evento de colisão**, independentemente do número de trens envolvidos.
- **Descarrila** ao chegar a: célula sem saída, célula vazia, montanha, estação de cor errada, borda do tabuleiro, água de rio sem ponte, saída de túnel desconectada.
- Trem descarrilado **sai do tabuleiro** e não retorna. A rota dos demais não é reiniciada.

### 3.7 Vidas, run, vitória e derrota
- **Run** = uma tentativa da fase. Começa com **3 vidas** (consumíveis pós-MVP podem aumentar).
- Cada descarrilamento ou evento de colisão custa **1 vida**.
- **[FECHADO] Vitória:** entregar **todas as locomotivas ativas restantes**. A condição de vitória **não** exige as locomotivas iniciais: cada trem perdido reduz o requisito. Perdas são toleradas dentro do orçamento de vidas.
- **Derrota:** perder a última vida, ou desistir.
- **[FECHADO] Detecção de fase não-vencível — trivial e computável na hora:** `nenhuma locomotiva ativa em campo E existe locomotiva não entregue` → o jogo sugere desistir. (Resolvido pelo modelo dinâmico de vitória; não há necessidade de solver para isso.)
- **Reiniciar a fase** = desistir: encerra a run como derrota e **descarta as moedas da tentativa**. Reiniciar é gratuito e sempre disponível.
- **Atenção de design — sacrifício estratégico:** o modelo dinâmico torna matar um trem problemático uma estratégia válida. **[FECHADO] Mitigação escolhida: econômica** — a recompensa escala superlinearmente com os trens entregues (ver §4): vitória entregando 1 trem é tecnicamente válida, porém de recompensa mínima ("chocha"); salvar todos paga significativamente mais. Ainda assim, vigiar no protótipo: enquanto não existir sink (MVP), moedas não disciplinam ninguém — a calibração real acontece na entrada dos consumíveis.

### 3.8 Previsão de trajetória
- Traço pontilhado por locomotiva, do ponto atual até o primeiro ponto de parada: estação, borda, célula sem saída, montanha ou água sem ponte.
- Atualiza a cada passo; reflete o estado atual de cada Y (talo → ponta ativa; ponta → talo).
- **Ignora colisões** com outros trens — decisão consciente: caminhos são independentes (trens não alteram trilhos), só colisões são interdependentes. A colisão é a única incerteza do jogo (Pilar 3).
- Estação de cor errada no destino: o traço **muda de aparência** e sinaliza o problema.
- *Referência de capricho (lição Mini Metro): a previsão é onde o jogador aprecia as consequências das próprias decisões — merece o melhor acabamento visual do jogo.*

### 3.9 Game feel e feedback
- Animação de passo curta; input em buffer durante a animação.
- Feedbacks mínimos obrigatórios: giro de peça, passo, entrega, coleta de moeda, colisão/descarrilamento, aviso de fase não-vencível.
- *Referência (lição Trainyard): o jogador já sente prazer ao resolver — os efeitos devem AMPLIFICAR o momento de sucesso (entrega), não tentar comprá-lo antes.*
- Audiovisual **[A DEFINIR]** (ver seção 5).

### 3.10 Casos de borda (resolvidos pela regra geral de movimento simultâneo)
| Caso | Resolução |
|---|---|
| Trem entra na célula que outro trem deixou no mesmo passo | Sem colisão (movimento em fileira funciona) |
| Trem entra na célula de entrega no passo em que o trem lá é entregue | Entrega resolve primeiro; célula livre; sem colisão |
| Dois trens → mesma célula do **cruzamento** no mesmo passo (canais diferentes) | Colisão — a regra geral se aplica; cruzamento não é zona segura |
| Dois trens entram no **túnel** em sentidos opostos no mesmo passo | Ambos emergem na mesma célula no passo seguinte → colisão |
| Dois trens entram pelo Y em **pontas opostas** no mesmo passo | Ambos saem pelo talo → mesma célula destino → colisão |
| Dois trens descarrilam na **mesma célula** no mesmo passo (ex.: mesma água) | Colisão: 1 vida, ambos perdidos. **[CONFIRMAR]** o custo único de vida nesse caso |

---

## 4. Progressão e Economia

### Moedas (moeda única)
- Contador visível. No MVP **indicam a qualidade da vitória**; o sink (consumíveis) entra no pós-MVP imediato.
- **[FECHADO] Direção da economia — círculo virtuoso:** a recompensa escala de forma **superlinear com os trens entregues**. Vitória entregando 1 trem é tecnicamente válida, porém de baixo mérito ("chocha"): recompensa mínima. Entregar 2, 3, mais trens aumenta significativamente a recompensa. Estímulo: mais moedas → consumíveis que ajudam nas próximas fases → o jogador se esforça para salvar mais trens.
- **[FECHADO] Ancoragem em trens entregues, não em vidas:** perder trens é o evento; vidas são só o orçamento. Uma colisão remove DOIS trens e deve custar DOIS bônus — ancorar em vidas deixaria o "combo colisão-parede" (1 vida, 2 trens) barato. Ancorado em trens entregues, o custo fica correto.
- **Faucets:**
  1. **Moedas bônus** sobre células de trilho: o trem coleta ao passar; rotear até elas é opcional. *Posicionamento [CONFIRMAR]: perto do risco* — cruzamentos, pontes, junções disputadas, trechos apertados: o desvio corajoso paga (lição Pipe Mania: o cruzamento de 4 vias é o bônus).
  2. **Bônus superlinear por trem entregue.**
- **Fórmulas exatas: [A DEFINIR — tuning de protótipo].** *Perguntas-chave: bônus por trem linear, quadrático ou tabela por fase? Moedas coletadas por trem morto contam na base, sem bônus de trem?*
- Vitória: moedas coletadas na tentativa são **confirmadas** — inclusive as coletadas por trens que morreram depois.
- Derrota ou desistência: moedas da tentativa **descartadas**.
- **Guard-rails do círculo virtuoso (detalhamento no pós-MVP):**
  1. O círculo **só fecha com sink** — sem loja, moedas não disciplinam ninguém. Portanto o sink entra logo após a validação das regras, não "um dia".
  2. Consumíveis dão **margem** (vida extra, desfazer, criar ponte) e **nunca entregam trens** — comprar a solução mata o puzzle.
  3. Dicas progressivas (lição Railbound: +1 segmento da solução por desistência) são sink que dá informação, não poder.
- Sem estrelas, ranking ou pontuação no MVP.

### Estrutura de fases do MVP
Tutorial + fases incrementais descartáveis após validação das regras. **[CONFIRMAR]** distribuição (critério: cada fase introduz no máximo uma novidade dominante):
| Fase | Novidade | Valida |
|---|---|---|
| **Tutorial** | toque = passo, previsão, entrega (1 trem, retas e curvas) | o contrato básico de leitura do jogo |
| **F1** | Y + 2 trens | sincronização temporal e colisão |
| **F2** | rio + ponte | rota forçada e desvio com custo de ação |
| **F3** | túnel + cruzamento | fluxo denso, colisões em cruzamentos e túneis |

- **Tutorial [CONFIRMAR]:** primeira fase **impossível de falhar** (lição Railbound: o jogador só consegue vencer — a falha não existe ali); texto mínimo — meta de qualidade: o jogo compreensível mesmo com todo texto substituído por símbolos ("wingdings test", lição Trainyard); **tutorial distribuído** — cada conceito ganha apresentação no momento em que se torna necessário, não tudo de uma vez.
- **[CONFIRMAR] Densidade de trens:** tutorial 1 trem; fases do MVP 2–3; jogo final: **média 2–4** pós-tutorial (referência: Railbound usa 1–4 vagões por nível); 5+ apenas como exceção de design em mundos tardios. Acima disso, a leitura de previsões simultâneas em tela pequena colapsa (lição Trainyard: o limite real é a quantidade de estado que o jogador segura na cabeça).
- **Curva de dificuldade [CONFIRMAR]:** vales periódicos entre as rampas (lição Trainyard: rampa constante é sufocante; os vales revisitam mecânicas antigas); **combinações de blocos = elemento novo** com fases próprias (granularidade Trainyard: A isolado → B isolado → A+B → C isolado → A+C...); no jogo final, o último nível de um mundo apresenta a ideia mais nova, não a maior dificuldade (lição Cut the Rope).

### Geração de fases
- Especificação original: fases geradas proceduralmente por IA durante o desenvolvimento; layout fixo por fase; o jogador não cria nem altera fases.
- **[CONFIRMAR] Recomendação de escopo:** o MVP de validação usa **fases construídas à mão** (cada uma ensina uma coisa, intenção de design); o gerador por IA entra **depois** das regras provarem divertidas. Motivo: gerador + validador é um subprojeto — não é gargalo da validação de regras, e é o maior risco do roadmap se pendurado no MVP.
- *Nota de qualidade (lição Trainyard): se o gerador produzir fases, elas devem parecer intencionais — propósito por fase, simetria, aparência handcrafted; layout que parece cuspido por algoritmo se denuncia e desvaloriza o jogo.*

---

## 5. Direção Temática e Estética

### Tema e tom
- Ferroviário, minimalista, foco absoluto em **legibilidade** do estado do tabuleiro. Direção estética específica **[A DEFINIR]**. *Pergunta-chave: tom lúdico-colorido ou maquete/sistema (blueprint, madeira, brinquedo)?*

### Pipeline de arte **[A DEFINIR]**
O designer descreve a visão; não produz arte. Candidatas:
1. **Asset pack 2D** (rápido, coerência garantida, menos identidade);
2. **IA generativa com guia de estilo** (identidade própria, risco de inconsistência entre peças);
3. **Minimalismo geométrico** produzido por código (zero dependência externa, máxima legibilidade, identidade "sistema/maquete").
Critério: trilho, rio, vazio e estação precisam ser distinguíveis num relance em tela pequena — a arte serve o Pilar 3.
- **Aviso de escopo (lição Railbound):** a estética consumiu **mais da metade** do desenvolvimento de Railbound — jogo premiado pela Apple. Para este perfil, a decisão de pipeline é decisão de escopo: o minimalismo geométrico (candidata 3) é o de menor risco — e é a mesma linguagem que resolve a acessibilidade (lição Mini Metro).

### Acessibilidade — requisito, não enfeite
- A mecânica central é **cor**. Daltonismo exige um segundo canal: cada par trem/estação recebe **símbolo ou forma** além da cor, desde a primeira build. *Referência: Mini Metro usa formas geométricas como linguagem primária — a redundância vira identidade, não remendo.*

### Áudio **[A DEFINIR]**
- Feedbacks mínimos: toque/giro, passo do trem, entrega, coleta, colisão/descarrilamento. *Pergunta-chave: atmosfera ambiente (estação, trens ao longe) ou silêncio + efeitos?*

---

## 6. Escopo e Roadmap

> Calibrado a ~7 h/semana em sessões curtas. O tempo calibra o realismo do roadmap, nunca a qualidade nem o escopo do documento.

### MVP de validação (escopo)
**Dentro:**
- Loop completo: 4 peças móveis (reta, curva, Y, cruzamento), 4 elementos fixos (rio+ponte, túnel, estação, montanha), entradas, previsão de trajetória, vidas, moedas (sem sink), botão passar turno, tutorial + 3 fases.
- Fases construídas à mão, descartáveis após validação. **[CONFIRMAR]**
- Orientação retrato apenas.
- Daltonismo (símbolo/forma por cor) — por ser requisito de legibilidade, não acessório.

**Fora (pós-MVP):** gerador de fases, progressão longa, mundos temáticos, paisagem, consumíveis, desfazer, estrelas/ranking, semáforo, desvio fixo, formatos irregulares, trem de vagões, eventos aleatórios, combustível, clima.

**Critério de sucesso do MVP [CONFIRMAR]:** rejogar fases por vontade própria; mortes percebidas como justas (o Pilar 3 se sustenta na prática); o sacrifício estratégico ocorre mas não domina; a troca da pressão-tempo por economia-de-ação continua tensa.
**Instrumento de leitura (lição Cut the Rope — failing vs. skipping):**
- *Descarrilamento repetido no MESMO lugar* = o jogador entendeu a solução mas não a executa → problema de **execução**: janela temporal muito apertada → alargar.
- *Desistência após poucas ações* = o jogador não entendeu o puzzle → problema de **ensino/legibilidade**: reforçar a apresentação daquele bloco.

### Pós-MVP (ordem proposta)
1. **Sink de moedas — consumíveis e dicas.** Consumíveis: desfazer (sem custo de tempo), criar ponte, ação durante animação (salvar trem), girar peça à distância, bloquear célula, vida extra, prioridade em colisão, trem reserva. Dicas progressivas: +1 segmento da solução por desistência (lição Railbound). Guard-rails do §4 valem aqui: margem e informação, nunca solução comprada.
2. **Gerador de fases com validação temporal.** Pipeline: (i) plantar uma solução temporal válida (trilhos conectando trens→estações com passos simulados); (ii) embaralhar rotações das peças móveis; (iii) validar solubilidade com **solver que simula passo a passo** — atenção: a solubilidade de Trails é um problema de **planejamento temporal**, não de conectividade; uma configuração final conectada não garante sequência vencedora (o Y precisa estar certo no passo certo); (iv) heurísticas de dificuldade e tutorialidade.
3. **Atraso de partida** por locomotiva (ordem de entrada definida por fase).
4. **Formatos irregulares** de tabuleiro (L, cruz).
5. **Blocos novos:** semáforo (para 1 passo quando vermelho; toque alterna), desvio fixo (força saída específica).
6. **Mundos temáticos** (cidade, deserto, neve...), cada um com um bloco novo.
7. **Ideias de longo prazo:** trem de vagões (N células), energia encadeada (usina/carvão/trem elétrico), eventos aleatórios (nevasca, trem extra), outros transportes (barcos, bondes, aviões), combustível, clima/horário mudando trilhos disponíveis.

### Pendências de implementação (fronteira aberta)
1. Número de colunas do tabuleiro (teste em dispositivo — começar em 6–8).
2. Fórmula do bônus superlinear por trem entregue (tuning de protótipo).
3. Confirmar custo único de vida no caso "colisão e descarrilamento simultâneos".
4. Direção estética e pipeline de arte.
5. Plataforma-alvo primária e engine.
