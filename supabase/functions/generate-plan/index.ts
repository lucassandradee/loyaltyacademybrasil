import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Bloco 1: Persona e Objetivo ───
const BLOCO1_PERSONA = `Voce e um consultor senior especialista em programas de fidelidade (loyalty) com mais de 20 anos de experiencia em empresas como Livelo, Smiles, Dotz e grandes varejistas. Sua missao e criar um Plano Estrategico de Loyalty EXTREMAMENTE DETALHADO, equivalente a um relatorio de consultoria de 12 a 15 paginas. Este nao e um resumo generico. E um plano acionavel, profundo, que deve utilizar OBRIGATORIAMENTE os dados fornecidos pelo cliente (Formulario LAB, Dados da Empresa, Diagnostico RFV, Diagnostico NBO e Diagnostico CX).`;

// ─── Bloco 2: Estrutura JSON ───
const BLOCO2_JSON = `Voce deve responder UNICA E EXCLUSIVAMENTE com um objeto JSON valido, sem NENHUM texto antes ou depois, sem formatacao markdown envolvendo o JSON. O JSON deve seguir estritamente a estrutura abaixo, contendo exatamente 12 secoes:

{"sections":[{"id":"sumario","title":"1. Sumario Executivo","content":"..."},{"id":"maturidade","title":"2. Diagnostico de Maturidade","content":"..."},{"id":"objetivos","title":"3. Objetivos do Programa","content":"..."},{"id":"estrutura","title":"4. Estrutura do Programa","content":"..."},{"id":"estrategia","title":"5. Estrategia","content":"..."},{"id":"beneficios","title":"6. Beneficios Tangiveis e Intangiveis","content":"..."},{"id":"segmentacao","title":"7. Segmentacao e Tierizacao","content":"..."},{"id":"canais","title":"8. Cadastro e Canais de Comunicacao","content":"..."},{"id":"operacoes","title":"9. Operacoes","content":"..."},{"id":"custos","title":"10. Custo do Programa","content":"..."},{"id":"cronograma","title":"11. Cronograma de Implementacao","content":"..."},{"id":"plano5w2h","title":"12. Plano de Acao 5W2H","content":"..."}]}`;

// ─── Bloco 3: Regras de Conteúdo — VISUAL-FIRST ───
const BLOCO3_CONTEUDO = `Para o campo "content" de CADA UMA das 12 secoes, voce deve gerar conteudo EXTENSO e RICO em Markdown. O conteudo NAO pode ser um bloco de texto corrido. Deve ser VISUAL e ESTRUTURADO, como um relatorio de consultoria premium.

REGRAS ABSOLUTAS DE FORMATACAO:

1. NUNCA escreva mais de 2 paragrafos seguidos. Sempre quebre com: sub-header (##), lista, tabela ou diagrama.

2. USE SUB-HEADERS FUNCIONAIS (##) para cada conceito, pilar ou topico. Exemplos:
   ## Mecanica de Ganhar & Trocar
   ## Gamificacao como Pilar de Engajamento
   ## Impacto Esperado

3. SOB CADA SUB-HEADER, use listas com bullets para detalhar os pontos:
   - Bullet 1: explicacao
   - Bullet 2: explicacao
   - Bullet 3: explicacao

4. SEMPRE inclua blocos de "Impacto esperado" ou "Resultado projetado" com indicadores visuais:
   - Aumento de frequencia de compra e lifetime value
   - Reducao de churn e melhora do NPS
   - Aumento de engajamento e uso recorrente

5. TABELAS MARKDOWN sao obrigatorias em toda secao que envolva comparacoes, metricas, custos ou segmentacao. Minimo 3 linhas de dados.

6. Use **negrito** para KPIs, metricas e numeros importantes.

7. PERSONALIZACAO: Cite EXPLICITAMENTE os dados do cliente. Ex: "Considerando que 40% da base esta Hibernando segundo o RFV..."

8. Volume: Cada secao deve ter conteudo equivalente a pelo menos 1 pagina (4-6 blocos de conteudo entre sub-headers, listas, tabelas e diagramas).

9. Linguagem profissional de consultoria estrategica com metricas e benchmarks do mercado brasileiro.

EXEMPLO DE COMO FORMATAR UMA SECAO (use este padrao):

## Mecanica Principal: Ganhar & Trocar
Base do programa e principal driver de comportamento transacional.
- Acumulo de pontos via compras na empresa e parceiros
- Resgate em descontos, produtos, servicos e experiencias
- Incentiva aumento de frequencia, ticket medio e retencao

## Gamificacao como Pilar de Engajamento
Cria estimulos continuos de interacao e recorrencia.
- Uso de mecanicas como desafios, metas, badges e rankings
- Estrutura de tiers baseada em comportamento (gasto, frequencia)
- Recompensas progressivas (bonus de pontos, beneficios exclusivos)

## Impacto Esperado
- Aumento de frequencia de compra e lifetime value
- Aumento de engajamento e uso recorrente do ecossistema
- Reducao de churn e melhora do NPS
- Diferenciacao competitiva via comunidade e experiencia`;

// ─── Bloco 4: Pinceladas Visuais ───
const BLOCO4_VISUAL = `Dentro do campo "content" de cada secao, voce DEVE incluir exatamente 2 "pinceladas" visuais curtas:

1. NO INICIO da secao, antes de qualquer desenvolvimento:
## Contexto Teorico
(1 paragrafo curto de 2-3 frases. Apenas uma introducao teorica rapida. NAO desenvolva aqui.)

2. NO FINAL da secao, apos todo o desenvolvimento:
## Nossa Recomendacao
(1 paragrafo curto de 2-3 frases. Apenas a acao principal recomendada. NAO desenvolva aqui.)

IMPORTANTE: Estas pinceladas sao COMPLEMENTARES e CURTAS. Todo o conteudo rico, extenso, com sub-headers, tabelas, listas, diagramas e analises profundas vai ENTRE elas. Os blocos visuais NAO substituem o desenvolvimento — eles apenas emolduram a secao.

NAO inclua "Resumo dos Dados" como bloco separado. Os dados devem ser citados naturalmente ao longo do desenvolvimento.`;

// ─── Bloco 5: Regras Específicas por Seção ───
const BLOCO5_EXCECOES = `Siga estas regras estritas para secoes especificas:

DIAGRAMAS OBRIGATORIOS — Insira exatamente no formato abaixo (HTML comment), DENTRO do desenvolvimento da secao (nao no final). Podem ser inseridos multiplos diagramas se o conteudo pedir:
- sumario: <!-- DIAGRAM: comparison | Situacao Atual: descricao | Proposta: descricao | Impacto Esperado: descricao -->
- maturidade: <!-- DIAGRAM: gauge | nivel numerico de 1-10 | label do nivel -->
- objetivos: <!-- DIAGRAM: pyramid | Objetivo Primario | Objetivo Secundario | Objetivo Terciario -->
- estrutura: <!-- DIAGRAM: flow | Etapa 1 | Etapa 2 | Etapa 3 | Etapa 4 -->
- estrategia: <!-- DIAGRAM: funnel | Topo: Aquisicao | Meio: Engajamento | Base: Retencao | Fundo: Advocacy -->
- beneficios: <!-- DIAGRAM: comparison | Tangiveis: lista | Intangiveis: lista | ROI Esperado: valor -->
- segmentacao: <!-- DIAGRAM: pyramid | Tier Premium | Tier Intermediario | Tier Base -->
- canais: <!-- DIAGRAM: flow | Canal 1 | Canal 2 | Canal 3 | Canal 4 -->
- operacoes: <!-- DIAGRAM: flow | Processo 1 | Processo 2 | Processo 3 | Processo 4 -->
- custos: <!-- DIAGRAM: comparison | Investimento: valor | Retorno: valor | Payback: periodo -->

REGRA PARA SECAO 11 (cronograma):
Formate as fases com sub-headers ## e negrito para o periodo. Exemplo:
## Fase 1: Planejamento e Setup
**Periodo:** Meses 1-3
- Marco 1: Definicao de escopo
- Marco 2: Selecao de plataforma
## Fase 2: Desenvolvimento
**Periodo:** Meses 4-6
- Marco 1: MVP do programa

REGRA PARA SECAO 12 (plano5w2h):
Deve conter uma tabela Markdown com EXATAMENTE estas colunas e no MINIMO 10 linhas de acoes detalhadas. A coluna "Area" deve conter apenas: RFV, NBO, CX ou Estrategico.
| Area | O Que | Por Que | Onde | Quando | Quem | Como | Quanto |
|------|-------|---------|------|--------|------|------|--------|
| RFV | Segmentar base por valor | Identificar clientes premium | CRM | Mes 1 | Equipe Analytics | Analise RFV | R$ 5.000 |

NAO use code fences na resposta — apenas JSON puro.`;

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
    : 'Perfil da empresa nao disponivel.';

  const companyBlock = companyData
    ? `=== DADOS DA EMPRESA (Formulario Inicial) ===
- Modelo de Negocio: ${companyData.modelo || 'N/A'}
- Segmento/Industria: ${companyData.segmento || 'N/A'}
- Ano de Fundacao: ${companyData.anoFundacao || 'N/A'}
- Tamanho da Base de Clientes: ${companyData.tamanhoBase || 'N/A'}
- Faturamento Anual: ${companyData.faturamento || 'N/A'}
- Frequencia de Compra Ideal: ${companyData.frequencia || 'N/A'}
- Gestao de Dados: ${companyData.dados || 'N/A'}
- Informacoes Disponiveis: ${companyData.infos || 'N/A'}
- Desafio Principal: ${companyData.desafio || 'N/A'}
- Produtos/Servicos: ${JSON.stringify(companyData.produtos || [])}`
    : 'Dados da empresa nao disponiveis.';

  const labBlock = labAnswers
    ? `=== RESPOSTAS DO FORMULARIO LAB ===
- Objetivos: ${JSON.stringify(labAnswers.objetivos || [])}
- Estrutura do Programa: ${labAnswers.estruturaPrograma || 'N/A'}
- Mecanicas: ${JSON.stringify(labAnswers.tipoPrograma || [])}
- Plataforma LMS: ${labAnswers.plataforma || 'N/A'}
- Estrategias: ${JSON.stringify(labAnswers.estrategia || [])}
- Time Estrategico: ${labAnswers.timeEstrategico || 'N/A'}
- Beneficios Tangiveis: ${JSON.stringify(labAnswers.beneficiosTangiveis || [])}
- Beneficios Intangiveis: ${JSON.stringify(labAnswers.beneficiosIntangiveis || [])}
- Tierizacao: ${labAnswers.tierizacao || 'N/A'}
- Segmentacao: ${JSON.stringify(labAnswers.segmentacao || [])}
- Canais de Cadastro: ${JSON.stringify(labAnswers.cadastro || [])}
- Nivel de Cadastro: ${labAnswers.infosCadastro || 'N/A'}
- Canais de Comunicacao: ${JSON.stringify(labAnswers.canaisComunicacao || [])}
- Operacoes: ${JSON.stringify(labAnswers.operacoes || [])}
- Custos: ${JSON.stringify(labAnswers.custos || [])}`
    : 'Respostas LAB nao disponiveis.';

  return `Gere o plano estrategico completo de programa de fidelidade com base nos seguintes dados reais do cliente. Lembre-se de referenciar estes dados no seu texto para provar por que voce esta sugerindo cada acao.

${profileBlock}

${companyBlock}

${labBlock}

=== DIAGNOSTICOS DE DADOS ===

[DIAGNOSTICO RFV (Recencia, Frequencia, Valor)]
${rfvSummary || 'Dados RFV nao disponiveis.'}
(Nota para a IA: Use estes dados principalmente nas secoes de Segmentacao, Estrategia e Maturidade)

[DIAGNOSTICO NBO (Next Best Offer)]
${nboSummary || 'Dados NBO nao disponiveis.'}
(Nota para a IA: Use estes dados principalmente nas secoes de Beneficios, Estrutura e Objetivos)

[DIAGNOSTICO CX (Customer Experience)]
${cxSummary || 'Dados CX nao disponiveis.'}
(Nota para a IA: Use estes dados principalmente nas secoes de Canais, Operacoes e Maturidade)

Lembre-se: Responda APENAS com o JSON valido, sem nenhum texto adicional.`;
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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisicoes excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Creditos insuficientes. Adicione creditos ao seu workspace." }), {
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
          sections: [{ id: "plano", title: "Plano Estrategico", content }],
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
