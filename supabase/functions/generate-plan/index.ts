import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Bloco 1: Persona e Objetivo ───
const BLOCO1_PERSONA = "Voce e um consultor senior especialista em programas de fidelidade (loyalty) com mais de 20 anos de experiencia em empresas como Livelo, Smiles, Dotz e grandes varejistas. Sua missao e criar um Plano Estrategico de Loyalty EXTREMAMENTE DETALHADO, equivalente a um relatorio de consultoria de 12 a 15 paginas. Este nao e um resumo generico. E um plano acionavel, profundo, que deve utilizar OBRIGATORIAMENTE os dados fornecidos pelo cliente (Formulario LAB, Dados da Empresa, Diagnostico RFV, Diagnostico NBO e Diagnostico CX).";

// ─── Bloco 2: Estrutura JSON ───
const BLOCO2_JSON = 'Voce deve responder UNICA E EXCLUSIVAMENTE com um objeto JSON valido, sem NENHUM texto antes ou depois, sem formatacao markdown envolvendo o JSON. O JSON deve seguir estritamente a estrutura abaixo, contendo exatamente 12 secoes:\n\n{"sections":[{"id":"sumario","title":"1. Sumario Executivo","content":"..."},{"id":"maturidade","title":"2. Diagnostico de Maturidade","content":"..."},{"id":"objetivos","title":"3. Objetivos do Programa","content":"..."},{"id":"estrutura","title":"4. Estrutura do Programa","content":"..."},{"id":"estrategia","title":"5. Estrategia","content":"..."},{"id":"beneficios","title":"6. Beneficios Tangiveis e Intangiveis","content":"..."},{"id":"segmentacao","title":"7. Segmentacao e Tierizacao","content":"..."},{"id":"canais","title":"8. Cadastro e Canais de Comunicacao","content":"..."},{"id":"operacoes","title":"9. Operacoes","content":"..."},{"id":"custos","title":"10. Custo do Programa","content":"..."},{"id":"cronograma","title":"11. Cronograma de Implementacao","content":"..."},{"id":"plano5w2h","title":"12. Plano de Acao 5W2H","content":"..."}]}';

// ─── Bloco 3: Regras de Conteúdo — VISUAL-FIRST ───
const BLOCO3_CONTEUDO = [
  "Para o campo content de CADA UMA das 12 secoes, voce deve gerar conteudo EXTENSO e RICO em Markdown. O conteudo NAO pode ser um bloco de texto corrido. Deve ser VISUAL e ESTRUTURADO, como um relatorio de consultoria premium.",
  "",
  "REGRAS ABSOLUTAS DE FORMATACAO:",
  "",
  "1. NUNCA escreva mais de 2 paragrafos seguidos. Sempre quebre com: sub-header (##), lista, tabela ou diagrama.",
  "",
  "2. USE SUB-HEADERS FUNCIONAIS (##) para cada conceito, pilar ou topico. Exemplos:",
  "   ## Mecanica de Ganhar e Trocar",
  "   ## Gamificacao como Pilar de Engajamento",
  "   ## Impacto Esperado",
  "",
  "3. SOB CADA SUB-HEADER, use listas com bullets para detalhar os pontos:",
  "   - Bullet 1: explicacao",
  "   - Bullet 2: explicacao",
  "   - Bullet 3: explicacao",
  "",
  "4. SEMPRE inclua blocos de Impacto esperado com indicadores visuais:",
  "   - Aumento de frequencia de compra e lifetime value",
  "   - Reducao de churn e melhora do NPS",
  "   - Aumento de engajamento e uso recorrente",
  "",
  "5. Use **negrito** para KPIs, metricas e numeros importantes.",
  "",
  "6. PERSONALIZACAO: Cite EXPLICITAMENTE os dados do cliente. Ex: Considerando que 40% da base esta Hibernando segundo o RFV...",
  "",
  "7. Volume: Cada secao deve ter conteudo equivalente a pelo menos 1 pagina (4-6 blocos de conteudo entre sub-headers, listas e analises).",
  "",
  "8. Linguagem profissional de consultoria estrategica com metricas e benchmarks do mercado brasileiro.",
].join("\n");

// ─── Bloco 4: Estrutura Obrigatória de 6 Partes por Seção ───
const BLOCO4_ESTRUTURA = [
  "ESTRUTURA OBRIGATORIA DE CADA SECAO — Toda secao DEVE conter EXATAMENTE 6 partes, nesta ORDEM EXATA:",
  "",
  "PARTE 1 — Contexto Teorico (marcador obrigatorio):",
  "Comece com exatamente: ## Contexto Teorico",
  "Depois escreva exatamente 1 paragrafo curto (2-3 frases). Apenas uma introducao teorica rapida. NAO desenvolva aqui.",
  "",
  "PARTE 2 — Desenvolvimento do Topico:",
  "Esta e a parte principal e mais extensa. Use sub-headers (##), bullets, paragrafos analiticos, e referencias aos dados do cliente.",
  "Minimo 4-6 sub-headers com bullets explicativos. Use indicadores de impacto (aumento, reducao, etc).",
  "Aqui vai o diagrama tambem, DENTRO do desenvolvimento, onde fizer sentido no fluxo do texto.",
  "",
  "DIAGRAMAS OBRIGATORIOS — Insira exatamente no formato abaixo (HTML comment), DENTRO do desenvolvimento:",
  "- sumario: <!-- DIAGRAM: comparison | Situacao Atual: descricao | Proposta: descricao | Impacto Esperado: descricao -->",
  "- maturidade: <!-- DIAGRAM: gauge | nivel numerico de 1-10 | label do nivel -->",
  "- objetivos: <!-- DIAGRAM: pyramid | Objetivo Primario | Objetivo Secundario | Objetivo Terciario -->",
  "- estrutura: <!-- DIAGRAM: flow | Etapa 1 | Etapa 2 | Etapa 3 | Etapa 4 -->",
  "- estrategia: <!-- DIAGRAM: funnel | Topo: Aquisicao | Meio: Engajamento | Base: Retencao | Fundo: Advocacy -->",
  "- beneficios: <!-- DIAGRAM: comparison | Tangiveis: lista | Intangiveis: lista | ROI Esperado: valor -->",
  "- segmentacao: <!-- DIAGRAM: pyramid | Tier Premium | Tier Intermediario | Tier Base -->",
  "- canais: <!-- DIAGRAM: flow | Canal 1 | Canal 2 | Canal 3 | Canal 4 -->",
  "- operacoes: <!-- DIAGRAM: flow | Processo 1 | Processo 2 | Processo 3 | Processo 4 -->",
  "- custos: <!-- DIAGRAM: comparison | Investimento: valor | Retorno: valor | Payback: periodo -->",
  "",
  "PARTE 3 — Principais Pontos (marcador obrigatorio):",
  "Escreva exatamente: ## Principais Pontos",
  "Depois uma lista numerada de EXATAMENTE 5 itens. Cada item deve ser uma frase curta e objetiva resumindo as conclusoes-chave da secao.",
  "1. Ponto um",
  "2. Ponto dois",
  "3. Ponto tres",
  "4. Ponto quatro",
  "5. Ponto cinco",
  "",
  "PARTE 4 — Tabela de Resultados (marcador obrigatorio):",
  "Escreva exatamente: ## Tabela de Resultados",
  "Depois uma tabela Markdown com o OUTPUT CONCRETO da secao. A tabela deve ter MINIMO 4 linhas de dados. O conteudo da tabela depende da secao:",
  "- sumario: | Dimensao | Situacao Atual | Proposta | Impacto |",
  "- maturidade: | Dimensao | Nota (1-10) | Justificativa | Acao Recomendada |",
  "- objetivos: | Objetivo | Metrica | Meta | Prazo |",
  "- estrutura: | Mecanica | Descricao | Impacto Esperado |",
  "- estrategia: | Estrategia | Canal | KPI | Meta |",
  "- beneficios: | Beneficio | Tipo | Impacto | Prioridade |",
  "- segmentacao: | Tier | Criterio | % Base Estimada | Beneficios Chave |",
  "- canais: | Canal | Tipo | Prioridade | Investimento |",
  "- operacoes: | Processo | Responsavel | Ferramenta | Frequencia |",
  "- custos: | Item de Custo | Investimento | Retorno Esperado | Payback |",
  "",
  "PARTE 5 — Conclusao (marcador obrigatorio):",
  "Escreva exatamente: ## Conclusao",
  "Depois escreva exatamente 1 paragrafo curto (2-3 frases). Apenas a acao principal recomendada. NAO desenvolva aqui.",
  "",
  "IMPORTANTE: As partes 1, 3, 4 e 5 tem marcadores fixos que o frontend usa para parsear. NAO altere os nomes dos marcadores.",
  "",
  "REGRA PARA SECAO 11 (cronograma):",
  "Formate as fases com sub-headers ## e negrito para o periodo. Exemplo:",
  "## Fase 1: Planejamento e Setup",
  "**Periodo:** Meses 1-3",
  "- Marco 1: Definicao de escopo",
  "- Marco 2: Selecao de plataforma",
  "",
  "REGRA PARA SECAO 12 (plano5w2h):",
  "Deve conter uma tabela Markdown com EXATAMENTE estas colunas e no MINIMO 10 linhas de acoes detalhadas. A coluna Area deve conter apenas: RFV, NBO, CX ou Estrategico.",
  "| Area | O Que | Por Que | Onde | Quando | Quem | Como | Quanto |",
  "|------|-------|---------|------|--------|------|------|--------|",
  "| RFV | Segmentar base por valor | Identificar clientes premium | CRM | Mes 1 | Equipe Analytics | Analise RFV | R$ 5.000 |",
  "",
  "NAO use code fences na resposta — apenas JSON puro."
].join("\n");

function buildSystemPrompt(): string {
  return [BLOCO1_PERSONA, BLOCO2_JSON, BLOCO3_CONTEUDO, BLOCO4_ESTRUTURA].join("\n\n---\n\n");
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
    ? "=== PERFIL DA EMPRESA ===\n- Nome: " + (profile.nome || "N/A") + "\n- Empresa: " + (profile.empresa || "N/A") + "\n- Cargo: " + (profile.cargo || "N/A")
    : "Perfil da empresa nao disponivel.";

  const companyBlock = companyData
    ? "=== DADOS DA EMPRESA (Formulario Inicial) ===\n- Modelo de Negocio: " + (companyData.modelo || "N/A") + "\n- Segmento/Industria: " + (companyData.segmento || "N/A") + "\n- Ano de Fundacao: " + (companyData.anoFundacao || "N/A") + "\n- Tamanho da Base de Clientes: " + (companyData.tamanhoBase || "N/A") + "\n- Faturamento Anual: " + (companyData.faturamento || "N/A") + "\n- Frequencia de Compra Ideal: " + (companyData.frequencia || "N/A") + "\n- Gestao de Dados: " + (companyData.dados || "N/A") + "\n- Informacoes Disponiveis: " + (companyData.infos || "N/A") + "\n- Desafio Principal: " + (companyData.desafio || "N/A") + "\n- Produtos/Servicos: " + JSON.stringify(companyData.produtos || [])
    : "Dados da empresa nao disponiveis.";

  const labBlock = labAnswers
    ? "=== RESPOSTAS DO FORMULARIO LAB ===\n- Objetivos: " + JSON.stringify(labAnswers.objetivos || []) + "\n- Estrutura do Programa: " + (labAnswers.estruturaPrograma || "N/A") + "\n- Mecanicas: " + JSON.stringify(labAnswers.tipoPrograma || []) + "\n- Plataforma LMS: " + (labAnswers.plataforma || "N/A") + "\n- Estrategias: " + JSON.stringify(labAnswers.estrategia || []) + "\n- Time Estrategico: " + (labAnswers.timeEstrategico || "N/A") + "\n- Beneficios Tangiveis: " + JSON.stringify(labAnswers.beneficiosTangiveis || []) + "\n- Beneficios Intangiveis: " + JSON.stringify(labAnswers.beneficiosIntangiveis || []) + "\n- Tierizacao: " + (labAnswers.tierizacao || "N/A") + "\n- Segmentacao: " + JSON.stringify(labAnswers.segmentacao || []) + "\n- Canais de Cadastro: " + JSON.stringify(labAnswers.cadastro || []) + "\n- Nivel de Cadastro: " + (labAnswers.infosCadastro || "N/A") + "\n- Canais de Comunicacao: " + JSON.stringify(labAnswers.canaisComunicacao || []) + "\n- Operacoes: " + JSON.stringify(labAnswers.operacoes || []) + "\n- Custos: " + JSON.stringify(labAnswers.custos || [])
    : "Respostas LAB nao disponiveis.";

  return "Gere o plano estrategico completo de programa de fidelidade com base nos seguintes dados reais do cliente. Lembre-se de referenciar estes dados no seu texto para provar por que voce esta sugerindo cada acao.\n\n" + profileBlock + "\n\n" + companyBlock + "\n\n" + labBlock + "\n\n=== DIAGNOSTICOS DE DADOS ===\n\n[DIAGNOSTICO RFV (Recencia, Frequencia, Valor)]\n" + (rfvSummary || "Dados RFV nao disponiveis.") + "\n(Nota para a IA: Use estes dados principalmente nas secoes de Segmentacao, Estrategia e Maturidade)\n\n[DIAGNOSTICO NBO (Next Best Offer)]\n" + (nboSummary || "Dados NBO nao disponiveis.") + "\n(Nota para a IA: Use estes dados principalmente nas secoes de Beneficios, Estrutura e Objetivos)\n\n[DIAGNOSTICO CX (Customer Experience)]\n" + (cxSummary || "Dados CX nao disponiveis.") + "\n(Nota para a IA: Use estes dados principalmente nas secoes de Canais, Operacoes e Maturidade)\n\nLembre-se: Responda APENAS com o JSON valido, sem nenhum texto adicional.";
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
    const content = result.choices?.[0]?.message?.content || "";

    let planData: any = null;

    // Attempt 1: Direct parse
    try { planData = JSON.parse(content.trim()); } catch { /* continue */ }

    // Attempt 2: Extract from code fences
    if (!planData) {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try { planData = JSON.parse(jsonMatch[1].trim()); } catch { /* continue */ }
      }
    }

    // Attempt 3: Extract from first { to last }
    if (!planData) {
      const firstBrace = content.indexOf("{");
      const lastBrace = content.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try { planData = JSON.parse(content.substring(firstBrace, lastBrace + 1)); } catch { /* continue */ }
      }
    }

    // Attempt 4: Maybe nested — content has a sections array inside code fences inside a wrapper
    if (!planData || (planData.sections?.length === 1 && planData.sections[0].id === "plano")) {
      try {
        const inner = planData?.sections?.[0]?.content || content;
        const cleaned = inner.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
        const fb = cleaned.indexOf("{");
        const lb = cleaned.lastIndexOf("}");
        if (fb !== -1 && lb > fb) {
          const parsed = JSON.parse(cleaned.substring(fb, lb + 1));
          if (parsed.sections?.length > 1) planData = parsed;
        }
      } catch { /* continue */ }
    }

    // Final fallback
    if (!planData) {
      console.error("Failed to parse AI response. First 500 chars:", content.substring(0, 500));
      planData = { sections: [{ id: "plano", title: "Plano Estrategico", content }] };
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
