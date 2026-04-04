

# Parametrização RFV por Percentil

## Problema Atual
O usuário define valores absolutos (ex: "Top >= R$5.000") para cada score. Isso é problemático porque sem conhecer a distribuição dos dados, pode-se acabar com 95% da base num único score, gerando uma análise inútil.

## Solução
Trocar para **percentil**: o usuário escolhe quantos níveis de score (3, 4, 5...) e define os pontos de corte em % da base. O sistema calcula automaticamente os valores reais com base na distribuição dos dados.

## Como vai funcionar

1. O usuário escolhe o **número de scores** (padrão: 3) via um seletor
2. Os percentis são pré-preenchidos de forma uniforme (ex: 3 scores = 33.3% / 66.6% / 100%)
3. O usuário pode ajustar os percentis manualmente via inputs numéricos
4. Para cada variável (R, F, V), o sistema mostra o **valor real correspondente** ao percentil (ex: "Percentil 33.3% = R$ 1.850")
5. Ao clicar "Gerar Análise", o sistema calcula os cortes reais a partir dos percentis e classifica os clientes

## UI da Parametrização (RFVParametros.tsx)

- Seletor no topo: "Quantidade de Scores: [3] [4] [5] [+/-]"
- Para cada variável (Recência, Frequência, Valor), um card com:
  - N-1 linhas de corte de percentil (para 3 scores: 2 linhas)
  - Cada linha: input de percentil (%) + valor calculado da base exibido ao lado (read-only)
  - Ex: "Score 1: 0% a [33.3]% → até R$ 1.850 | Score 2: [33.3]% a [66.6]% → R$ 1.850–R$ 5.200 | Score 3: [66.6]% a 100% → acima de R$ 5.200"
- Nota: para Recência, menor valor = melhor (invertido). O sistema trata isso automaticamente.

## Mudanças Técnicas

### `src/lib/rfv-logic.ts`
- Novo tipo `RFVPercentileParams`: `{ numScores: number; recencia: number[]; frequencia: number[]; valor: number[] }` onde os arrays são os pontos de corte em percentil (ex: `[33.3, 66.6]` para 3 scores)
- Nova função `computePercentilesFromData(clients, percentiles)` que ordena os dados e retorna os valores reais nos percentis indicados
- Nova função `scoreByPercentile(value, cutoffs, inverted)` que atribui o score
- Adaptar `scoreClients` para aceitar o novo formato de params
- O `clusterMap` precisa suportar scores dinâmicos (3, 4, 5 etc). Para manter compatibilidade, quando `numScores = 3` o mapeamento de clusters continua igual. Para 4+ scores, o cluster será determinado pela média dos 3 scores mapeada para os 8 clusters existentes.

### `src/pages/RFVParametros.tsx`
- Substituir os 3 cards de valores absolutos por cards com inputs de percentil
- Adicionar seletor de quantidade de scores
- Calcular e exibir os valores reais correspondentes em tempo real
- Passar os cutoffs calculados (não os percentis) para o dashboard

### `src/pages/RFVDashboard.tsx`
- Recebe os dados já classificados ou os novos params percentuais
- Sem grandes mudanças na visualização

### `src/pages/NBODashboard.tsx`
- Sem mudança — usa `classifyNBO` que trabalha sobre os dados brutos (valor), não sobre os scores RFV

## Arquivos a modificar
- `src/lib/rfv-logic.ts` — novo sistema de scoring por percentil
- `src/pages/RFVParametros.tsx` — nova UI com percentis
- `src/pages/RFVDashboard.tsx` — adaptar para receber novo formato de params

