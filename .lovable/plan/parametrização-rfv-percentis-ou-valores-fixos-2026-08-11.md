# Parametrização RFV: percentis ou valores fixos

Hoje a tela de parametrização só permite definir os cortes por percentil da base. A proposta é adicionar um seletor de modo no topo da tela, com duas opções: **Percentil** (atual) e **Valores fixos** (novo).

## Como funciona o modo "Valores fixos"

- O usuário continua escolhendo a quantidade de scores (2 a 10).
- Para cada dimensão (Recência, Frequência, Valor) aparece um card com campos numéricos de corte — um campo a menos que a quantidade de scores (ex.: 3 scores = 2 cortes).
- Regras exibidas ao lado, em linguagem clara:
  - Recência (menor = melhor): "Até 30 dias → Score 3", "31 a 90 dias → Score 2", "Acima de 90 → Score 1".
  - Frequência e Valor (maior = melhor): "Acima de R$ 5.000 → Score 3" etc.
- Ao lado de cada faixa, mostramos quantos clientes da base caem nela (calculado na hora), para o usuário validar se o corte faz sentido.
- Valores iniciais sugeridos a partir da base (os mesmos cortes que os percentis padrão produzem), podendo ser editados livremente.
- Validação: cortes devem ser crescentes e numéricos; o botão de gerar análise fica desabilitado enquanto houver corte inválido.

Trocar de modo mantém a quantidade de scores e não perde o que foi digitado no outro modo durante a sessão.

## Cálculo e dashboard

Os parâmetros escolhidos (modo + cortes) passam a acompanhar a análise: o dashboard RFV usa exatamente o modo selecionado para pontuar os clientes. Nenhuma mudança nos clusters — a normalização para a escala 1-3 e o mapeamento dos 8 clusters continuam iguais.

## Detalhes técnicos

`src/lib/rfv-logic.ts`
- Novo tipo `RFVAbsoluteParams { mode: 'absolute'; numScores: number; recencia: number[]; frequencia: number[]; valor: number[] }` (cortes reais, ascendentes).
- `scoreClientsAbsolute()` reaproveitando `scoreByPercentileCutoffs()` (que já opera sobre valores reais de corte) + `normalizeScore()`.
- `scoreClients()` passa a despachar entre absoluto, percentil e o formato legado.
- `defaultAbsoluteParams(clientData, numScores)`: usa `computeRealCutoffs` com os percentis padrão para pré-preencher, arredondando para números redondos.

`src/pages/RFVParametros.tsx`
- Estado `mode: 'percentile' | 'absolute'` com um toggle (Tabs) no topo.
- Novo componente `DimensionThresholdCard` (inputs numéricos + preview de faixas e contagem de clientes), no mesmo estilo visual dos cards atuais.
- `handleSubmit` envia `params` no formato do modo ativo.

`src/pages/RFVDashboard.tsx`
- Tipo do `location.state.params` ampliado para aceitar `RFVAbsoluteParams`; o restante já funciona via `scoreClients`.
