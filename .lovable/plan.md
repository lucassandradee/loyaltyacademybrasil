

# Ajustes na Estrutura Visual: Remover "Resumo dos Dados" + Reordenar Elementos

## Mudanças

### 1. Remover bloco "Resumo dos Dados" do prompt e da renderização

**`supabase/functions/generate-plan/index.ts`**:
- No `BLOCO4_VISUAL`, remover toda referência ao marcador `## Resumo dos Dados`
- Reduzir de 3 para 2 marcadores: `## Contexto Teorico` (início) e `## Nossa Recomendacao` (final)
- Atualizar a ordem: Contexto Teórico → desenvolvimento com texto + diagramas + listas + tabelas → Nossa Recomendação

**`src/pages/Resultado.tsx`**:
- Remover `'resumo dos dados'` do `blockConfig` e do regex de markers
- Remover a cor amber e o ícone BarChart3 associados

### 2. Reordenar elementos no prompt para: texto → diagrama → lista → tabela → recomendação

**`supabase/functions/generate-plan/index.ts`** — `BLOCO3_CONTEUDO` e `BLOCO4_VISUAL`:
- Instruir a IA a seguir a ordem dentro do desenvolvimento:
  1. Parágrafos de análise (desenvolvimento do texto)
  2. Diagrama(s) de apoio logo após o texto
  3. Lista numerada com pontos-chave (cada item com título bold + explicação)
  4. Tabela comparativa/de métricas
  5. `## Nossa Recomendacao` como fechamento

### 3. Melhorar diagramas e listas no PDF

**`src/pages/Resultado.tsx`** — `handleDownloadPDF`:
- Os diagramas já são renderizados como tabelas no PDF via `renderDiagram` — verificar que estão aparecendo na sequência correta
- Garantir que listas numeradas (`1. **Título:** explicação`) sejam renderizadas no PDF com formatting adequado (atualmente stripped pela função `renderTextBlock` que remove `**` e converte `\d+.` para `→`)
- Ajustar `renderTextBlock` para manter os bullets/numeração e usar bold quando possível (setFont bold para trechos entre `**`)

### 4. Paridade visual tela ↔ PDF

O PDF hoje perde diagramas porque a regex de tabela pode engolir conteúdo antes do diagram marker. O sistema de chunks sequenciais já existe — verificar que não há overlap entre slices de tabela e diagram. Especificamente:
- Garantir que `cleanSlices` não pula diagrams que estejam logo após uma tabela
- Melhorar `renderTextBlock` para processar listas (linhas com `- ` ou `1. `) como items indentados com bullets em vez de texto corrido

## Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/generate-plan/index.ts` | Remover "Resumo dos Dados", reordenar regras de estrutura |
| `src/pages/Resultado.tsx` | Remover marker "resumo dos dados" do renderer + melhorar PDF lists/diagrams |

## Resultado esperado
- Cada seção: Contexto Teórico (curto) → texto analítico → diagrama → lista → tabela → Nossa Recomendação (curto)
- PDF mostra diagramas (como tabelas formatadas) e listas na mesma ordem da tela
- Visual mais limpo sem o bloco amarelo de "Resumo dos Dados"

