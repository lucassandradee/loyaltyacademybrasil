

# Plataforma de Loyalty & Análise RFV — ESPM

## Visão Geral
Aplicação web educacional com dois módulos: Diagnóstico Estratégico de Loyalty e Análise de Dados RFV com parametrização dinâmica. Interface corporativa usando a identidade visual ESPM (vermelho escuro #A80030, branco, cinza escuro).

## Identidade Visual
- Logo ESPM no header de todas as páginas
- Cores primárias: vermelho ESPM (#A80030), branco, cinza escuro
- Tipografia clean e corporativa
- Layout estilo dashboard SaaS enterprise

## Módulo 1 — Diagnóstico de Loyalty

### Tela Inicial (Welcome)
- Header com logo ESPM
- Título "Diagnóstico de Loyalty: Descubra o potencial da sua base de clientes"
- Botão "Iniciar Diagnóstico"
- Visual limpo e impactante

### Questionário (6 perguntas, estilo Typeform)
- Card centralizado com barra de progresso
- Uma pergunta por tela, transição suave
- 6 perguntas conforme especificado (modelo de negócio, frequência, maturidade de dados, dados disponíveis, desafio principal, interesse em tiers)
- Navegação avançar/voltar

### Tela de Resultado
- Loading state simulado (~2-3 segundos)
- Relatório visual com 4 seções: Diagnóstico de Maturidade, Estrutura Recomendada, Foco Estratégico, Checklist de Próximos Passos
- Lógica condicional baseada nas respostas para gerar recomendações personalizadas
- Botão "Ir para Análise de Dados RFV (Módulo 2)"

## Módulo 2 — Upload, Parametrização e Dashboard RFV

### Tela de Upload
- Drag-and-drop para .csv/.xlsx
- Instruções sobre colunas obrigatórias (Nome, ID, Recência, Frequência, Valor)
- Botão "Usar Dados de Demonstração" com dataset mockado (~50 clientes)
- Parsing client-side com Papa Parse (CSV) e SheetJS (XLSX)

### Tela de Parametrização
- 3 blocos (Recência, Frequência, Valor) com inputs editáveis para definir cortes dos scores 1/2/3
- Valores default conforme especificado
- Botão "Gerar Análise Completa"
- Possibilidade de voltar e reajustar parâmetros

### Dashboard RFV (Tela Principal)
- **KPIs globais**: Total de clientes, Ticket Médio, Frequência Média
- **Gráfico de distribuição**: Barras/pizza com % por cluster (Recharts)
- **8 Cards de Cluster**: Nome, scores correspondentes, quantidade/% de clientes, plano de ação sugerido
- **Análise textual dinâmica**: Leitura automática da composição da base com recomendações
- **Tabela de dados**: Todos os clientes com R/F/V scores + cluster, paginação e busca
- Atualização em tempo real ao alterar parâmetros

## Lógica de Cálculo
- Concatenação dos scores R+F+V → mapeamento para 8 clusters conforme regras especificadas
- Recálculo instantâneo ao mudar parâmetros

## Navegação
- Header fixo com logo ESPM e navegação entre módulos
- Fluxo linear com possibilidade de ir e voltar entre telas

