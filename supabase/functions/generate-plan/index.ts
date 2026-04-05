import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Bloco 1: Persona e Objetivo ───
const BLOCO1_PERSONA = `Você é um consultor sênior especialista em programas de fidelidade (loyalty) com mais de 20 anos de experiência em empresas como Livelo, Smiles, Dotz e grandes varejistas. Sua missão é criar um Plano Estratégico de Loyalty EXTREMAMENTE DETALHADO, equivalente a um relatório de consultoria de 12 a 15 páginas. Este não é um resumo genérico. É um plano acionável, profundo, que deve utilizar OBRIGATORIAMENTE os dados fornecidos pelo cliente (Formulário LAB, Dados da Empresa, Diagnóstico RFV, Diagnóstico NBO e Diagnóstico CX).`;

// ─── Bloco 2: Estrutura JSON ───
const BLOCO2_JSON = `Você deve responder ÚNICA E EXCLUSIVAMENTE com um objeto JSON válido, sem NENHUM texto antes ou depois, sem formatação markdown envolvendo o JSON (sem \`\`\`json). O JSON deve seguir estritamente a estrutura abaixo, contendo exatamente 12 seções:

{"sections":[{"id":"sumario","title":"1. Sumário Executivo","content":"..."},{"id":"maturidade","title":"2. Diagnóstico de Maturidade","content":"..."},{"id":"objetivos","title":"3. Objetivos do Programa","content":"..."},{"id":"estrutura","title":"4. Estrutura do Programa","content":"..."},{"id":"estrategia","title":"5. Estratégia","content":"..."},{"id":"beneficios","title":"6. Benefícios Tangíveis e Intangíveis","content":"..."},{"id":"segmentacao","title":"7. Segmentação e Tierização","content":"..."},{"id":"canais","title":"8. Cadastro e Canais de Comunicação","content":"..."},{"id":"operacoes","title":"9. Operações","content":"..."},{"id":"custos","title":"10. Custo do Programa","content":"..."},{"id":"cronograma","title":"11. Cronograma de Implementação","content":"..."},{"id":"plano5w2h","title":"12. Plano de Ação 5W2H","content":"..."}]}`;

// ─── Bloco 3: Regras de Conteúdo e Profundidade ───
const BLOCO3_CONTEUDO = `Para o campo "content" de CADA UMA das 12 seções, você deve gerar um texto longo e rico em Markdown, seguindo estas regras de profundidade:

1. Volume: Cada seção deve conter conteúdo suficiente para preencher pelo menos 1 página inteira (cerca de 4 a 6 parágrafos densos).
2. Personalização: Você DEVE justificar suas recomendações citando explicitamente os dados fornecidos. Ex: "Como observado na análise RFV, onde 40% da base está 'Hibernando', recomendamos..."
3. Profundidade: Não faça listas rasas. Explique o "porquê" e o "como" de cada recomendação. Cada sugestão precisa vir com uma explicação do racional.
4. Ritmo: Nunca escreva mais de 3 parágrafos seguidos sem quebrar a leitura com um elemento visual (sub-header ##, tabela, lista ou diagrama).
5. Use **negrito** para destacar KPIs, métricas e números importantes (ex: "**NPS: 45 pontos**", "**Retenção: +15%**").
6. Use tabelas markdown SEMPRE QUE POSSÍVEL para comparações, métricas, custos — nunca listas quando uma tabela seria mais clara.
7. Use linguagem profissional de consultoria estratégica.
8. Inclua métricas, KPIs e benchmarks do mercado brasileiro.`;

// ─── Bloco 4: Formatação Visual por Seção ───
const BLOCO4_VISUAL = `Dentro do campo "content" de cada seção, você DEVE aplicar a seguinte estrutura visual na ordem exata:

[INÍCIO DA SEÇÃO]

## 📚 Contexto Teórico
(1 parágrafo curto: 2-3 frases explicando por que esse tema importa para loyalty. Pincelada rápida, NÃO extenso.)

[DESENVOLVIMENTO PARTE 1]
(Parágrafos analíticos densos, sub-headers ##, justificativas com dados reais do cliente.)

## 📊 Resumo dos Dados
(1 parágrafo curto: 2-3 frases resumindo as métricas-chave do RFV, NBO, CX ou Formulário que embasam esta seção. Pincelada rápida, NÃO extenso.)

[DESENVOLVIMENTO PARTE 2]
(Mais parágrafos analíticos. Aqui DEVEM aparecer os 3 elementos obrigatórios:)
1. Uma tabela Markdown comparativa ou de dados (mínimo 3 linhas de dados).
2. Uma lista numerada (3 a 5 pontos-chave explicados).
3. O diagrama obrigatório específico da seção (veja Bloco 5).

## 🎯 Nossa Recomendação
(1 parágrafo curto: 2-3 frases sintetizando a ação principal a ser tomada com racional direto. Pincelada rápida, NÃO extenso.)

[FIM DA SEÇÃO]

IMPORTANTE: Os blocos 📚, 📊 e 🎯 são COMPLEMENTARES e CURTOS (máximo 1 parágrafo, 2-3 frases cada). O conteúdo principal da seção (tabelas, diagramas, listas, análises profundas com múltiplos parágrafos) deve estar ENTRE eles e ser EXTENSO e DETALHADO.`;

// ─── Bloco 5: Regras Específicas por Seção ───
const BLOCO5_EXCECOES = `Siga estas regras estritas para seções específicas:

DIAGRAMAS OBRIGATÓRIOS — Insira exatamente no formato abaixo (HTML comment), sem alterar a sintaxe:
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

REGRA PARA SEÇÃO 11 (cronograma):
Formate as fases com sub-headers ## e negrito para o período. Exemplo:
## Fase 1: Planejamento e Setup
**Período:** Meses 1-3
- Marco 1: Definição de escopo
- Marco 2: Seleção de plataforma
## Fase 2: Desenvolvimento
**Período:** Meses 4-6
- Marco 1: MVP do programa

REGRA PARA SEÇÃO 12 (plano5w2h):
Deve conter uma tabela Markdown com EXATAMENTE estas colunas e no MÍNIMO 10 linhas de ações detalhadas. A coluna "Área" deve conter apenas: RFV, NBO, CX ou Estratégico.
| Área | O Quê | Por Quê | Onde | Quando | Quem | Como | Quanto |
|------|-------|---------|------|--------|------|------|--------|
| RFV | Segmentar base por valor | Identificar clientes premium | CRM | Mês 1 | Equipe Analytics | Análise RFV | R$ 5.000 |

NÃO use code fences (\`\`\`) na resposta — apenas JSON puro.`;

function buildSystemPrompt(): string {
  return [BLOCO1_PERSONA, BLOCO2_JSON, BLOCO3_CONTEUDO, BLOCO4_VISUAL, BLOCO5_EXCECOES].join('\n\n---\n\n');
}

function buildUserPrompt(
  profile: any,
  labAnswers: any,
  companyData: any,
  rfvSummary: string,
  nboSummary: string,
  cxSummary: string,
): string {
  const profileBlock = profile
    ? `=== PERFIL DA EMPRESA ===
- Nome: ${profile.nome || 'N/A'}
- Empresa: ${profile.empresa || 'N/A'}
- Cargo: ${profile.cargo || 'N/A'}`
    : 'Perfil da empresa não disponível.';

  const companyBlock = companyData
    ? `=== DADOS DA EMPRESA (Formulário Inicial) ===
- Modelo de Negócio: ${companyData.modelo || 'N/A'}
- Segmento/Indústria: ${companyData.segmento || 'N/A'}
- Ano de Fundação: ${companyData.anoFundacao || 'N/A'}
- Tamanho da Base de Clientes: ${companyData.tamanhoBase || 'N/A'}
- Faturamento Anual: ${companyData.faturamento || 'N/A'}
- Frequência de Compra Ideal: ${companyData.frequencia || 'N/A'}
- Gestão de Dados: ${companyData.dados || 'N/A'}
- Informações Disponíveis: ${companyData.infos || 'N/A'}
- Desafio Principal: ${companyData.desafio || 'N/A'}
- Produtos/Serviços: ${JSON.stringify(companyData.produtos || [])}`
    : 'Dados da empresa não disponíveis.';

  const labBlock = labAnswers
    ? `=== RESPOSTAS DO FORMULÁRIO LAB ===
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

  return `Gere o plano estratégico completo de programa de fidelidade com base nos seguintes dados reais do cliente. Lembre-se de referenciar estes dados no seu texto para provar por que você está sugerindo cada ação.

${profileBlock}

${companyBlock}

${labBlock}

=== DIAGNÓSTICOS DE DADOS ===

[DIAGNÓSTICO RFV (Recência, Frequência, Valor)]
${rfvSummary || 'Dados RFV não disponíveis.'}
(Nota para a IA: Use estes dados principalmente nas seções de Segmentação, Estratégia e Maturidade)

[DIAGNÓSTICO NBO (Next Best Offer)]
${nboSummary || 'Dados NBO não disponíveis.'}
(Nota para a IA: Use estes dados principalmente nas seções de Benefícios, Estrutura e Objetivos)

[DIAGNÓSTICO CX (Customer Experience)]
${cxSummary || 'Dados CX não disponíveis.'}
(Nota para a IA: Use estes dados principalmente nas seções de Canais, Operações e Maturidade)

Lembre-se: Responda APENAS com o JSON válido, sem nenhum texto adicional.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profile, labAnswers, companyData, rfvSummary, nboSummary, cxSummary } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(profile, labAnswers, companyData, rfvSummary, nboSummary, cxSummary);

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
