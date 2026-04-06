

# Remover "Resumo dos Dados" de vez + Reforçar ordem dos elementos

## Problema
O prompt já diz "NÃO USE Resumo dos Dados" mas a IA continua gerando porque:
1. A frase "NÃO USE o marcador Resumo dos Dados" paradoxalmente **ensina** o modelo que esse marcador existe
2. O renderer não filtra/esconde esse header — ele aparece como conteúdo normal com `##`

## Mudanças

### 1. `supabase/functions/generate-plan/index.ts`
- **Apagar TODA menção** a "Resumo dos Dados" do prompt inteiro (linhas 81 e 195) — nem "não use", nem nada. Se o modelo nunca vê o termo, não gera.
- Reforçar no LEMBRETE FINAL: "Os ÚNICOS marcadores visuais permitidos são `## Contexto Teorico` e `## Nossa Recomendacao`. Qualquer outro marcador com `##` seguido de emoji é PROIBIDO."
- Reforçar ordem explícita: texto analítico → diagrama(s) → lista numerada → tabela → `## Nossa Recomendacao`

### 2. `src/pages/Resultado.tsx` — SectionContent
- Adicionar filtro ativo: se o renderer encontrar um header `## ... Resumo dos Dados` no conteúdo, **stripá-lo silenciosamente** (remover o header e tratar o texto abaixo como conteúdo normal)
- Isso garante que mesmo que a IA desobedeça, o bloco visual colorido não aparece

### 3. Ordem visual na tela (já está correto no prompt, mas reforçar)
A ordem dentro de cada seção deve ser:
1. `## Contexto Teorico` (card com borda)
2. Texto analítico extenso (parágrafos, sub-headers)
3. Diagrama(s)
4. Lista numerada
5. Tabela
6. `## Nossa Recomendacao` (card com borda — último elemento)

## Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/generate-plan/index.ts` | Apagar toda menção a "Resumo dos Dados", reforçar que só 2 marcadores existem |
| `src/pages/Resultado.tsx` | Filtro para strip de "Resumo dos Dados" se aparecer no conteúdo |

