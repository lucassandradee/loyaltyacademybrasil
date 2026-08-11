# Distribuição de Scores no Dashboard RFV

## A regra que te passaram (decifrada)

O que descreveram é exatamente o método de **percentil** que já existe no app:

1. Ordena-se a base por cada variável separadamente — recência da menor para a maior, frequência e valor da maior para a menor.
2. Escolhe-se um percentual de corte (ex.: 10% para nota 3).
3. Olha-se o cliente que cai naquela posição da lista ordenada e o **valor dele vira a nota de corte**.
4. Todo cliente melhor que esse valor recebe nota 3; o próximo corte (ex.: 50%) separa nota 2 de nota 1.

Aplicando isso na base anexa (478 clientes, cortes padrão do app: 10% / 50%):

```text
Recência    corte nota 3: até 3 dias      corte nota 2: até 88 dias
Frequência  corte nota 3: acima de 4      corte nota 2: acima de 2
Valor       corte nota 3: acima de 3.000  corte nota 2: acima de 1.000
```

Resultado real:

```text
Recência    nota 3: 50    nota 2: 189   nota 1: 239
Frequência  nota 3: 38    nota 2: 72    nota 1: 368
Valor       nota 3: 40    nota 2: 72    nota 1: 366
```

Ponto importante: o número de clientes por nota **não bate exatamente** com o percentual escolhido porque a base tem muitos valores repetidos (dezenas de clientes com frequência 1 ou 2, valor 1.000). Todos os empatados caem no mesmo lado do corte. Por isso "50%" em frequência acabou virando 77% na nota 1. Isso é esperado nesse método — quem quiser controle exato usa o modo "Valores fixos".

## O que vou construir

Um bloco novo **"Distribuição de Scores"** na aba de análise do RFV (dashboard), acima ou ao lado do gráfico de clusters, mostrando para cada critério (Recência, Frequência, Valor):

- Quantidade e % de clientes em cada nota (3, 2, 1)
- O valor de corte real usado para cada nota (ex.: "Nota 3 = até 3 dias")
- Barra horizontal proporcional colorida por nota
- Nota de rodapé explicando o efeito dos empates quando o % efetivo diverge mais de 10 pontos do % pedido

Também incluo essas contagens na exportação CSV da análise.

## Detalhes técnicos

- `src/lib/rfv-logic.ts`: nova função `computeScoreDistribution(scored, params)` retornando, por dimensão, `{ score, count, pct, cutoffLabel }`, reutilizando `computeRealCutoffs` e respeitando os dois modos (percentil e absoluto) e o `numScores` configurado.
- `src/pages/RFVDashboard.tsx`: novo card `Distribuição de Scores` usando o `params` já disponível; cores das notas seguem as do `RFVParametros` (`getScoreColor`).
- Nenhuma mudança de banco ou de lógica de cluster — só apresentação.
