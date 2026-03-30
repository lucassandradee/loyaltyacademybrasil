export interface DiagnosticAnswers {
  modelo: string;
  frequencia: string;
  dados: string;
  infos: string[];
  desafio: string;
  tiers: string;
}

export interface TierDetail {
  nome: string;
  criterio: string;
  beneficios: string[];
}

export interface KPI {
  metrica: string;
  descricao: string;
  meta: string;
}

export interface FaseImplementacao {
  fase: string;
  periodo: string;
  marcos: string[];
}

export interface DiagnosticResult {
  sumarioExecutivo: string;
  maturidade: { nivel: string; descricao: string; score: number; pontosFortes: string[]; gaps: string[] };
  estrutura: { tipo: string; descricao: string; mecanica: string; exemplos: string[] };
  tiers: TierDetail[];
  foco: { titulo: string; descricao: string; acoes: { acao: string; prioridade: 'Alta' | 'Média' | 'Baixa' }[] };
  kpis: KPI[];
  cronograma: FaseImplementacao[];
  checklist: string[];
}

export function generateDiagnostic(answers: DiagnosticAnswers): DiagnosticResult {
  // === MATURIDADE ===
  const dataScores: Record<string, number> = {
    'Sem dados estruturados': 1, 'Planilhas': 2, 'PDV básico': 3, 'CRM estruturado': 4, 'Plataforma de dados avançada': 5,
  };
  const dataScore = dataScores[answers.dados] || 1;
  const infoScore = Math.min(answers.infos.length, 5);
  const totalScore = dataScore + infoScore;

  let maturidade;
  if (totalScore <= 3) {
    maturidade = {
      nivel: 'Inicial', score: totalScore,
      descricao: 'Sua empresa está nos estágios iniciais de gestão de dados de clientes. Há uma grande oportunidade de estruturar processos e criar uma base sólida para um programa de fidelidade. A prioridade deve ser investir em infraestrutura de dados antes de implementar mecânicas complexas de loyalty.',
      pontosFortes: ['Oportunidade de construir do zero com boas práticas', 'Possibilidade de evitar vícios de sistemas legados'],
      gaps: ['Ausência de base de dados estruturada', 'Dificuldade em segmentar clientes', 'Impossibilidade de medir ROI de ações de fidelização', 'Falta de histórico para análises preditivas'],
    };
  } else if (totalScore <= 6) {
    maturidade = {
      nivel: 'Em Desenvolvimento', score: totalScore,
      descricao: 'Você já possui alguma estrutura de dados, mas ainda há lacunas importantes. Com investimentos pontuais em tecnologia e processos, é possível implementar um programa de loyalty eficaz. O foco deve ser em consolidar os dados existentes e preencher os gaps de informação.',
      pontosFortes: ['Base de dados parcialmente estruturada', 'Algum histórico de transações disponível', 'Capacidade básica de segmentação'],
      gaps: ['Dados fragmentados entre sistemas', 'Métricas de cliente incompletas (faltam dados de RFV)', 'Automação limitada de comunicações'],
    };
  } else {
    maturidade = {
      nivel: 'Avançado', score: totalScore,
      descricao: 'Sua empresa possui uma boa maturidade em dados de clientes. Você está pronto para implementar um programa de fidelidade sofisticado com segmentação avançada, personalização em escala e análises preditivas. O diferencial estará na estratégia e na experiência do cliente.',
      pontosFortes: ['Base de dados robusta e unificada', 'Capacidade de segmentação avançada (RFV)', 'Métricas de cliente completas (CAC, LTV)', 'Infraestrutura para automação e personalização'],
      gaps: ['Possível necessidade de integração entre canais', 'Oportunidade de explorar análises preditivas'],
    };
  }

  // === SUMÁRIO EXECUTIVO ===
  const modeloTexto: Record<string, string> = {
    'B2C': 'consumidor final (B2C)',
    'B2B': 'clientes corporativos (B2B)',
    'Assinatura/Recorrência': 'modelo de assinatura/recorrência',
    'Híbrido': 'modelo híbrido de negócios',
  };
  const desafioTexto: Record<string, string> = {
    'Reter clientes/Reduzir churn': 'retenção de clientes e redução de churn',
    'Aumentar frequência': 'aumento da frequência de compra',
    'Aumentar ticket médio': 'elevação do ticket médio',
    'Reativar inativos': 'reativação de clientes inativos',
  };

  const sumarioExecutivo = `Este plano estratégico foi elaborado para uma empresa com foco em ${modeloTexto[answers.modelo] || answers.modelo}, com frequência de compra ${answers.frequencia.toLowerCase()}. Com base no diagnóstico realizado, identificamos que a maturidade em dados de clientes está no nível "${maturidade.nivel}" (${maturidade.score}/10), e o principal desafio estratégico é ${desafioTexto[answers.desafio] || answers.desafio}. A seguir, apresentamos um plano completo com a estrutura recomendada de programa de fidelidade, ações prioritárias, KPIs de acompanhamento e um cronograma de implementação faseado. Este documento serve como guia prático para a concepção e lançamento de um programa de loyalty eficaz e mensurável.`;

  // === ESTRUTURA ===
  let estrutura;
  if (answers.tiers === 'Sim - segmentar clientes') {
    estrutura = {
      tipo: 'Programa de Tiers (Níveis de Status)',
      descricao: 'Recomendamos um programa com níveis progressivos de status, onde cada tier oferece benefícios crescentes. Essa estrutura incentiva o cliente a aumentar seu engajamento para alcançar o próximo nível, gerando um ciclo virtuoso de fidelização.',
      mecanica: 'O cliente acumula pontos ou atinge critérios de valor/frequência para subir de tier. Cada nível garante acesso a benefícios exclusivos. A manutenção do status requer atividade contínua dentro de um período definido (ex: 12 meses).',
      exemplos: ['Programa ALL (Accor) — 4 tiers com benefícios progressivos em hospedagem', 'Smiles (GOL) — categorias com multiplicadores crescentes de milhas', 'Starbucks Rewards — Gold status com bebidas grátis e personalização'],
    };
  } else if (answers.modelo === 'Assinatura/Recorrência') {
    estrutura = {
      tipo: 'Programa de Benefícios por Permanência',
      descricao: 'Para modelos de assinatura, recomendamos um programa que recompensa a permanência do cliente. Quanto mais tempo ativo, mais benefícios acumula, criando um custo de troca emocional que reduz o churn.',
      mecanica: 'Benefícios são desbloqueados automaticamente com base no tempo de assinatura ativa. Marcos de permanência (3, 6, 12 meses) liberam recompensas especiais. O valor percebido aumenta progressivamente.',
      exemplos: ['Amazon Prime — benefícios crescentes por permanência', 'Spotify — playlists e recursos exclusivos para assinantes antigos', 'Netflix — recomendações cada vez mais personalizadas com o tempo'],
    };
  } else {
    estrutura = {
      tipo: 'Programa de Pontos com Recompensas',
      descricao: 'Recomendamos iniciar com um programa de pontos direto e de fácil compreensão. A simplicidade na mecânica facilita a adesão massiva e o rápido entendimento dos clientes, além de permitir evoluções incrementais.',
      mecanica: 'Cada compra gera pontos proporcionais ao valor gasto (ex: R$1 = 1 ponto). Os pontos podem ser trocados por descontos, produtos ou experiências. Campanhas sazonais oferecem multiplicadores de pontos para acelerar o engajamento.',
      exemplos: ['Programa Pão de Açúcar Mais — pontos por compra com resgate em desconto', 'Livelo — marketplace de pontos com múltiplas opções de resgate', 'iFood — programa de cashback progressivo'],
    };
  }

  // === TIERS ===
  let tiers: TierDetail[] = [];
  if (answers.tiers === 'Sim - segmentar clientes' || answers.tiers === 'Não sei - preciso de recomendação') {
    tiers = [
      { nome: 'Bronze', criterio: 'Entrada automática ao se cadastrar no programa', beneficios: ['Acúmulo básico de pontos (1x)', 'Acesso a promoções exclusivas do programa', 'Newsletter personalizada'] },
      { nome: 'Prata', criterio: 'Atingir 500 pontos ou 5 compras em 6 meses', beneficios: ['Multiplicador de pontos 1.5x', 'Frete grátis em compras acima de determinado valor', 'Acesso antecipado a lançamentos', 'Atendimento prioritário'] },
      { nome: 'Ouro', criterio: 'Atingir 2.000 pontos ou 15 compras em 12 meses', beneficios: ['Multiplicador de pontos 2x', 'Frete grátis em todas as compras', 'Experiências exclusivas e eventos VIP', 'Gestor de conta dedicado', 'Presente de aniversário premium'] },
      { nome: 'Diamante', criterio: 'Atingir 5.000 pontos ou 30 compras em 12 meses', beneficios: ['Multiplicador de pontos 3x', 'Concierge exclusivo', 'Convites para eventos de lançamento', 'Co-criação de produtos', 'Upgrades e cortesias surpresa'] },
    ];
  }

  // === FOCO ESTRATÉGICO ===
  const focoMap: Record<string, { titulo: string; descricao: string; acoes: { acao: string; prioridade: 'Alta' | 'Média' | 'Baixa' }[] }> = {
    'Reter clientes/Reduzir churn': {
      titulo: 'Retenção e Redução de Churn',
      descricao: 'O foco principal deve ser em manter os clientes ativos e reduzir a taxa de abandono. Identifique os sinais de churn precocemente e crie gatilhos automáticos de retenção com ofertas personalizadas.',
      acoes: [
        { acao: 'Implementar sistema de alertas de inatividade baseados na recência (30, 60, 90 dias)', prioridade: 'Alta' },
        { acao: 'Criar campanhas automatizadas de win-back com escala de ofertas progressivas', prioridade: 'Alta' },
        { acao: 'Desenvolver pesquisa de NPS contínua para identificar insatisfações antes do churn', prioridade: 'Alta' },
        { acao: 'Estabelecer benefícios exclusivos e irrevogáveis para clientes de longa data', prioridade: 'Média' },
        { acao: 'Criar programa de "embaixadores" para clientes mais engajados', prioridade: 'Média' },
        { acao: 'Implementar análise preditiva de churn com machine learning', prioridade: 'Baixa' },
      ],
    },
    'Aumentar frequência': {
      titulo: 'Aumento de Frequência de Compra',
      descricao: 'Incentive os clientes a comprar com mais regularidade através de mecânicas de gamificação, recompensas por frequência e comunicação contextual personalizada.',
      acoes: [
        { acao: 'Criar sistema de "streak" — recompensas por compras consecutivas dentro de períodos definidos', prioridade: 'Alta' },
        { acao: 'Implementar ofertas periódicas personalizadas baseadas no ciclo de compra do cliente', prioridade: 'Alta' },
        { acao: 'Desenvolver programa de pontos acelerados para compras frequentes (multiplicadores temporários)', prioridade: 'Alta' },
        { acao: 'Estabelecer comunicação regular com conteúdo relevante e lembretes contextuais', prioridade: 'Média' },
        { acao: 'Criar desafios e missões com recompensas por completar ações específicas', prioridade: 'Média' },
        { acao: 'Implementar notificações push com ofertas baseadas em localização e comportamento', prioridade: 'Baixa' },
      ],
    },
    'Aumentar ticket médio': {
      titulo: 'Aumento de Ticket Médio',
      descricao: 'Estratégias focadas em aumentar o valor médio de cada transação através de upsell, cross-sell, bundles e incentivos progressivos por valor de compra.',
      acoes: [
        { acao: 'Criar faixas de benefícios baseadas no valor da compra (quanto mais gasta, mais ganha)', prioridade: 'Alta' },
        { acao: 'Implementar estratégias de bundle e cross-sell inteligentes baseadas no perfil', prioridade: 'Alta' },
        { acao: 'Desenvolver programa de cashback progressivo (5% até R$100, 8% até R$200, 12% acima)', prioridade: 'Alta' },
        { acao: 'Oferecer frete grátis ou benefícios extras para pedidos acima de determinado valor', prioridade: 'Média' },
        { acao: 'Criar categorias de produtos exclusivos disponíveis apenas para compras de alto valor', prioridade: 'Média' },
        { acao: 'Implementar recomendações personalizadas com IA baseadas no histórico de compras', prioridade: 'Baixa' },
      ],
    },
    'Reativar inativos': {
      titulo: 'Reativação de Clientes Inativos',
      descricao: 'Recupere clientes que pararam de comprar com campanhas estratégicas segmentadas por tempo de inatividade e valor histórico, utilizando ofertas irrecusáveis e comunicação emocional.',
      acoes: [
        { acao: 'Segmentar inativos por tempo de ausência e valor histórico (RFV) para priorizar esforços', prioridade: 'Alta' },
        { acao: 'Criar escada de ofertas de reativação progressiva (leve → moderada → agressiva)', prioridade: 'Alta' },
        { acao: 'Implementar pesquisa de motivo de abandono com incentivo para resposta', prioridade: 'Alta' },
        { acao: 'Desenvolver campanha "sentimos sua falta" com benefício exclusivo e prazo limitado', prioridade: 'Média' },
        { acao: 'Criar programa de "segunda chance" com pontos de boas-vindas para retorno', prioridade: 'Média' },
        { acao: 'Testar canais alternativos (SMS, WhatsApp) para clientes que não respondem a e-mail', prioridade: 'Baixa' },
      ],
    },
  };

  const foco = focoMap[answers.desafio] || focoMap['Reter clientes/Reduzir churn'];

  // === KPIs ===
  const kpisBase: KPI[] = [
    { metrica: 'Taxa de Adesão ao Programa', descricao: 'Percentual de clientes que se cadastram no programa em relação à base total', meta: '> 40% nos primeiros 6 meses' },
    { metrica: 'Taxa de Engajamento', descricao: 'Percentual de membros ativos (com pelo menos 1 transação nos últimos 90 dias)', meta: '> 60% dos membros' },
    { metrica: 'Lifetime Value (LTV)', descricao: 'Valor total gerado pelo cliente ao longo do relacionamento', meta: 'Aumento de 25% em 12 meses' },
    { metrica: 'Net Promoter Score (NPS)', descricao: 'Indicador de satisfação e propensão a recomendar a marca', meta: '> 50 pontos' },
  ];

  const kpisDesafio: Record<string, KPI[]> = {
    'Reter clientes/Reduzir churn': [
      { metrica: 'Taxa de Churn', descricao: 'Percentual de clientes que deixam de comprar em período definido', meta: 'Redução de 20% em 6 meses' },
      { metrica: 'Taxa de Retenção', descricao: 'Percentual de clientes que permanecem ativos mês a mês', meta: '> 85% mensal' },
    ],
    'Aumentar frequência': [
      { metrica: 'Frequência Média de Compra', descricao: 'Número médio de compras por cliente por período', meta: 'Aumento de 30% em 6 meses' },
      { metrica: 'Intervalo Médio entre Compras', descricao: 'Tempo médio entre transações consecutivas do mesmo cliente', meta: 'Redução de 20%' },
    ],
    'Aumentar ticket médio': [
      { metrica: 'Ticket Médio', descricao: 'Valor médio por transação', meta: 'Aumento de 15% em 6 meses' },
      { metrica: 'Revenue per Member', descricao: 'Receita média gerada por membro do programa', meta: 'Aumento de 20% em 12 meses' },
    ],
    'Reativar inativos': [
      { metrica: 'Taxa de Reativação', descricao: 'Percentual de inativos que retornam a comprar após campanha', meta: '> 15% nos primeiros 3 meses' },
      { metrica: 'Custo de Reativação', descricao: 'Investimento médio para reativar cada cliente inativo', meta: '< 30% do LTV médio' },
    ],
  };

  const kpis = [...kpisBase, ...(kpisDesafio[answers.desafio] || [])];

  // === CRONOGRAMA ===
  const cronograma: FaseImplementacao[] = [
    {
      fase: 'Fase 1 — Fundação',
      periodo: 'Meses 1-2',
      marcos: [
        'Definição dos objetivos e KPIs do programa',
        'Estruturação da base de dados de clientes',
        'Definição das regras de pontuação e benefícios',
        'Seleção e contratação de plataforma tecnológica',
        'Desenvolvimento da identidade visual do programa',
      ],
    },
    {
      fase: 'Fase 2 — Lançamento',
      periodo: 'Meses 3-4',
      marcos: [
        'Lançamento do programa para base existente',
        'Campanha de comunicação e adesão massiva',
        'Treinamento das equipes de atendimento e vendas',
        'Implementação dos primeiros benefícios e recompensas',
        'Início da coleta de dados e feedback dos membros',
      ],
    },
    {
      fase: 'Fase 3 — Otimização',
      periodo: 'Meses 5-8',
      marcos: [
        'Análise dos primeiros resultados e ajustes',
        'Implementação da segmentação RFV avançada',
        'Lançamento de campanhas personalizadas por segmento',
        'Expansão dos canais de comunicação',
        'Introdução de mecânicas de gamificação',
      ],
    },
    {
      fase: 'Fase 4 — Escala',
      periodo: 'Meses 9-12',
      marcos: [
        'Implementação de tiers/níveis (se aplicável)',
        'Parcerias estratégicas para ampliar benefícios',
        'Automação completa de campanhas e triggers',
        'Análises preditivas e personalização avançada',
        'Planejamento da evolução do programa (ano 2)',
      ],
    },
  ];

  // === CHECKLIST ===
  const checklist = [
    'Definir os objetivos mensuráveis do programa (KPIs)',
    'Mapear a jornada do cliente e pontos de contato',
    'Estruturar a base de dados de clientes com campos RFV',
    'Definir as regras de pontuação, benefícios e resgate',
    'Elaborar o regulamento e termos do programa',
    'Criar a identidade visual e comunicação de lançamento',
    'Selecionar e implementar plataforma tecnológica',
    'Treinar equipes de atendimento e vendas',
    'Implementar a análise RFV para segmentação inicial',
    'Configurar automações de comunicação por segmento',
    'Definir métricas de acompanhamento e dashboards',
    'Planejar a evolução do programa (roadmap 12 meses)',
  ];

  if (maturidade.nivel === 'Inicial') {
    checklist.unshift('Investir em um CRM ou plataforma de dados de clientes');
    checklist.unshift('Realizar censo da base atual de clientes e dados disponíveis');
  }

  return { sumarioExecutivo, maturidade, estrutura, tiers, foco, kpis, cronograma, checklist };
}
