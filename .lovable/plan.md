

# Diagramas, Listas e Tabelas em Todo Bloco

## Problema
As seções do plano são blocos densos de texto sem elementos visuais estruturados. O usuário quer que CADA seção tenha no minimo: 1 diagrama, 1 lista organizada e 1 tabela.

## Mudanças

### 1. Prompt da IA — Forçar estrutura visual obrigatória por seção
**Arquivo:** `supabase/functions/generate-plan/index.ts`

Adicionar regra explícita no system prompt:

> "REGRA OBRIGATÓRIA: Cada seção DEVE conter EXATAMENTE estes 3 elementos visuais:
> 1. Uma tabela markdown comparativa ou de dados (mínimo 3 linhas)
> 2. Uma lista numerada com os 3-5 pontos-chave da seção
> 3. Um bloco de diagrama no formato `<!-- DIAGRAM: tipo | item1 | item2 | item3 -->` onde tipo pode ser: pyramid, funnel, flow, comparison, gauge
>
> Tipos de diagrama por seção:
> - sumario: comparison (Situação Atual vs Proposta)
> - maturidade: gauge (nível 1-10)
> - objetivos: pyramid (prioridades)
> - estrutura: flow (fluxo do programa)
> - estrategia: funnel (jornada do cliente)
> - beneficios: comparison (tangíveis vs intangíveis)
> - segmentacao: pyramid (tiers)
> - canais: flow (jornada de comunicação)
> - operacoes: flow (fluxo operacional)
> - custos: comparison (investimento vs retorno)
> - cronograma: (já tem timeline visual)
> - plano5w2h: (já tem tabela filtrada)"

### 2. Componentes SVG de diagramas
**Novo arquivo:** `src/components/plan/DiagramRenderer.tsx`

Componentes React que renderizam SVG inline:

- **PyramidDiagram**: Trapézios empilhados (mais largo embaixo), cada nível com cor e label. Usado para hierarquias e tiers.
- **FunnelDiagram**: Retângulos decrescentes de largura. Usado para jornada do cliente e conversões.
- **FlowDiagram**: Boxes horizontais conectados por setas (→). Usado para processos e fluxos.
- **ComparisonDiagram**: Duas colunas lado a lado com ícones e métricas. Usado para versus (atual vs proposto).
- **GaugeDiagram**: Semicírculo com ponteiro indicando nível (1-10). Usado para maturidade.

Todos usam cores do design system (primary, blue, violet, emerald, amber) e são responsivos.

### 3. Parser e integração no Resultado.tsx
**Arquivo:** `src/pages/Resultado.tsx`

- No `SectionContent`, antes de renderizar o markdown, fazer um split no conteúdo buscando `<!-- DIAGRAM: ... -->`
- Para cada match, extrair tipo e itens, renderizar o componente SVG correspondente
- O restante do conteúdo continua passando pelo `markdownToHtml` existente
- Lógica: split o content em partes (texto + diagrama + texto), renderizar cada parte na ordem

Também melhorar `markdownToHtml`:
- Detectar listas numeradas (`1. ...`) e renderizar com números em círculos coloridos em vez de `<ol>` simples
- Detectar padrões `**KPI: valor**` e renderizar como mini-cards com fundo colorido

### 4. Diagramas no PDF
**Arquivo:** `src/pages/Resultado.tsx` (handleDownloadPDF)

- Para diagramas no PDF: converter em representação tabular simples (ex: pirâmide vira tabela "Nível | Descrição", flow vira tabela "Etapa | Descrição")
- Usar autoTable para cada diagrama detectado

## Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/generate-plan/index.ts` | Regra obrigatória de 3 elementos visuais por seção |
| `src/components/plan/DiagramRenderer.tsx` | Novo — 5 componentes SVG (Pyramid, Funnel, Flow, Comparison, Gauge) |
| `src/pages/Resultado.tsx` | Parser de diagramas, listas estilizadas, KPI cards, PDF com diagramas |

## Detalhes técnicos
- Diagramas são SVG puro em React, sem dependências externas
- Parser usa regex: `/<!-- DIAGRAM:\s*(pyramid|funnel|flow|comparison|gauge)\s*\|(.+?)-->/g`
- Cada SVG é ~50-80 linhas, responsivo via viewBox
- Cores mapeadas: pyramid (violet gradient), funnel (blue gradient), flow (emerald), comparison (amber/blue), gauge (primary)
- No PDF, diagramas viram tabelas autoTable com coluna "Elemento" e "Descrição"
- Fallback: se diagrama não for parseável, renderiza markdown normalmente

