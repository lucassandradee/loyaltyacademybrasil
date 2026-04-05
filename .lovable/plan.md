

# Refatorar Prompt do Plano Estratégico + Enviar Dados Completos da Empresa

## Dois Problemas Identificados

### Problema 1: Dados da empresa não chegam na IA
O formulário de diagnóstico coleta 10 campos (modelo de negócio, segmento, ano de fundação, tamanho da base, faturamento, produtos/serviços, frequência, dados, infos disponíveis, desafio principal). Esses campos estão salvos em `diagnostic_responses.answers` na raiz do JSON, mas o código em `Resultado.tsx` só envia `diagAnswers.lab` como `labAnswers`. Os campos da empresa (`modelo`, `segmento`, `anoFundacao`, `tamanhoBase`, `faturamento`, `produtos`, `frequencia`, `dados`, `infos`, `desafio`) são ignorados.

### Problema 2: Prompt desorganizado
O prompt atual mistura regras de persona, formato JSON, conteúdo, formatação visual e os 3 blocos em um único texto corrido, causando inconsistência na saída.

---

## Mudanças

### 1. Enviar dados completos da empresa (`src/pages/Resultado.tsx`)

Na função `loadAndGenerate`, extrair os campos da empresa do `diagAnswers` e enviá-los junto:

```typescript
const diagAnswers = diagRes.data?.answers as Record<string, any> | null;
const labAnswers = diagAnswers?.lab || null;
const companyData = diagAnswers ? {
  modelo: diagAnswers.modelo,
  segmento: diagAnswers.segmento,
  anoFundacao: diagAnswers.anoFundacao,
  tamanhoBase: diagAnswers.tamanhoBase,
  faturamento: diagAnswers.faturamento,
  produtos: diagAnswers.produtos,
  frequencia: diagAnswers.frequencia,
  dados: diagAnswers.dados,
  infos: diagAnswers.infos,
  desafio: diagAnswers.desafio,
} : null;

// Enviar:
body: { profile, labAnswers, companyData, rfvSummary, nboSummary, cxSummary }
```

### 2. Receber e usar `companyData` na edge function (`supabase/functions/generate-plan/index.ts`)

Adicionar no destructuring: `const { profile, labAnswers, companyData, rfvSummary, nboSummary, cxSummary } = await req.json();`

Criar novo bloco no user prompt:
```
=== DADOS DA EMPRESA (Formulário Inicial) ===
Modelo de Negócio: {companyData.modelo}
Segmento/Indústria: {companyData.segmento}
Ano de Fundação: {companyData.anoFundacao}
Tamanho da Base: {companyData.tamanhoBase}
Faturamento Anual: {companyData.faturamento}
Frequência de Compra Ideal: {companyData.frequencia}
Gestão de Dados: {companyData.dados}
Informações Disponíveis: {companyData.infos}
Desafio Principal: {companyData.desafio}
Produtos/Serviços: {JSON.stringify(companyData.produtos)}
```

### 3. Reescrever o prompt seguindo a estrutura modular do .md

Substituir o `systemPrompt` inteiro por 5 blocos separados conforme o documento:

- **Bloco 1 (Persona):** Consultor sênior, 20+ anos, plano de 12-15 páginas, acionável e baseado em dados reais.
- **Bloco 2 (JSON):** Estrutura exata das 12 seções, resposta limpa sem code fences.
- **Bloco 3 (Conteúdo):** 4-6 parágrafos por seção, personalização citando dados, profundidade no "porquê" e "como", nunca mais de 3 parágrafos seguidos sem elemento visual.
- **Bloco 4 (Formatação visual):** Ordem exata — `## 📚 Contexto Teórico` (2-3 frases, início), desenvolvimento parte 1, `## 📊 Resumo dos Dados` (2-3 frases, meio), desenvolvimento parte 2 com tabela + lista + diagrama obrigatórios, `## 🎯 Nossa Recomendação` (2-3 frases, final).
- **Bloco 5 (Exceções por seção):** Diagramas obrigatórios por seção, formato do cronograma com `## Fase` + `**Período:**`, formato do 5W2H com tabela de 8 colunas e 10+ linhas.

O user prompt também ganha as "(Notas para a IA)" direcionando quais dados usar em quais seções:
- RFV → Segmentação, Estratégia, Maturidade
- NBO → Benefícios, Estrutura, Objetivos
- CX → Canais, Operações, Maturidade

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/generate-plan/index.ts` | Reescrever prompt (5 blocos modulares) + receber `companyData` + user prompt com notas |
| `src/pages/Resultado.tsx` | Extrair `companyData` do `diagAnswers` e enviar na chamada |

