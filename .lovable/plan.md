

# Reformulação da Análise NBO

## Resumo

8 mudanças na tela NBO: nova lógica de scoring ponderado com pirâmide, ofertas inteligentes baseadas no perfil RFV, remoção do plano de ação, e ajustes de texto/ordem.

## Mudanças

### 1. Corrigir texto do card explicativo (Passo 1, não Passo 2)
- No card azul, trocar "Passo 2 (RFV)" por "Passo 1 (RFV)"

### 2. KPI "Valor Médio (Gasto)" → "Valor monetário médio por cliente"
- Mesmo texto usado no RFV Dashboard

### 3. Nova lógica de scoring ponderado (`nbo-logic.ts`)
- Calcular pontuação: `Valor * 3 + Frequência * 2 + Recência * 1`
- Usar os scores RFV normalizados (1-3) do cliente para o cálculo
- Precisamos acessar os scores RFV (r_score, f_score, v_score) — vamos importar a função de scoring do RFV e aplicar antes do NBO
- Rankear clientes pela pontuação e distribuir: 40% Bronze (base), 30% Prata, 20% Ouro, 10% Diamante (topo)
- Atualizar `classifyNBO` para usar essa nova lógica em vez de faixas fixas de valor

### 4. Substituir gráficos por Pirâmide + Composição RFV
- Remover BarChart e PieChart
- Criar pirâmide SVG com 4 níveis (Diamante no topo, Bronze na base)
- Ao lado de cada nível da pirâmide, mostrar barras horizontais com a composição dos clusters RFV daquele nível (ex: no nível Diamante, X% são Campeões, Y% Fidelizados, etc.)
- Estilo visual similar ao desenho de referência do usuário: pirâmide à esquerda, barras segmentadas à direita acompanhando cada linha
- Clicável para filtrar

### 5. Atualizar texto explicativo do card azul
- Reescrever para explicar a lógica de scoring ponderado (peso 3 valor, 2 frequência, 1 recência) e a distribuição percentual da pirâmide (40/30/20/10)
- Remover os mini-cards de faixa fixa (Bronze = até R$500 etc.) pois agora a classificação é por percentil

### 6. Inverter ordem dos cards "Faixas de Gasto"
- Ordem: Diamante, Ouro, Prata, Bronze (do melhor ao pior)

### 7. Remover Plano de Ação
- Deletar toda a seção do Action Plan (5W2H + Eisenhower)
- Remover imports não utilizados (Tabs, Select, Checkbox, Download, XLSX, etc.)

### 8. Ofertas inteligentes baseadas no perfil RFV
- Criar função `generateSmartOffer(faixa, r_score, f_score, v_score)` que gera ofertas contextuais:
  - Diamante + frequência baixa → "Programa de pontos em dobro para incentivar retorno"
  - Diamante + recência baixa → "Campanha de reativação VIP com benefício exclusivo"
  - Bronze + frequência alta → "Upgrade de categoria com meta de gasto"
  - etc.
- Cada regra terá um nome/motivo associado
- Na tabela "Dados dos Clientes", adicionar coluna com botão/ícone que abre um popover/dialog explicando a regra usada para aquele cliente específico (qual score influenciou, por que aquela oferta)

## Arquivos modificados

- `src/lib/nbo-logic.ts` — nova lógica de scoring ponderado, ofertas inteligentes, remover faixas fixas de valor
- `src/pages/NBODashboard.tsx` — pirâmide SVG, novos textos, remoção do plano de ação, botão de explicação na tabela

## Detalhes técnicos

- A pirâmide será um SVG com 4 trapézios empilhados, cada um com a cor da faixa
- Para calcular a composição RFV por nível da pirâmide, cruzar o cluster RFV de cada cliente (precisa dos dados de scoring RFV) com a faixa NBO
- O scoring RFV será calculado junto com o NBO usando `scoreClients` de `rfv-logic.ts` para obter r_score, f_score, v_score
- A pontuação NBO = v_score*3 + f_score*2 + r_score*1 (max=18, min=6 com scores 1-3)
- O popover de explicação da oferta mostrará: faixa, scores R/F/V, regra aplicada, e a oferta gerada

