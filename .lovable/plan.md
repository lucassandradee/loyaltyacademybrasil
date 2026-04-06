
Objetivo: corrigir de vez a lógica de quebra de página do PDF e trocar todo o azul hardcoded pelo vermelho da marca.

1. Corrigir a regra de paginação no PDF
- Reescrever o fluxo de `handleDownloadPDF` em `src/pages/Resultado.tsx` para trabalhar com:
  - seção = sempre começa em nova página
  - bloco = nunca quebra entre páginas
- Manter a captura por blocos, mas parar de “fatiar” blocos normais em alturas arbitrárias.
- Antes de inserir cada bloco no PDF:
  - calcular a altura real dele no PDF
  - se não couber no espaço restante, abrir nova página
  - inserir o bloco inteiro na página seguinte
- Só permitir quebra quando um bloco isolado for maior que a área útil inteira da página. Nesse caso:
  - quebrar apenas esse bloco excepcionalmente
  - preferencialmente em sub-blocos lógicos, não em corte cego por pixels

2. Separar melhor os blocos para a exportação
- Em `SectionContent`, marcar explicitamente os blocos principais para o PDF:
  - contexto
  - desenvolvimento textual por trecho
  - cada diagrama
  - principais pontos
  - tabela
  - conclusão
- Isso evita capturar uma seção inteira como uma imagem grande demais e evita cortes feios no meio de conteúdo diferente.

3. Eliminar o azul hardcoded do PDF
Em `src/pages/Resultado.tsx`:
- trocar os azuis fixos do PDF:
  - barra do título da seção (`#1e40af`)
  - header/footer (`30, 64, 175`)
- usar a cor primária da marca (vermelho) em todos esses pontos, mantendo consistência com a interface.

4. Corrigir os diagramas que ainda estão azuis
Em `src/components/plan/DiagramRenderer.tsx`:
- substituir as paletas azuis fixas de:
  - `pyramidColors`
  - `funnelColors`
  - `FlowDiagram`
  - `ComparisonDiagram`
- migrar para uma paleta vermelha/bordô compatível com a identidade visual atual.
- Garantir que o PDF fique visualmente coerente com a marca, já que ele captura esses componentes reais.

5. Ajustar o visual sem repetir os erros anteriores
- Não mexer novamente nos espaçamentos globais do plano, já que você pediu para cancelar essas mudanças.
- Limitar os ajustes apenas ao necessário para:
  - paginação correta no PDF
  - cor correta no PDF/diagramas

Resultado esperado
- Seção 1 começa em uma página; seção 2 começa sempre em outra; e assim por diante
- blocos não quebram feio entre páginas
- desaparece o azul indevido do PDF
- diagramas passam a refletir a cor da marca

Detalhes técnicos
- Problema atual: o código ainda usa `sliceCanvas` quando `blockHeight > CONTENT_H_MM`, o que produz cortes ruins.
- Problema de cor: há hardcode azul em `Resultado.tsx` (header/footer/title bar) e em `DiagramRenderer.tsx`.
- Estratégia correta: paginação orientada por bloco lógico, não por fatias visuais fixas.
