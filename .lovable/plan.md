

# Evolução Completa do Módulo CX

## Resumo

Grande reformulação do módulo CX: base de dados mais inteligente com novos campos (TME, FCR, tipo_chamado, transcricao, comentario_NPS), geração de comentário analítico automático, novos gráficos, paleta azul, filtro por NPS, e gráfico temporal com filtro dia/mês/ano.

## Mudanças

### 1. Expandir modelo de dados (`cx-logic.ts`)
- Adicionar campos ao `CXTicket`: `tme_minutos` (tempo de espera), `fcr` (0 ou 1), `tipo_chamado` (Reclamação, Informação, Compra, Suporte Técnico, Cancelamento), `transcricao` (texto simulando transcrição da chamada), `comentario_nps` (texto simulando resposta do cliente à pesquisa NPS)
- Adicionar ao `CXKPIs`: `tme_medio`, `fcr_rate` (% resolvido no primeiro contato)
- Adicionar ao `CausaRaizAnalysis`: `tme_medio`, `fcr_rate`
- Criar função `generateCXSummary()` que analisa os dados e gera um texto completo cobrindo: NPS geral e distribuição, causas com pior NPS, correlação TMA×NPS, concentração de problemas, TME e impacto no NPS, taxa de FCR, tipos de chamado predominantes. Este texto será usado como input para o prompt do plano de loyalty

### 2. Base de dados mais realista (`cx-random.ts`)
- TMA: entre 1 e 8 minutos (média realista ~3-4 min)
- TME: entre 0 e 15 minutos, com correlação inversa ao NPS (TME alto = NPS mais baixo)
- NPS: influenciado pelo TME e pelo tipo de chamado (reclamações tendem a NPS menor)
- FCR: 0 ou 1, com maior chance de 1 para chamados simples (informação, compra) e menor para reclamações
- Tipo de chamado: distribuição realista (ex: 30% informação, 25% reclamação, 20% compra, 15% suporte, 10% cancelamento)
- Causa raiz: varia conforme tipo (reclamação → "Produto com defeito", "Atraso"; informação → "Dúvida sobre produto"; compra → "Compra assistida")
- Transcricao: textos curtos simulando diálogo (3-4 frases)
- Comentário NPS: frase coerente com a nota dada
- Distribuir datas em janela de 1-3 meses (últimos 90 dias)

### 3. Paleta azul nos gráficos (`CXDashboard.tsx`)
- Trocar `getGrayShade` para gerar tons de azul discreto: `hsl(215, 45%, L%)` do escuro (30%) ao claro (75%)
- Scatter: bolhas em azul `hsl(215, 45%, 45%)`

### 4. Filtro por NPS no gráfico de distribuição
- Clicar em Promotores/Neutros/Detratores no donut filtra a tabela de chamados
- Novo state `selectedNpsCategoria` que filtra por faixa de NPS (9-10, 7-8, 0-6)
- Badge de filtro ativo ao lado dos outros filtros

### 5. Comentário analítico automático
- Nova seção acima da linha de Distribuição NPS + Correlação, em card com título "Diagnóstico CX"
- Texto gerado por `generateCXSummary()` que analisa toda a base e produz um parágrafo completo
- Cobre: NPS geral, causas mais impactantes, correlação TMA×NPS, concentração, TME alto × NPS baixo, FCR, tipos de chamado
- Este texto ficará disponível para ser passado como contexto ao prompt do plano de loyalty

### 6. KPIs: trocar Causas Raiz por TME
- Remover card "Causas Raiz" dos 4 KPIs do topo
- Adicionar card "TME Médio" (tempo médio de espera) com ícone de relógio
- KPIs ficam: Total de Chamados, TMA Médio, NPS, TME Médio

### 7. Novos gráficos
- **TME por Causa Raiz**: bar chart horizontal em azul, na linha dos 3 rankings (agora 4 gráficos: Ranking, NPS, TMA, TME — ou redistribuir em 2 linhas de 2)
- **Taxa de FCR por Causa Raiz**: bar chart mostrando % de resolução no primeiro contato por causa
- **Chamados por Tipo**: bar chart ou pie mostrando distribuição por tipo_chamado
- **Volume de Chamados por Período**: line/bar chart com toggle dia/mês/ano, distribuído nos últimos 90 dias

### 8. Tabela de chamados expandida
- Adicionar colunas: TME, FCR (badge Sim/Não), Tipo
- Manter transcricao e comentario_nps acessíveis via tooltip ou expandir linha
- Exportação CSV inclui todos os novos campos

### 9. Upload: atualizar formato aceito (`CXUpload.tsx`)
- Atualizar `mapColumns` para reconhecer novas colunas (tme, fcr, tipo, transcricao, comentario_nps)
- Atualizar texto de formato esperado
- Download Excel dos dados gerados inclui todos os campos

## Detalhes técnicos

- `generateCXSummary(tickets: CXTicket[]): string` — função pura que analisa os dados e retorna texto. Lógica: calcula NPS, identifica top 3 causas por volume e por pior NPS, calcula correlação TME×NPS (agrupa por faixa de TME e mostra tendência), calcula FCR geral, identifica tipos predominantes. O texto é estruturado em parágrafos.
- O gráfico temporal usa `useMemo` para agrupar tickets por dia/mês/ano com base em `data_chamado`, com state `periodoView` controlando a granularidade.
- A correlação TME×NPS pode ser demonstrada no summary: "Chamados com TME acima de X min tiveram NPS médio de Y, contra Z para TME abaixo de X min".
- Layout dos gráficos de causa: reorganizar para 2 linhas de 2 (Ranking + NPS | TMA + TME) ou manter 1 linha com scroll horizontal. Recomendo 2×2.
- FCR por causa e Chamados por tipo podem ficar em uma nova linha antes da tabela.

