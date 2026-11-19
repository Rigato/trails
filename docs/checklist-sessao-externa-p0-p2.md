# Checklist de sessão externa — cadeia P0→P2 «Contrato · Sincronia · Obstáculos»

| | |
|---|---|
| **Data** | 19/11/2026 |
| **Objetivo** | O gate que falta no método: **2–3 jogadores externos** entendendo o contrato sem explicação verbal, e as três decisões de branch (ABAB, botão, sacrifício) lidas em gente que não é o designer. |
| **Base** | `plano-prototipo.md` §7 (critérios de parada) e §9 (instrumentos) · checklist manual do relatório E15 (dispositivos) · calibração do designer: **multi-replay é intencional** — 3 tentativas com reengajamento = profundidade, não falha. |
| **Onde** | `https://rigato.github.io/trails/` — aba privada no aparelho do jogador (ou o seu, cache frio). Rodar **após o fix V-4** (margem nova: o trem do tutorial aparece fora da grade). |

---

## Regras do condutor (você)

1. **Não explique NADA antes.** Só: «é um jogo de trem, toque na tela, fale em voz alta o que você acha que vai acontecer antes de cada toque». Se o jogador perguntar «como funciona?», responda «descobre aí» — o que ELE explica para si mesmo é o dado.
2. **Think-aloud o tempo todo:** a leitura mais valiosa é o jogador PREVENDO em voz alta antes de tocar. Se ele parar de falar, peça «o que você está pensando?» (sem dica de resposta).
3. **Anote em tempo real:** toques, hesitações, previsões certas/erradas, riso/xingo/silêncio de concentração, quando ele percebe cada coisa. Sem julgamento na cara.
4. **Deixe ele jogar até querer parar ou vencer a Obstáculos.** Ofereça «quer tentar de novo?» APÓS cada derrota/vitória — a resposta (e o tempo) é o dado.
5. **Depois, faça as perguntas do §9** (abaixo). Sem mostrar as soluções antes.

## O que observar, fase a fase

### P0 «Contrato» (tutorial) — Q1/Q6
- Ele toca a peça pulsando **sem que ninguém diga nada**? Quanto tempo para o primeiro toque?
- Entendeu **1 toque = 1 passo**? (sinal de falha: explicar o tempo errado — «toquei duas vezes e o trem andou uma» etc.)
- Quando a previsão mostra a morte, ele **muda de ideia antes de tocar**? (Pilar 3: morte anunciada = culpa própria?)
- Erros no MESMO lugar repetidos = execução; desistência após poucas ações = legibilidade.

### P1 «Sincronia» — Q3/Q4/Q8
- **ABAB:** quando ele erra, erra a **decisão** (queria outra rota) ou a **ação** (queria girar, trocou a ponta)? Anote CADA erro de ação — 2+ por sessão é o sinal de falha do controle.
- **Janela:** na primeira janela apertada (split ~passo 11): riu? xingou? pediu «mais um»? — o «aha» do P1.
- **Y:** ele lê a seta/canal ativo de relance? Pergunta «o que é isso aí?» é dado.
- **Sacrifício:** a situação surgiu? Ele deixou o azul morrer por escolha ou por acidente? Qual foi mais divertido para ELE?

### P2 «Obstáculos» — Q2/Q5/moedas
- **As rotas:** ele percebeu a escolha (oeste/ponte vs leste/atalho) ou achou que havia UMA resposta? Qual escolheu e por quê?
- **A espera:** precisou esperar o vermelho sair do split? Esperou **de boa** ou ficou frustrado por «não poder fazer nada»? Usou «passar turno» como planejamento ou apertou girando sem parar?
- **A armadilha da pressa** (toggle cedo mata o vermelho): caiu nela? Como reagiu — culpa própria ou da tela?
- **Moedas:** foi buscá-las? O desvio corajoso (oeste, 5 moedas) o atraiu ou ignorou o brilho? Moeda de trem morto contando — ele percebeu? importou?
- **Multi-replay:** quantas tentativas até «entender as possibilidades»? A cada derrota: reengajou rápido ou esfriou? (sua calibração: 3× com vontade = profundidade; esfriar = sinal contrário)

## Perguntas pós-sessão (§9 do plano-protótipo)

1. Quer jogar de novo? (AGORA — se a resposta não for imediata e afirmativa, anote a hesitação)
2. Como você explicaria este jogo para um amigo? (a frase correta: «girar trilho faz o trem andar; leve cada trem até a estação da cor dele»)
3. Entendeu por que perdeu/por onde o trem morreu?
4. O que foi mais tenso?
5. O botão «passar turno»: usou para planejar ou para «assistir»?
6. Se errou o Y: você queria outra coisa ou apertou errado?

## Não reportar como bug (decisões de escopo, não defeitos)

Sem moedas com fórmula/loja · sem áudio · sem menu/paisagem/save · sem montanha/túnel/cruzamento (são P3) · `lost` inalcançável com 2 trens (esperado) · sem indicador da próxima ação do Y (D9 deliberada) · a arte é protótipo — feio-e-funcional até as regras provarem divertidas.

## Consolidação

Ao fim das 2–3 sessões, traga para o orquestrador: (i) as notas por jogador; (ii) os contadores (erros de ação vs decisão do Y; tentativas até entender cada fase; uso do botão); (iii) as respostas pós-sessão; (iv) sua leitura qualitativa. Isso fecha (ou não) o gate: **Q1–Q6 com clareza + designer e externos querendo rejogar** → o protótipo respondeu; segue o sink + gerador + produção, ou reformulação das regras.
