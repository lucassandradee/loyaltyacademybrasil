

# Estrutura Fixa de 6 Blocos por Seção + PDF Fiel à Tela

## Problema
A estrutura atual das seções é livre — depende do que a IA gera. Não há garantia de que cada seção tenha um output concreto (tabela de resultado), nem que os 5 pontos principais estejam separados do texto corrido. O PDF também não espelha a tela.

## Nova Estrutura Obrigatória (todas as 12 seções)

```text
┌─────────────────────────────────────┐
│ 1. 📚 Contexto Teórico              │  ← 1 parágrafo curto, card vermelho
├─────────────────────────────────────┤
│ 2. Desenvolvimento do Tópico        │  ← Texto analítico livre com ##, bullets
├─────────────────────────────────────┤
│ 3. 5 Principais Pontos              │  ← Lista numerada de 1 a 5
├─────────────────────────────────────┤
│ 4. Diagrama Visual                  │  ← DIAGRAM marker (já existente)
├─────────────────────────────────────┤
│ 5. Tabela de Output                 │  ← Tabela markdown com o resultado
├─────────────────────────────────────┤
│ 6. 🎯 Conclusão                     │  ← 1 parágrafo curto, card verde
└─────────────────────────────────────┘
```

## Mudanças

### 1. Prompt — `supabase/functions/generate-plan/index.ts`

Reescrever o **Bloco 4 (Visual)** para exigir a estrutura de 6 partes com marcadores explícitos que o frontend possa parsear:

- `## 📚 Contexto Teórico` — 1 parágrafo, 2-3 frases
- Desenvolvimento livre (sub-headers ##, bullets, parágrafos)
- `## 📋 Principais Pontos` — lista numerada exata de 5 itens
- Diagrama (`<!-- DIAGRAM: ... -->`) — já funciona
- `## 📊 Tabela de Resultados` — tabela markdown com o output concreto da seção. Instruções por seção de o que a tabela deve conter:
  - sumario: Situação Atual vs Proposta
  - maturidade: Dimensões avaliadas com nota
  - objetivos: Objetivo / Métrica / Meta
  - estrutura: Mecânica / Descrição / Impacto
  - estrategia: Estratégia / Canal / KPI
  - beneficios: Benefício / Tipo / Impacto
  - segmentacao: Tier / Critério / % Base / Benefícios
  - canais: Canal / Tipo / Prioridade
  - operacoes: Processo / Responsável / Ferramenta
  - custos: Item / Investimento / Retorno
  - cronograma e plano5w2h: mantêm formato especial
- `## 🎯 Conclusão` — 1 parágrafo, 2-3 frases

### 2. Renderização na tela — `src/pages/Resultado.tsx` (SectionContent)

Refatorar o parser para identificar os 6 blocos por marcadores e renderizar cada um com estilo próprio:

1. **Contexto Teórico** — card com `border-l-4 border-red-400` (já existe, mantém)
2. **Desenvolvimento** — texto normal em fundo branco com markdown (já existe, mantém)
3. **Principais Pontos** — novo card com `border-l-4 border-blue-400`, ícone de lista, renderiza os 5 pontos com números destacados
4. **Diagrama** — já funciona via `parseDiagrams` + `DiagramRenderer`
5. **Tabela de Resultados** — novo card com `border-l-4 border-amber-400`, ícone de tabela, renderiza a tabela markdown com estilo zebrado
6. **Conclusão** — card com `border-l-4 border-emerald-400` (já existe como "Nossa Recomendação", renomear)

### 3. PDF fiel à tela — `src/pages/Resultado.tsx` (handleDownloadPDF)

Reescrever o loop de renderização do PDF para seguir a mesma lógica de 6 blocos:

1. **Contexto Teórico** — box com fundo rosa claro e borda vermelha à esquerda
2. **Desenvolvimento** — texto normal
3. **Principais Pontos** — lista numerada com fundo azul claro
4. **Diagrama** — renderizar como tabela estilizada (já funciona via `renderDiagram`)
5. **Tabela de Resultados** — `autoTable` com fundo amarelo claro no header
6. **Conclusão** — box com fundo verde claro e borda verde à esquerda

Isso garante que o PDF tenha os mesmos 6 blocos visuais da tela, com cores correspondentes.

## Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/generate-plan/index.ts` | Reescrever Bloco 4 com estrutura de 6 partes + tabela de output por seção |
| `src/pages/Resultado.tsx` | Refatorar `SectionContent` para 6 blocos + refatorar `handleDownloadPDF` para espelhar |

