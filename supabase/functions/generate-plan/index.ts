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

{"sections":[{"id":"sumario","title":"1. Sumário Executivo","content":"texto em markdown"},{"id":"maturidade","title":"2. Diagnóstico de Maturidade","content":"texto em markdown"},{"id":"objetivos","title":"3. Objetivos do Programa","content":"texto em markdown"},{"id":"estrutura","title":"4. Estrutura do Programa","content":"texto em markdown"},{"id":"estrategia","title":"5. Estratégia","content":"texto em markdown"},{"id":"beneficios","title":"6. Benefícios Tangíveis e Intangíveis","content":"texto em markdown"},{"id":"segmentacao","title":"7. Segmentação e Tierização","content":"texto em markdown"},{"id":"canais","title":"8. Cadastro e Canais de Comunicação","content":"texto em markdown"},{"id":"operacoes","title":"9. Operações","content":"texto em markdown"},{"id":"custos","title":"10. Custo do Programa","content":"texto em markdown"},{"id":"cronograma","title":"11. Cronograma de Implementação","content":"texto em markdown"},{"id":"plano5w2h","title":"12. Plano de Ação 5W2H","content":"texto em markdown com tabela"}]}

REGRAS:
1. Cada seção deve ter no mínimo 3-4 parágrafos densos com análises específicas
2. O Sumário Executivo deve ter pelo menos 5 parágrafos resumindo todo o plano
3. O Diagnóstico de Maturidade deve analisar os dados reais (RFV, NBO, CX) e classificar o nível da empresa
4. Cada seção deve referenciar dados específicos dos diagnósticos quando relevante
5. O Cronograma deve ter fases detalhadas com marcos e prazos realistas
6. O 5W2H deve ter pelo menos 8-10 ações detalhadas em formato de tabela markdown
7. Use linguagem profissional de consultoria estratégica
8. Inclua métricas, KPIs e benchmarks do mercado
9. Faça recomendações personalizadas com base nas respostas do LAB e nos dados
10. O content de cada seção deve ser markdown válido e rico (com headers ##, listas, **bold**, tabelas quando relevante)
11. NÃO use code fences (\`\`\`) na resposta — apenas JSON puro`;

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

    // Try to parse JSON from content — handle code fences, extra text, etc.
    let planData;
    try {
      // Try direct parse first
      planData = JSON.parse(content.trim());
    } catch {
      try {
        // Try extracting from code fences
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          planData = JSON.parse(jsonMatch[1].trim());
        } else {
          // Try finding first { to last }
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            planData = JSON.parse(content.substring(firstBrace, lastBrace + 1));
          } else {
            throw new Error("No JSON found");
          }
        }
      } catch {
        // Last resort: wrap as single section
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
