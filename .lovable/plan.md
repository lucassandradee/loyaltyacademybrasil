

# Filtro por Cluster + Plano de Ação (5W2H / Eisenhower)

## 1. Filtro interativo por cluster

Adicionar estado `selectedCluster` ao dashboard. Clicar em qualquer destes elementos filtra a tabela:
- **Barras** do gráfico de Distribuição por Cluster
- **Fatias** do gráfico de Composição da Base
- **Cards** dos Segmentos de Clientes

Clicar novamente no mesmo cluster (ou num botão "Limpar filtro") remove o filtro. A tabela e a paginação refletem apenas os clientes do cluster selecionado. O card/barra/fatia ativo recebe destaque visual.

## 2. Plano de Ação com abas (5W2H e Eisenhower)

Abaixo da seção "Análise da Base", adicionar uma nova seção **"Plano de Ação"** que aparece quando um cluster está selecionado. Usa o componente `Tabs` já existente com duas abas:

### Aba 5W2H
Tabela pré-preenchida com colunas: What (O quê), Why (Por quê), Where (Onde), When (Quando), Who (Quem), How (Como), How Much (Quanto custa). Conteúdo gerado automaticamente com base no cluster selecionado e nos dados do `clusterActions`.

### Aba Matriz de Eisenhower
Grid 2x2 (Urgente/Não Urgente x Importante/Não Importante) com ações recomendadas para o cluster, distribuídas nos quadrantes.

O conteúdo de ambas as abas será estático/determinístico, mapeado por cluster em `rfv-logic.ts`.

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/pages/RFVDashboard.tsx` | Estado `selectedCluster`, onClick nos gráficos/cards, filtro na tabela, seção Plano de Ação com Tabs |
| `src/lib/rfv-logic.ts` | Novo export `clusterActionPlans` com dados 5W2H e Eisenhower por cluster |

## Detalhes técnicos

- Recharts: usar `onClick` handler no `<Bar>` e `<Pie>` para capturar o cluster clicado
- Cards de segmento: `onClick` + `cursor-pointer` + borda destacada quando ativo
- Filtro da tabela: combinar `selectedCluster` com o `search` existente
- Tabs: importar `Tabs, TabsList, TabsTrigger, TabsContent` de `@/components/ui/tabs`

