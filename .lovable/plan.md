

# Adicionar 3 Blocos Visuais Obrigatórios em Cada Seção (sem substituir conteúdo existente)

## Objetivo
Manter toda a lógica atual do prompt (conteúdo extenso, tabelas, diagramas, listas) e ADICIONAR 3 blocos visuais obrigatórios em cada seção, na ordem:
1. **Contexto Teórico** — no início da seção
2. **Resumo dos Dados** — no meio
3. **Recomendação** — no final

## Mudanças

### 1. Prompt da IA — Adicionar regra dos 3 blocos
**Arquivo:** `supabase/functions/generate-plan/index.ts`

Adicionar no system prompt (sem remover nada existente) a seguinte regra:

> "ESTRUTURA OBRIGATÓRIA DE CADA SEÇÃO — O content de cada seção DEVE seguir esta ordem:
> 1. Começar com `## 📚 Contexto Teórico` — explicação didática sobre por que essa seção é importante para um programa de loyalty bem-sucedido. Inclua conceitos do mercado e boas práticas.
> 2. No meio, incluir `## 📊 Resumo dos Dados` — resumo das análises prévias (RFV, NBO, CX, respostas LAB) que foram consideradas para essa seção específica. Cite métricas e dados reais.
> 3. Terminar com `## 🎯 Nossa Recomendação` — output claro e direto com as sugestões estratégicas, incluindo racional baseado nos dados.
> 
> Entre esses 3 blocos, continue incluindo todo o conteúdo detalhado com tabelas, diagramas, listas e análises como já instruído."

Isso mantém 100% das regras atuais (diagramas, tabelas, listas, 5W2H, cronograma) e apenas adiciona estrutura.

### 2. Renderização visual dos 3 blocos
**Arquivo:** `src/pages/Resultado.tsx`

No componente `SectionContent`, antes de renderizar o markdown, detectar os 3 sub-headers especiais e envolver cada um em um Card visual distinto:

- **📚 Contexto Teórico**: Card com `border-l-4 border-l-red-400` e fundo sutil, com ícone BookOpen e label "Contexto Teórico"
- **📊 Resumo dos Dados**: Card com `border-l-4 border-l-amber-400`, ícone BarChart3 e label "Resumo dos Dados"
- **🎯 Nossa Recomendação**: Card com `border-l-4 border-l-emerald-400`, ícone Target e label "Nossa Recomendação"

Lógica: split o content por esses 3 headers, renderizar cada bloco dentro do seu Card estilizado. O conteúdo dentro de cada bloco continua passando pelo `markdownToHtml` + `parseDiagrams` existente normalmente.

Se o content não tiver esses headers (planos antigos), renderiza normalmente como fallback.

### 3. PDF — Manter os blocos visíveis
**Arquivo:** `src/pages/Resultado.tsx` (handleDownloadPDF)

No PDF, renderizar os headers dos 3 blocos com cor diferente (vermelho escuro para teórico, amber para dados, verde para recomendação) para manter a estrutura visual.

## Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/generate-plan/index.ts` | Adicionar regra dos 3 blocos no prompt (sem remover nada) |
| `src/pages/Resultado.tsx` | Detectar 3 headers e renderizar em Cards visuais coloridos |

## Detalhes técnicos
- Split usa regex: `content.split(/(?=## 📚|## 📊|## 🎯)/g)` para separar em blocos
- Cada bloco é um `div` com `border-l-4`, `bg-muted/20`, `p-4`, `rounded-r-lg`, `mb-4`
- Dentro de cada bloco, tabelas/diagramas/listas continuam funcionando normalmente via `parseDiagrams` + `markdownToHtml`
- Fallback: se nenhum dos 3 headers for encontrado, renderiza tudo como antes
- Cronograma e 5W2H mantêm seus renderers especiais (TimelineView e ActionPlan5W2H)

