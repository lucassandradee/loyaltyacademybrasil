

# Corrigir Estrutura: Remover Resumo dos Dados + Ordem Correta + PDF com Diagramas

## Problemas Identificados

1. **Resumo dos Dados ainda no prompt**: O `LEMBRETE FINAL` (linha 195) ainda menciona "3 marcadores visuais (Contexto Teorico, Resumo dos Dados, Nossa Recomendacao)" — contradiz o BLOCO4 que diz para não usar. A IA fica confusa.

2. **Ordem dos elementos**: O BLOCO3 já define a ordem correta (texto → diagrama → lista → tabela → recomendação), mas o LEMBRETE FINAL contradiz isso.

3. **PDF não mostra diagramas direito**: O `renderDiagram` existe e funciona, mas o PDF processa os chunks sequencialmente e os diagramas são renderizados como tabelas genéricas com 2 colunas ("Hierarquia" / "Detalhe"). O problema real é que o resultado visual no PDF é pobre comparado à tela — precisa melhorar a apresentação dos diagramas no PDF para ficarem mais parecidos com a tela.

## Mudanças

### 1. `supabase/functions/generate-plan/index.ts`
- Corrigir LEMBRETE FINAL: trocar "3 marcadores" por "2 marcadores (Contexto Teorico e Nossa Recomendacao)"
- Remover menção a "Resumo dos Dados" do lembrete
- Reforçar a ordem: texto analítico → diagrama(s) → lista numerada → tabela → Nossa Recomendação

### 2. `src/pages/Resultado.tsx` — PDF rendering
- Melhorar `renderDiagram` para criar visuais mais ricos:
  - **Comparison**: Cards lado a lado com fundo colorido e borda
  - **Flow**: Caixas com setas entre elas
  - **Pyramid/Funnel**: Blocos com largura variável
  - **Gauge**: Indicador numérico com destaque visual
- Usar formas geométricas do jsPDF (rect, line, text) em vez de autoTable genérica para diagramas
- Garantir que o processamento sequencial de chunks não pule nenhum diagrama

### 3. `src/pages/Resultado.tsx` — SectionContent (tela)
- Sem mudanças na renderização da tela — já está correto com markers + conteúdo + diagramas inline

## Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/generate-plan/index.ts` | Corrigir LEMBRETE FINAL (remover Resumo dos Dados) |
| `src/pages/Resultado.tsx` | Melhorar renderDiagram no PDF para visual rico |

## Resultado esperado
- Prompt sem contradições — IA gera apenas 2 markers (Contexto + Recomendação)
- Ordem: texto → diagrama → lista → tabela → recomendação
- PDF com diagramas visuais ricos (cards coloridos, setas, blocos) em vez de tabelas genéricas

