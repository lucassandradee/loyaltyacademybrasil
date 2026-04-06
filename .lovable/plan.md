

# Corrigir Renderização, Diagramas no PDF e Qualidade do Conteúdo

## 3 Problemas Raiz

### Problema 1: Tela toda colorida
O `SectionContent` divide o conteúdo pelos 3 headers (📚, 📊, 🎯) e coloca TUDO que vem depois de cada header dentro de um card colorido. O desenvolvimento analítico extenso fica dentro do card colorido do "Contexto Teórico" porque é todo o texto até o próximo header. Resultado: tela inteira parece um bloco colorido.

**Correção**: Mudar a lógica de renderização para que apenas o primeiro parágrafo após `## 📚` e `## 🎯` fique no card colorido. Todo o resto do desenvolvimento fica em fundo branco normal. Remover o bloco `📊 Resumo dos Dados` da renderização visual (já foi removido do prompt mas o frontend ainda o trata).

### Problema 2: PDF sem diagramas
O `handleDownloadPDF` tem um bug estrutural: quando encontra tabelas markdown no conteúdo (`tableMatch`), ele faz `continue` e pula TODO o resto da seção, incluindo diagramas. O processamento de diagramas só roda se NÃO houver tabelas. Como quase toda seção tem tabela, os diagramas nunca aparecem no PDF.

**Correção**: Reescrever o processamento do PDF para iterar sequencialmente sobre o conteúdo, processando texto, tabelas e diagramas na ordem em que aparecem, sem `continue`.

### Problema 3: Conteúdo pouco visual
O prompt pede "parágrafos densos" mas não instrui a IA a estruturar o conteúdo com sub-headers funcionais, listas explicativas e blocos visuais como o exemplo do usuário (pilares com bullets, impacto esperado com setas). O modelo atual (`gemini-2.5-flash`) também é mais fraco para seguir instruções complexas de formatação.

**Correção**: 
- Trocar o modelo para `google/gemini-2.5-pro` (melhor em seguir instruções complexas)
- Adicionar ao Bloco 3 do prompt regras explícitas de formatação visual do desenvolvimento:
  - Usar `##` sub-headers para cada conceito/pilar
  - Listas com bullets explicativos sob cada sub-header
  - Blocos de "Impacto esperado" com setas (↑, ↓)
  - Nunca mais de 2 parágrafos corridos sem quebra visual
  - Exemplo concreto no prompt de como formatar (o exemplo da seção 4 que o usuário deu)

---

## Arquivos a Alterar

### 1. `supabase/functions/generate-plan/index.ts`
- Trocar modelo de `gemini-2.5-flash` para `gemini-2.5-pro`
- Reforçar no Bloco 3 (CONTEUDO) as regras de formatação visual do desenvolvimento
- Adicionar exemplo concreto de como o desenvolvimento deve ser estruturado (sub-headers + bullets + impacto)
- Manter diagramas obrigatórios e 3 blocos curtos

### 2. `src/pages/Resultado.tsx` — SectionContent
- Reformular a lógica de split: extrair apenas o 1o parágrafo após `## 📚` para o card vermelho e o 1o parágrafo após `## 🎯` para o card verde
- Todo o desenvolvimento entre eles renderiza em fundo branco normal com `parseDiagrams` + `markdownToHtml`
- Diagramas ficam inline no fluxo do texto (onde o marker aparece), não empurrados pro final

### 3. `src/pages/Resultado.tsx` — handleDownloadPDF
- Reescrever para processar o conteúdo sequencialmente:
  1. Dividir o conteúdo em segmentos (texto, tabela, diagrama) na ordem original
  2. Para cada segmento de texto: renderizar como texto formatado
  3. Para cada tabela: renderizar com autoTable
  4. Para cada diagrama: renderizar como tabela estilizada no PDF
  5. Sem `continue` — tudo é processado em sequência
- Limpar emojis dos headers antes de renderizar no PDF

### 4. `src/components/plan/DiagramRenderer.tsx`
- Melhorar visual dos diagramas: cores mais sóbrias, mais respiro, fundo branco com bordas suaves
- Melhorar `ComparisonDiagram`: fundo branco com borda colorida em vez de fundo colorido sólido
- Melhorar `FlowDiagram`: layout vertical quando há muitos itens, texto legível

---

## Resultado Esperado
- Tela: fundo branco limpo, apenas 2 cards coloridos sutis (contexto teórico e recomendação) com 1 parágrafo cada, desenvolvimento extenso e visual entre eles
- PDF: inclui tabelas E diagramas na ordem correta
- Conteúdo: estruturado com sub-headers, bullets explicativos e blocos de impacto (como o exemplo do usuário)

