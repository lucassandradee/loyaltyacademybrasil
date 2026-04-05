

# Plano Visual do Plano Estratégico — 3 Melhorias

## Problema
1. O 5W2H não aparece no PDF e na tela é apenas texto corrido — precisa de filtros por área (RFV, NBO, CX, Estratégico) e visualização em tabela
2. Todo o plano é um bloco de texto — falta tabelas, cards visuais, destaques, ícones
3. O cronograma é textual — precisa de timeline visual

## Mudanças

### 1. Prompt da IA — Forçar estrutura visual no conteúdo
**Arquivo:** `supabase/functions/generate-plan/index.ts`
- Alterar o system prompt para que o cronograma venha como JSON estruturado dentro do markdown (fases com nome, período, marcos)
- Alterar o 5W2H para que venha como tabela markdown com colunas: Área (RFV/NBO/CX/Estratégico), O quê, Por quê, Onde, Quando, Quem, Como, Quanto
- Pedir que cada seção use sub-headers `##`, listas com bullet, **negrito** para KPIs, e tabelas markdown quando aplicável
- Adicionar instrução para o cronograma vir com campo `fase`, `periodo`, `marcos[]` em formato parsável

### 2. Renderização visual rica no Resultado.tsx
**Arquivo:** `src/pages/Resultado.tsx`

**a) Melhorar `markdownToHtml`:**
- Renderizar tabelas markdown com estilo visual (headers coloridos, linhas alternadas, bordas)
- Renderizar listas com ícones/bullets estilizados
- Detectar padrões de KPI (ex: "**NPS:** 45") e renderizar como mini-cards inline

**b) Seção Cronograma — Timeline visual:**
- Detectar a seção `cronograma` pelo `id`
- Parsear o conteúdo buscando fases (por headers `##` ou padrões)
- Renderizar como timeline vertical com linha conectora, circles coloridos por fase, cards laterais com marcos em checklist
- Fallback: se não conseguir parsear, renderiza o markdown normalmente

**c) Seção 5W2H — Tabela com filtros:**
- Detectar a seção `plano5w2h` pelo `id`
- Parsear a tabela markdown em dados estruturados
- Adicionar filtro por área: botões "Todos", "RFV", "NBO", "CX", "Estratégico"
- Renderizar como cards ou tabela estilizada com badges por área, cores por prioridade
- Cada ação mostra: badge da área, descrição, responsável, prazo

**d) Demais seções — Visual styling:**
- Cards de destaque para KPIs mencionados (detectar padrões numéricos em negrito)
- Sub-seções com ícone + header colorido
- Tabelas com estilo zebra e header azul
- Blocos de "insight" com borda lateral colorida para parágrafos que começam com termos-chave

### 3. PDF Completo com todas as seções
**Arquivo:** `src/pages/Resultado.tsx` (função `handleDownloadPDF`)
- Garantir que TODAS as 12 seções são incluídas (incluindo 5W2H)
- Para o cronograma: renderizar como tabela no PDF (Fase | Período | Marcos)
- Para o 5W2H: renderizar como tabela autoTable com colunas completas
- Detectar tabelas no markdown e renderizá-las via `autoTable` no PDF em vez de texto plano

## Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/generate-plan/index.ts` | Refinar prompt para estrutura visual |
| `src/pages/Resultado.tsx` | Timeline, tabela 5W2H com filtros, styling rico, PDF completo |

## Detalhes técnicos
- O cronograma visual usa divs com `border-l-2` como linha de timeline e `rounded-full` como nós
- O filtro do 5W2H é client-side: parseia a tabela markdown, extrai coluna "Área", filtra por state
- O PDF usa `jspdf-autotable` (já instalado) para renderizar tabelas do 5W2H e cronograma
- A detecção de tabelas no markdown usa regex para `|col1|col2|` e converte para arrays

