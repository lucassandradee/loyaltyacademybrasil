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

1. Volume: Cada seção deve conter conteúdo suficiente para preencher pelo menos 1 página inteira (cerca de 4 a 6 parágrafos densos de desenvolvimento).
2. Personalização: Você DEVE justificar suas recomendações citando explicitamente os dados fornecidos. Ex: "Como observado na análise RFV, onde 40% da base está 'Hibernando', recomendamos..."
3. Profundidade: Não faça listas rasas. Explique o "porquê" e o "como" de cada recomendação. Cada sugestão precisa vir com uma explicação do racional.
4. Use **negrito** para destacar KPIs, métricas e números importantes.
5. Use tabelas markdown SEMPRE QUE POSSÍVEL para comparações, métricas, custos — nunca listas quando uma tabela seria mais clara.
6. Use linguagem profissional de consultoria estratégica.
7. Inclua métricas, KPIs e benchmarks do mercado brasileiro.

REGRA DE ESTRUTURAÇÃO VISUAL — ORDEM OBRIGATÓRIA DENTRO DE CADA SEÇÃO:

1. Parágrafos de análise (desenvolvimento do texto com sub-headers ## descritivos)
2. Diagrama(s) de apoio LOGO APÓS o texto analítico — use diagramas para ilustrar conceitos, não para substituir texto
3. Lista numerada com pontos-chave (cada item com título em **negrito** seguido de explicação)
4. Tabela comparativa ou de métricas
5. O marcador ## Nossa Recomendacao como fechamento (curto, 1 parágrafo)

Exemplo de estrutura ideal para o desenvolvimento de uma seção:

## Pilares da Mecânica do Programa

O programa se sustenta em três pilares complementares:

(parágrafos de análise aqui)

<!-- DIAGRAM: comparison | Ganhar & Trocar: Core econômico, acúmulo e resgate | Gamificação: Desafios, metas e rankings | Comunidades: Troca, feedback e pertencimento -->

1. **Ganhar & Trocar (Core econômico)** — Base do programa e principal driver de comportamento. Acúmulo de pontos via compras, resgate em descontos, produtos e experiências.

2. **Gamificação (Engajamento comportamental)** — Mecânicas de desafios, metas, badges e rankings. Estrutura de tiers baseada em comportamento.

3. **Comunidades (Engajamento relacional)** — Espaço para troca de conhecimento entre clientes, feedback contínuo, senso de pertencimento.

| Pilar | Tipo de Valor | Impacto Esperado |
|-------|---------------|------------------|
| Ganhar & Trocar | Transacional | ↑ Frequência e ticket médio |
| Gamificação | Comportamental | ↑ Engajamento e recorrência |
| Comunidades | Relacional | ↓ Churn, ↑ NPS |

## Nossa Recomendacao
(1 parágrafo curto de fechamento)

Siga este padrão em TODAS as seções: sub-headers descritivos → parágrafos de análise → diagrama(s) → lista numerada → tabela → recomendação.`;

// ─── Bloco 4: Blocos Visuais Obrigatórios (pinceladas curtas) ───
const BLOCO4_VISUAL = `Cada seção DEVE conter EXATAMENTE 2 marcadores visuais que são PINCELADAS CURTAS. Eles NÃO são o conteúdo principal — são destaques complementares de apoio.

REGRA CRÍTICA: Cada marcador visual deve ter EXATAMENTE 1 parágrafo curto de 2-3 frases. NUNCA coloque conteúdo de desenvolvimento dentro deles.

Os ÚNICOS 2 marcadores permitidos são:

1. PRIMEIRO marcador (no início da seção):
## Contexto Teorico
(2-3 frases explicando por que esse tema importa para loyalty. PARE após o parágrafo.)

2. [DESENVOLVIMENTO EXTENSO — sub-headers, parágrafos, diagramas, listas numeradas, tabelas]

3. ÚLTIMO marcador (no final da seção, após todo o desenvolvimento):
## Nossa Recomendacao
(2-3 frases sintetizando a ação principal. PARE após o parágrafo.)

PROIBIDO: Colocar tabelas, listas, sub-headers ou parágrafos adicionais dentro dos marcadores visuais. Eles são APENAS 1 parágrafo cada.
IMPORTANTE: Use exatamente esses headers sem emoji e sem acento: "## Contexto Teorico", "## Nossa Recomendacao".
Qualquer outro marcador ## com emoji ou que não seja esses dois é PROIBIDO.`;

// ─── Bloco 5: Regras Específicas por Seção ───
const BLOCO5_EXCECOES = `Siga estas regras estritas para seções específicas:

DIAGRAMAS — Insira no formato HTML comment abaixo. Você pode usar MÚLTIPLOS diagramas por seção quando fizer sentido (ex: um comparison + um flow na mesma seção). Formatos disponíveis:
- <!-- DIAGRAM: comparison | Item 1: descrição | Item 2: descrição | Item 3: descrição -->
- <!-- DIAGRAM: pyramid | Topo | Meio | Base -->
- <!-- DIAGRAM: funnel | Etapa 1 | Etapa 2 | Etapa 3 -->
- <!-- DIAGRAM: flow | Passo 1 | Passo 2 | Passo 3 | Passo 4 -->
- <!-- DIAGRAM: gauge | nível de 1-10 | label -->

Diagramas recomendados por seção (use estes + adicione outros se o conteúdo pedir):
- sumario: comparison (Situação Atual vs Proposta vs Impacto)
- maturidade: gauge (nível numérico)
- objetivos: pyramid (hierarquia de objetivos)
- estrutura: comparison (pilares do programa) + flow (jornada do cliente)
- estrategia: funnel (funil de aquisição → retenção → advocacy)
- beneficios: comparison (tangíveis vs intangíveis vs ROI)
- segmentacao: pyramid (tiers) + comparison (perfil de cada tier)
- canais: flow (jornada de cadastro)
- operacoes: flow (fluxo operacional)
- custos: comparison (investimento vs retorno vs payback)

REGRA PARA SEÇÃO 11 (cronograma):
Formate as fases com sub-headers ## e negrito para o período. Exemplo:
## Fase 1: Planejamento e Setup
**Período:** Meses 1-3
- Marco 1: Definição de escopo
- Marco 2: Seleção de plataforma

REGRA PARA SEÇÃO 12 (plano5w2h):
Deve conter uma tabela Markdown com EXATAMENTE estas colunas e no MÍNIMO 10 linhas de ações detalhadas:
| Área | O Quê | Por Quê | Onde | Quando | Quem | Como | Quanto |
|------|-------|---------|------|--------|------|------|--------|

NÃO use code fences na resposta — apenas JSON puro.`;

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

LEMBRETE FINAL: 
- Responda APENAS com o JSON válido, sem nenhum texto adicional.
- Os ÚNICOS marcadores visuais permitidos são "## Contexto Teorico" (início) e "## Nossa Recomendacao" (final). Nenhum outro marcador ## especial é permitido.
- ORDEM OBRIGATÓRIA dentro do desenvolvimento de cada seção: sub-headers ## com parágrafos analíticos → diagrama(s) de apoio → lista numerada com pontos-chave → tabela comparativa/métricas → Nossa Recomendação.
- Use múltiplos diagramas quando a seção tiver múltiplos conceitos visuais.
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
        Authorization: "Bearer " + LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        temperature: 0.4,
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
