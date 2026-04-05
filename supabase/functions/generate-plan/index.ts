import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profile, labAnswers, rfvSummary, nboSummary, cxSummary } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const profileContext = profile
      ? `PERFIL DA EMPRESA:
- Nome: ${profile.nome || 'N/A'}
- Empresa: ${profile.empresa || 'N/A'}
- Cargo: ${profile.cargo || 'N/A'}`
      : 'Perfil da empresa não disponível.';

    const labContext = labAnswers
      ? `RESPOSTAS DO FRAMEWORK LAB:
- Objetivos: ${JSON.stringify(labAnswers.objetivos || [])}
- Estrutura do Programa: ${labAnswers.estruturaPrograma || 'N/A'}
- Mecânicas: ${JSON.stringify(labAnswers.tipoPrograma || [])}
- Plataforma LMS: ${labAnswers.plataforma || 'N/A'}
- Estratégias: ${JSON.stringify(labAnswers.estrategia || [])}
- Time Estratégico: ${labAnswers.timeEstrategico || 'N/A'}
- Benefícios Tangíveis: ${JSON.stringify(labAnswers.beneficiosTangiveis || [])}
- Benefícios Intangíveis: ${JSON.stringify(labAnswers.beneficiosIntangiveis || [])}
- Tierização: ${labAnswers.tierizacao || 'N/A'}
- Segmentação: ${JSON.stringify(labAnswers.segmentacao || [])}
- Canais de Cadastro: ${JSON.stringify(labAnswers.cadastro || [])}
- Nível de Cadastro: ${labAnswers.infosCadastro || 'N/A'}
- Canais de Comunicação: ${JSON.stringify(labAnswers.canaisComunicacao || [])}
- Operações: ${JSON.stringify(labAnswers.operacoes || [])}
- Custos: ${JSON.stringify(labAnswers.custos || [])}`
      : 'Respostas LAB não disponíveis.';

    const systemPrompt = `Você é um consultor sênior especialista em programas de fidelidade (loyalty) com mais de 20 anos de experiência em empresas como Livelo, Smiles, Dotz e grandes varejistas. Você cria planos estratégicos completos, detalhados e acionáveis.

Seu plano deve ser EXTENSO e DETALHADO — equivalente a 12-15 páginas de relatório. Cada seção deve ter parágrafos completos com análises profundas, não apenas tópicos superficiais. Inclua exemplos reais do mercado brasileiro quando relevante.

IMPORTANTE: Responda APENAS com JSON válido, sem markdown code fences, sem texto antes ou depois. O JSON deve seguir esta estrutura EXATA:

{"sections":[{"id":"sumario","title":"1. Sumário Executivo","content":"..."},{"id":"maturidade","title":"2. Diagnóstico de Maturidade","content":"..."},{"id":"objetivos","title":"3. Objetivos do Programa","content":"..."},{"id":"estrutura","title":"4. Estrutura do Programa","content":"..."},{"id":"estrategia","title":"5. Estratégia","content":"..."},{"id":"beneficios","title":"6. Benefícios Tangíveis e Intangíveis","content":"..."},{"id":"segmentacao","title":"7. Segmentação e Tierização","content":"..."},{"id":"canais","title":"8. Cadastro e Canais de Comunicação","content":"..."},{"id":"operacoes","title":"9. Operações","content":"..."},{"id":"custos","title":"10. Custo do Programa","content":"..."},{"id":"cronograma","title":"11. Cronograma de Implementação","content":"..."},{"id":"plano5w2h","title":"12. Plano de Ação 5W2H","content":"..."}]}

REGRAS DE CONTEÚDO:
1. Cada seção deve ter no mínimo 3-4 parágrafos densos com análises específicas
2. O Sumário Executivo deve ter pelo menos 5 parágrafos resumindo todo o plano
3. O Diagnóstico de Maturidade deve analisar os dados reais (RFV, NBO, CX) e classificar o nível da empresa
4. Cada seção deve referenciar dados específicos dos diagnósticos quando relevante
5. Use linguagem profissional de consultoria estratégica
6. Inclua métricas, KPIs e benchmarks do mercado
7. Faça recomendações personalizadas com base nas respostas do LAB e nos dados

REGRAS DE FORMATAÇÃO VISUAL (MUITO IMPORTANTE):
8. Use **negrito** para destacar KPIs, métricas e números importantes (ex: "**NPS: 45 pontos**", "**Retenção: +15%**")
9. Use tabelas markdown SEMPRE QUE POSSÍVEL para comparações, métricas, custos — nunca listas quando uma tabela seria mais clara
10. Cada seção DEVE usar sub-headers com ## para organizar o conteúdo em blocos visuais
11. Use listas com - apenas para itens curtos; para dados comparativos use TABELAS


REGRA OBRIGATÓRIA — CADA SEÇÃO DEVE TER EXATAMENTE ESTES 3 ELEMENTOS VISUAIS:
A) Uma tabela markdown comparativa ou de dados (mínimo 3 linhas de dados)
B) Uma lista numerada com os 3-5 pontos-chave da seção
C) Um bloco de diagrama no formato EXATO: <!-- DIAGRAM: tipo | item1 | item2 | item3 -->

Tipos de diagrama obrigatórios por seção:
- sumario: <!-- DIAGRAM: comparison | Situação Atual: descrição | Proposta: descrição | Impacto Esperado: descrição -->
- maturidade: <!-- DIAGRAM: gauge | nível numérico de 1-10 | label do nível -->
- objetivos: <!-- DIAGRAM: pyramid | Objetivo Primário | Objetivo Secundário | Objetivo Terciário -->
- estrutura: <!-- DIAGRAM: flow | Etapa 1 | Etapa 2 | Etapa 3 | Etapa 4 -->
- estrategia: <!-- DIAGRAM: funnel | Topo: Aquisição | Meio: Engajamento | Base: Retenção | Fundo: Advocacy -->
- beneficios: <!-- DIAGRAM: comparison | Tangíveis: lista | Intangíveis: lista | ROI Esperado: valor -->
- segmentacao: <!-- DIAGRAM: pyramid | Tier Premium | Tier Intermediário | Tier Base -->
- canais: <!-- DIAGRAM: flow | Canal 1 | Canal 2 | Canal 3 | Canal 4 -->
- operacoes: <!-- DIAGRAM: flow | Processo 1 | Processo 2 | Processo 3 | Processo 4 -->
- custos: <!-- DIAGRAM: comparison | Investimento: valor | Retorno: valor | Payback: período -->

NUNCA escreva mais de 3 parágrafos seguidos sem quebrar com uma lista, tabela, sub-header ou diagrama.

REGRAS ESPECÍFICAS PARA CRONOGRAMA (seção "cronograma"):
12. O cronograma DEVE ser formatado com cada fase como sub-header ##, seguido de "**Período:** X meses" e depois os marcos como lista
13. Exemplo de formato para cronograma:
## Fase 1: Planejamento e Setup
**Período:** Meses 1-3
- Marco 1: Definição de escopo
- Marco 2: Seleção de plataforma
## Fase 2: Desenvolvimento
**Período:** Meses 4-6
- Marco 1: MVP do programa

REGRAS ESPECÍFICAS PARA 5W2H (seção "plano5w2h"):
14. O 5W2H DEVE ser uma tabela markdown com EXATAMENTE estas colunas: | Área | O Quê | Por Quê | Onde | Quando | Quem | Como | Quanto |
15. A coluna "Área" DEVE conter uma destas categorias: RFV, NBO, CX ou Estratégico
16. Deve ter no mínimo 10 linhas de ações detalhadas
17. Exemplo:
| Área | O Quê | Por Quê | Onde | Quando | Quem | Como | Quanto |
|------|-------|---------|------|--------|------|------|--------|
| RFV | Segmentar base por valor | Identificar clientes premium | CRM | Mês 1 | Equipe Analytics | Análise RFV | R$ 5.000 |

18. NÃO use code fences (\`\`\`) na resposta — apenas JSON puro
19. O content de cada seção deve ser markdown válido e rico (com headers ##, listas, **bold**, tabelas quando relevante)`;

    const userPrompt = `Gere um plano estratégico completo de programa de fidelidade com base nos seguintes dados:

${profileContext}

${labContext}

DIAGNÓSTICO RFV (Segmentação de Clientes):
${rfvSummary || 'Dados RFV não disponíveis.'}

DIAGNÓSTICO NBO (Next Best Offer):
${nboSummary || 'Dados NBO não disponíveis.'}

DIAGNÓSTICO CX (Customer Experience):
${cxSummary || 'Dados CX não disponíveis.'}

Responda APENAS com o JSON válido, sem nenhum texto adicional.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar plano" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    let planData;
    try {
      planData = JSON.parse(content.trim());
    } catch {
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          planData = JSON.parse(jsonMatch[1].trim());
        } else {
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            planData = JSON.parse(content.substring(firstBrace, lastBrace + 1));
          } else {
            throw new Error("No JSON found");
          }
        }
      } catch {
        planData = {
          sections: [{ id: "plano", title: "Plano Estratégico", content }],
        };
      }
    }

    return new Response(JSON.stringify(planData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
