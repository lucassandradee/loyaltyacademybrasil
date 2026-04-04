

# Dashboard RFV — Trocar Pizza por Tabela Visual de Clusters

## O que muda

1. **Remover** o gráfico de pizza "Composição da Base (%)" — ele repete a mesma informação do gráfico de barras.

2. **No lugar**, criar um card "Regras de Classificação" que mostra visualmente como cada combinação de scores R, F e V define cada cluster. Será uma tabela/grid estilizada com:
   - Cada linha = um cluster (Campeão, Fidelizado, etc.)
   - Colunas: Cluster | Combinações RFV | Descrição curta
   - Cada combinação (ex: "3-3-3") exibida como 3 badges coloridas (uma para cada score)
   - A cor do cluster na lateral (como já existe nos cluster cards)
   - Tooltip ou texto curto explicando a lógica (ex: "Recência alta, Frequência alta, Valor alto")

## Layout

```text
┌─────────────────────────┐  ┌──────────────────────────────┐
│ Distribuição por Cluster │  │ Regras de Classificação      │
│ (gráfico de barras)      │  │                              │
│                          │  │ Campeão     [3][3][3]        │
│                          │  │ Fidelizado  [2][3][3] [3][2] │
│                          │  │ ...                          │
│                          │  │ Hibernando  [1][1][1] [2][1] │
└─────────────────────────┘  └──────────────────────────────┘
```

## Arquivo a modificar

- **`src/pages/RFVDashboard.tsx`**: Remover o PieChart e substituir pelo card de regras. Os dados vêm do `clusterMap` já exportado de `rfv-logic.ts`. Agrupar as combinações por cluster e renderizar badges coloridas para cada score (verde=3, laranja=2, cinza=1).

