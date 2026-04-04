

# Melhorias na Análise NBO + Padronização de KPIs

## Resumo

6 mudanças: ampliar pirâmide, padronizar 4 KPIs nos dois dashboards, filtro por segmentação RFV na pirâmide, colunas de scores/cluster na tabela, explicação humanizada das ofertas, e nova seção de distribuição de ofertas.

## Mudanças

### 1. Pirâmide maior, composição RFV menor
- Aumentar `pyramidW` de 280 para ~400 e `pyramidH` de 320 para ~380
- Reduzir proporcionalmente a largura da área de composição RFV (barras horizontais)

### 2. Padronizar 4 KPIs (NBO + RFV)
- Ambos os dashboards passam a ter 4 cards: **Total de Clientes**, **Valor monetário médio por cliente**, **Recência Média**, **Frequência Média**
- No RFV: adicionar card de Recência Média (trocar grid de 3 para 4)
- No NBO: adicionar card de Frequência Média (trocar grid de 3 para 4)

### 3. Filtro por segmento RFV na pirâmide
- Clicar nas barras de composição RFV dentro da pirâmide filtra a tabela de clientes por aquele cluster
- Adicionar estado `selectedCluster` e combiná-lo com `selectedFaixa` no filtro

### 4. Colunas de scores e cluster RFV na tabela
- Adicionar colunas: **R**, **F**, **V** (scores individuais) e **Cluster RFV**
- O cluster já existe em `ScoredNBOClient` como `cluster`

### 5. Explicação humanizada das ofertas
- Substituir a coluna "Regra" por uma coluna "Motivo" com texto personalizado
- Gerar texto contextual tipo: "O {nome} comprou recentemente, compra frequentemente e gasta valores altos. Por isso, recomendamos uma experiência exclusiva..."
- Criar função `generateOfferExplanation(client)` em `nbo-logic.ts` que monta a frase com base nos scores e na faixa
- O popover continua existindo com detalhes técnicos (scores, regra)

### 6. Seção de distribuição de ofertas
- Nova seção após "Dados dos Clientes" mostrando agrupamento por tipo de oferta
- Tabela/cards com: texto da oferta, quantidade de clientes, percentual da base
- Agrupado por `oferta` (campo já existente no `ScoredNBOClient`)

## Arquivos modificados

- `src/lib/nbo-logic.ts` — adicionar `generateOfferExplanation()`
- `src/pages/NBODashboard.tsx` — pirâmide maior, 4 KPIs, filtro por cluster, colunas extras, motivo humanizado, seção de distribuição de ofertas
- `src/pages/RFVDashboard.tsx` — adicionar card de Recência Média (4 KPIs)

## Detalhes técnicos

- `generateOfferExplanation` analisa r_score, f_score, v_score para construir frases como "comprou há pouco tempo" (r>=2), "compra com frequência" (f>=2), "gasta valores altos" (v>=2) e conecta com a oferta sugerida
- O filtro combina `selectedFaixa` AND `selectedCluster` — ambos podem estar ativos simultaneamente
- A seção de distribuição de ofertas usa `Map<string, ScoredNBOClient[]>` agrupando por `oferta` e exibe contagem + percentual

