

# PDF Pixel-Perfect via html2canvas + Ajustes Visuais

## 3 Mudanças

### 1. Remover wrapper da "Tabela de Resultados"
No `SectionContent`, o bloco 4 (linhas 384-391) tem um `div` com borda, ícone e label "TABELA DE RESULTADOS". Remover tudo isso — renderizar apenas o `dangerouslySetInnerHTML` da tabela diretamente, sem container extra.

### 2. Reduzir fontes do plano
No `SectionContent` e nos componentes visuais:
- Título da seção (`CardTitle`): de `text-xl` para `text-lg`
- Contexto Teórico / Conclusão: texto de `text-sm` para `text-xs`
- Labels "CONTEXTO TEÓRICO" / "CONCLUSÃO": já são `text-xs`, manter
- Desenvolvimento: de `prose-sm` para `prose-xs` (custom) ou adicionar `text-sm` override e reduzir espaçamentos
- Principais Pontos: texto de `text-sm` para `text-xs`, círculos de `w-6 h-6` para `w-5 h-5`
- H2/H3 no markdown: reduzir 1 nível (h2 de `text-lg` para `text-base`, h3 de `text-base` para `text-sm`)

### 3. PDF via html2canvas (cópia pixel-perfect)
- Instalar `html2canvas` (npm)
- Reescrever `handleDownloadPDF`:
  1. Criar um `div` offscreen (posição absoluta, fora da tela) com largura fixa de ~794px (A4)
  2. Renderizar TODAS as 12 seções sequencialmente nesse div (reutilizando `SectionContent`, `TimelineView`, `ActionPlan5W2H`)
  3. Usar `html2canvas` para capturar o div inteiro como imagem de alta resolução (scale: 2)
  4. Fatiar a imagem em páginas A4 (cada ~1123px de altura na escala 2x)
  5. Adicionar cada fatia como página no jsPDF
  6. Adicionar header/footer simples por cima de cada página
  7. Salvar o PDF
- Isso garante que o PDF é uma cópia exata do que aparece na tela — mesmas tabelas, diagramas SVG, cores, fontes, tudo

### Arquivo único
`src/pages/Resultado.tsx` — remover wrapper tabela, reduzir fontes, reescrever `handleDownloadPDF` com html2canvas

### Dependência nova
`html2canvas` — instalar via package.json

