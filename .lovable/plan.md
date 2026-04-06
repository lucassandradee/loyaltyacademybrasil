
Objetivo: corrigir a lógica do plano para que a leitura fique mais sóbria, o conteúdo principal volte a ser o foco e o PDF realmente carregue elementos visuais úteis.

1. Reorganizar o prompt da função `generate-plan`
- Manter os 3 blocos obrigatórios, mas reforçar que eles são apenas “pinceladas” curtas:
  - `Contexto Teórico`: 1 parágrafo curto no início
  - `Resumo dos Dados`: 1 parágrafo curto no meio
  - `Nossa Recomendação`: 1 parágrafo curto no fim
- Proibir explicitamente que o modelo continue o desenvolvimento dentro desses blocos.
- Exigir que o desenvolvimento principal venha fora deles, com subtítulos funcionais, listas, tabelas e elementos visuais distribuídos ao longo do texto.
- Atualizar as regras por seção para permitir mais de um elemento visual quando fizer sentido, especialmente na seção de Estrutura.
- Melhorar o modelo usado na geração para um mais estável e capaz de obedecer estrutura complexa.

2. Corrigir a renderização da tela em `src/pages/Resultado.tsx`
- Trocar a lógica atual que transforma blocos inteiros em “cards coloridos”.
- Renderizar apenas o cabeçalho/contêiner curto de cada bloco especial com destaque leve.
- O restante do desenvolvimento deve aparecer em fluxo normal, com fundo branco, sem parecer que tudo está dentro do bloco colorido.
- Reduzir a intensidade visual: borda discreta, fundo quase branco, menos saturação.
- Garantir que diagramas possam aparecer entre trechos do texto, e não sempre só no final da seção.

3. Melhorar os diagramas da tela
- Refatorar `src/components/plan/DiagramRenderer.tsx` para um visual mais editorial e menos “infantil”.
- Priorizar fundo branco, bordas suaves, paleta mais sóbria e layout com mais respiro.
- Melhorar especialmente o tipo `flow`, que hoje não representa bem estruturas como o exemplo da seção 4.
- Adicionar suporte a um layout mais próximo de “cards explicativos” para blocos como:
  - Ganhar & Trocar
  - Gamificação
  - Comunidades
  - Impacto esperado
- Permitir múltiplos diagramas por seção, se o prompt trouxer mais de um marker.

4. Corrigir a exportação de PDF
- Hoje o PDF ignora boa parte dos diagramas porque entra no fluxo de tabela e interrompe o restante.
- Reestruturar `handleDownloadPDF` para processar o conteúdo em sequência:
  - texto
  - tabela
  - diagrama
  - texto
- Isso faz o PDF respeitar a ordem real da seção.
- Remover/normalizar emojis e caracteres problemáticos antes de exportar, para evitar texto corrompido.
- Melhorar a saída dos diagramas no PDF: em vez de só virar tabela genérica, montar blocos visuais mais compreensíveis quando possível.

5. Aproveitar melhor os diagnósticos RFV, NBO e CX
- Incluir no prompt instruções mais explícitas para transformar achados dos passos 1, 2 e 3 em visualizações de apoio.
- Sempre que houver dado forte de RFV/NBO/CX, pedir que ele seja convertido em:
  - tabela comparativa
  - lista analítica
  - diagrama explicativo
  - e, quando aplicável, um quadro de impacto esperado
- Não vou puxar automaticamente os gráficos reais das outras páginas nesta etapa, porque o PDF atual é gerado via jsPDF e não reaproveita componentes React/Recharts. Primeiro vale arrumar a estrutura e a renderização; depois, se quiser, posso planejar uma segunda etapa para incorporar gráficos reais dos dashboards no plano/PDF.

Arquivos principais a ajustar
- `supabase/functions/generate-plan/index.ts`
- `src/pages/Resultado.tsx`
- `src/components/plan/DiagramRenderer.tsx`

Problemas confirmados no código atual
- O prompt ainda induz o modelo a despejar conteúdo demais dentro dos blocos visuais.
- A tela colore blocos inteiros porque o renderer agrupa todo o conteúdo após cada marcador dentro do card destacado.
- O PDF quase não mostra diagramas porque a lógica de tabela roda antes e interrompe o processamento.
- Os headers com emoji aparecem corrompidos no PDF.

Resultado esperado após a correção
- Tela com leitura limpa, fundo branco e destaques leves.
- Contexto, resumo e recomendação curtos de verdade.
- Desenvolvimento analítico extenso fora desses blocos.
- Diagramas melhores, mais úteis e posicionados como apoio do texto.
- PDF com elementos visuais reais e coerentes com a visualização da tela.
