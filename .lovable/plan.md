

# PDF Idêntico à Tela + Tipografia Consistente

## Problema Raiz
O PDF **não clona** o DOM da tela — ele reconstrói HTML manualmente no offscreen div (linhas 539-631), por isso fica diferente: cores, fontes, diagramas, tudo é recriado do zero. Os diagramas SVG nem são incluídos. A tela também tem inconsistência de fontes (tabela com fonte maior que o resto).

## Solução

### 1. PDF: Clonar o DOM real em vez de reconstruir
Reescrever `handleDownloadPDF` para:
- Renderizar temporariamente TODAS as 12 seções na tela (não apenas a ativa) dentro de um container oculto
- **Clonar os elementos renderizados pelo React** (`cloneNode(true)`) para o div offscreen
- Isso garante que SVGs (diagramas), tabelas, cores, fontes — tudo é capturado exatamente como aparece
- Capturar com `html2canvas` e fatiar em páginas A4

### 2. Tipografia: 3 tamanhos únicos
Padronizar em `SectionContent` e `markdownToHtml`:
- **Título**: `text-sm font-bold` (14px) — para h2, h3, section title
- **Subtítulo**: `text-xs font-semibold` (12px) — para h4, labels
- **Corpo**: `text-xs` (12px) — tudo: parágrafos, bullets, tabelas, pontos

Ajustes específicos:
- Tabela markdown: forçar `text-xs` no `<th>` e `<td>` (hoje não tem controle de tamanho)
- `markdownToHtml`: h2 de `text-lg` → `text-sm`, h3 de `text-base` → `text-xs font-semibold`
- Remover `prose-xs` wrapper, usar classes diretas

### 3. Diagramas no PDF
Como vamos clonar o DOM real, os SVGs dos diagramas serão incluídos automaticamente. Hoje eles são ignorados porque o PDF reconstrói HTML sem os `<!-- DIAGRAM -->` markers.

## Implementação Técnica

**`handleDownloadPDF`** — nova lógica:
1. Criar container offscreen com `width: 794px`
2. Para cada seção, criar um React root temporário que renderiza `<SectionContent section={s} />` (ou clonar do DOM)
3. Alternativa mais simples: renderizar todas as seções de uma vez no detail mode em um div oculto, depois clonar com `cloneNode(true)`
4. `html2canvas` captura → fatiar → jsPDF

**`markdownToHtml`** — ajustar classes:
- h2: `text-sm font-bold` (era `text-lg`)
- h3: `text-xs font-semibold` (era `text-base`)
- th/td: adicionar `text-xs`

**`SectionContent`** — já usa `text-xs` na maioria, verificar tabela

## Arquivo
`src/pages/Resultado.tsx` — único arquivo modificado

