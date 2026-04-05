

# Corrigir os 3 Blocos para Serem Curtos e Adicionais

## Problema
Os 3 blocos (Contexto Teórico, Resumo dos Dados, Nossa Recomendação) estão configurados no prompt como blocos extensos (mínimo 2-3 parágrafos cada), competindo com o conteúdo principal. O usuário quer que sejam **pinceladas curtas** — 1 parágrafo cada — e que o conteúdo rico (tabelas, diagramas, listas, análises profundas) continue sendo o corpo principal da seção.

## Mudança

### Arquivo: `supabase/functions/generate-plan/index.ts`

Reescrever as linhas 65-70 do prompt. Mover para o FINAL do prompt (após todas as regras existentes) e reformular assim:

**De:**
- "Mínimo 2 parágrafos" / "Mínimo 3 parágrafos" para cada bloco
- Bloco posicionado no meio do prompt, confundindo a IA sobre prioridade

**Para (no final do prompt, como regra adicional):**

> REGRA ADICIONAL — 3 PINCELADAS VISUAIS POR SEÇÃO:
> Além de todo o conteúdo rico e detalhado exigido acima, cada seção DEVE incluir estes 3 sub-headers CURTOS (máximo 1 parágrafo cada, 2-3 frases):
> 1. `## 📚 Contexto Teórico` — NO INÍCIO da seção. Uma pincelada rápida explicando por que esse tema importa em loyalty. Máximo 3 frases.
> 2. `## 📊 Resumo dos Dados` — NO MEIO da seção. Uma frase-resumo das métricas-chave dos diagnósticos consideradas. Máximo 3 frases.
> 3. `## 🎯 Nossa Recomendação` — NO FINAL da seção. Uma síntese direta da sugestão principal. Máximo 3 frases.
>
> Esses blocos são COMPLEMENTARES — o conteúdo principal da seção (tabelas, diagramas, listas, análises profundas) deve estar ENTRE eles e ser EXTENSO e DETALHADO como exigido nas regras anteriores.

### Arquivo: `src/pages/Resultado.tsx`
Sem alterações — os Cards visuais com bordas coloridas já estão implementados e funcionam.

## Resumo
- Remove "mínimo 2-3 parágrafos" dos blocos
- Adiciona "máximo 1 parágrafo, 2-3 frases" 
- Move a regra para o final do prompt para não confundir a IA
- Mantém 100% das regras de conteúdo rico (diagramas, tabelas, listas, 5W2H, cronograma)

