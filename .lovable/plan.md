
# Ajustar PDF, espaçamento e “Principais Pontos”

## Problema real no código
Hoje o PDF não usa os diagramas reais da tela. Em `src/pages/Resultado.tsx`, o `handleDownloadPDF` ainda reconstrói o conteúdo manualmente e chama `renderDiagramAsTable()`, então:
- o diagrama vira tabela/outro formato no PDF
- o PDF nunca fica idêntico à tela
- o espaçamento do PDF segue outro layout

Na tela, os blocos também estão compactados demais:
- `SectionContent` usa `space-y-3`
- `markdownToHtml()` usa margens pequenas (`mb-1`, `mb-2`, `space-y-0.5`)
- “Principais Pontos” usa círculo pequeno demais (`w-4.5 h-4.5 text-[9px]`)

## O que vou ajustar

### 1. PDF com os diagramas reais, sem transformar em tabela
Em `src/pages/Resultado.tsx`:
- remover a estratégia de reconstruir HTML manualmente para exportação
- parar de usar `renderDiagramAsTable()` no fluxo do PDF
- criar um container oculto, em largura fixa A4, renderizado pelo React com **as mesmas seções e os mesmos componentes reais da tela**
- capturar esse DOM real com `html2canvas`
- gerar o PDF a partir dessa captura

Resultado:
- SVGs dos diagramas entram como aparecem na tela
- cores, fontes, espaçamentos e blocos ficam consistentes
- o PDF passa a ser uma cópia visual do plano

### 2. Melhorar espaçamento geral do plano
Em `SectionContent` e `markdownToHtml()`:
- aumentar o espaçamento entre os blocos principais da seção
- aumentar respiro entre títulos, parágrafos, listas e tabelas
- dar mais margem vertical antes/depois dos diagramas
- melhorar a distância entre uma linha e outra nas listas e no texto corrido

A ideia é deixar a leitura mais limpa, sem “grudar” conteúdo.

### 3. Melhorar os números de “Principais Pontos”
No bloco “Principais Pontos”:
- aumentar o círculo do número
- aumentar o número dentro dele
- alinhar melhor o texto com o marcador
- aumentar o espaçamento entre os itens

Resultado esperado:
- os 5 pontos ficam visíveis de verdade
- o número vira um marcador claro, não um detalhe perdido

## Arquivos a ajustar
- `src/pages/Resultado.tsx`
  - refatorar `handleDownloadPDF`
  - remover a conversão de diagramas em tabela no PDF
  - melhorar espaçamentos de `SectionContent`
  - aumentar os círculos de “Principais Pontos”
  - ajustar o HTML gerado por `markdownToHtml()`
- `src/components/plan/DiagramRenderer.tsx`
  - aumentar margens/respiração vertical dos diagramas para harmonizar com o restante da seção

## Resultado esperado
- PDF com diagramas reais, sem virar tabela ou “outras coisas”
- PDF visualmente muito mais fiel à tela
- seção com mais respiro entre linhas e blocos
- “Principais Pontos” com números grandes e legíveis dentro de círculos melhores
