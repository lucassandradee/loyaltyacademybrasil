

# Plano Estratégico Completo com IA — Reestruturação

## Contexto

O plano atual (`Resultado.tsx`) usa lógica estática (`diagnostic-logic.ts`) e não segue os pilares do Framework LAB. Precisamos: (1) persistir respostas do LAB corretamente, (2) adicionar diagnósticos automáticos para RFV e NBO, (3) gerar o plano via IA usando todos os inputs, (4) reestruturar a saída nos pilares corretos.

## Sobre o custo da IA

O projeto usa **Lovable AI** — um gateway integrado que já vem com uma chave API pré-configurada (`LOVABLE_API_KEY`). O custo é cobrado no seu workspace Lovable (Settings → Workspace → Usage). Cada workspace recebe um saldo mensal gratuito. Se muitos usuários acessarem, o custo escala com o número de requisições à IA. Para produção em escala, você precisaria monitorar e adicionar créditos conforme necessário.

---

## Mudanças

### 1. Corrigir persistência do Formulário LAB
- O `upsert` com `onConflict: 'user_id'` pode falhar se não houver unique constraint em `user_id` na tabela `diagnostic_responses`
- Alterar para: buscar registro existente → se existe, fazer `update`; se não, fazer `insert`
- Ao abrir o formulário, carregar respostas LAB salvas do banco (não só localStorage)

### 2. Criar funções `generateRFVSummary()` e `generateNBOSummary()`
- **`generateRFVSummary(clients: ScoredClient[]): string`** — Analisa distribuição por cluster, concentração de valor nos top clientes, recência média por segmento, clientes em risco vs campeões, ticket médio por cluster
- **`generateNBOSummary(clients: ScoredNBOClient[]): string`** — Analisa distribuição por faixa (Bronze/Prata/Ouro/Diamante), tipos de oferta mais frequentes, potencial de migração entre faixas, valor médio por faixa

### 3. Exibir Diagnóstico RFV e Diagnóstico NBO nos respectivos dashboards
- Adicionar card "Diagnóstico RFV" no topo do `RFVDashboard.tsx`
- Adicionar card "Diagnóstico NBO" no topo do `NBODashboard.tsx`
- Mesmo estilo do "Diagnóstico CX" existente

### 4. Renomear "Dashboard" para "Análise CX" na sidebar
- Em `AppSidebar.tsx`, alterar `title: 'Dashboard'` para `title: 'Análise CX'`

### 5. Criar Edge Function `generate-plan` para gerar o plano via IA
- Recebe: perfil da empresa (cadastro), respostas LAB, diagnóstico RFV, diagnóstico NBO, diagnóstico CX
- Usa Lovable AI (`LOVABLE_API_KEY`) com model `google/gemini-2.5-flash`
- Prompt estruturado solicitando exatamente os blocos:
  1. Sumário Executivo
  2. Diagnóstico de Maturidade
  3. Objetivos do Programa
  4. Estrutura do Programa
  5. Estratégia
  6. Benefícios (Tangíveis e Intangíveis)
  7. Terceirização e Segmentação
  8. Cadastro e Canais de Comunicação
  9. Operações
  10. Custo do Programa
  11. Cronograma de Implementação
  12. Plano de Ação 5W2H
- O prompt pede conteúdo extenso e detalhado (mínimo 12-15 páginas equivalentes), com análises específicas baseadas nos dados reais
- Retorna JSON estruturado com cada bloco contendo título, conteúdo (markdown), e sub-seções

### 6. Reescrever `Resultado.tsx` — Plano Estratégico gerado por IA
- Ao carregar, busca do banco: perfil, respostas LAB, dados RFV/NBO/CX
- Gera os 3 diagnósticos (RFV, NBO, CX) localmente
- Chama a edge function `generate-plan` com streaming
- Renderiza progressivamente cada bloco do plano
- Cada bloco LAB vira uma seção colapsável com conteúdo rico em markdown
- Salva o plano gerado no banco para não regenerar toda vez
- Botão "Regenerar Plano" para forçar nova geração
- Botão "Baixar PDF" mantido

### 7. Atualizar `PlanoFinal.tsx` (Visão Consolidada)
- Exibir os 3 diagnósticos textuais (RFV, NBO, CX)
- Exibir resumo do plano estratégico gerado pela IA
- Manter métricas consolidadas e export Excel

### 8. Migração de banco
- Criar tabela `generated_plans` para salvar planos gerados:
  - `id`, `user_id`, `plan_content` (jsonb), `created_at`
  - RLS: usuário só vê/edita os próprios

---

## Estrutura do plano gerado (blocos)

```text
1. Sumário Executivo
2. Diagnóstico de Maturidade
3. Objetivos do Programa (LAB: objetivos)
4. Estrutura do Programa (LAB: estruturaPrograma, tipoPrograma, plataforma)
5. Estratégia (LAB: estrategia, timeEstrategico)
6. Benefícios (LAB: beneficiosTangiveis, beneficiosIntangiveis)
7. Terceirização e Segmentação (LAB: tierizacao, segmentacao)
8. Cadastro e Canais de Comunicação (LAB: cadastro, infosCadastro, canaisComunicacao)
9. Operações (LAB: operacoes)
10. Custo do Programa (LAB: custos)
11. Cronograma de Implementação
12. Plano de Ação 5W2H
```

## Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `src/lib/rfv-logic.ts` | Adicionar `generateRFVSummary()` |
| `src/lib/nbo-logic.ts` | Adicionar `generateNBOSummary()` |
| `src/pages/RFVDashboard.tsx` | Card Diagnóstico RFV |
| `src/pages/NBODashboard.tsx` | Card Diagnóstico NBO |
| `src/pages/FormularioLAB.tsx` | Fix persistência + load do banco |
| `src/pages/Resultado.tsx` | Rewrite completo com IA |
| `src/pages/PlanoFinal.tsx` | Adicionar diagnósticos |
| `src/components/AppSidebar.tsx` | Renomear Dashboard → Análise CX |
| `supabase/functions/generate-plan/index.ts` | Nova edge function |
| Migração SQL | Tabela `generated_plans` |

