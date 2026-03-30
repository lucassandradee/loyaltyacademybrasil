export interface DiagnosticAnswers {
  modelo: string;
  frequencia: string;
  dados: string;
  infos: string[];
  desafio: string;
  tiers: string;
}

export interface DiagnosticResult {
  maturidade: { nivel: string; descricao: string; score: number };
  estrutura: { tipo: string; descricao: string };
  foco: { titulo: string; descricao: string; acoes: string[] };
  checklist: string[];
}

export function generateDiagnostic(answers: DiagnosticAnswers): DiagnosticResult {
  // Maturidade score
  const dataScores: Record<string, number> = {
    'Sem dados estruturados': 1,
    'Planilhas': 2,
    'PDV básico': 3,
    'CRM estruturado': 4,
    'Plataforma de dados avançada': 5,
  };
  const dataScore = dataScores[answers.dados] || 1;
  const infoScore = Math.min(answers.infos.length, 5);
  const totalScore = dataScore + infoScore;

  let maturidade;
  if (totalScore <= 3) {
    maturidade = { nivel: 'Inicial', descricao: 'Sua empresa está nos estágios iniciais de gestão de dados de clientes. Há uma grande oportunidade de estruturar processos e criar uma base sólida para um programa de fidelidade.', score: totalScore };
  } else if (totalScore <= 6) {
    maturidade = { nivel: 'Em Desenvolvimento', descricao: 'Você já possui alguma estrutura de dados, mas ainda há lacunas importantes. Com investimentos pontuais em tecnologia e processos, é possível implementar um programa de loyalty eficaz.', score: totalScore };
  } else {
    maturidade = { nivel: 'Avançado', descricao: 'Sua empresa possui uma boa maturidade em dados de clientes. Você está pronto para implementar um programa de fidelidade sofisticado com segmentação avançada e personalização.', score: totalScore };
  }

  // Estrutura recomendada
  let estrutura;
  if (answers.tiers === 'Sim - segmentar clientes') {
    estrutura = {
      tipo: 'Programa de Tiers (Níveis)',
      descricao: 'Recomendamos um programa com 3-4 níveis de status (ex: Bronze, Prata, Ouro, Diamante). Cada nível oferece benefícios progressivos, incentivando os clientes a aumentar seu engajamento para subir de tier.',
    };
  } else if (answers.modelo === 'Assinatura/Recorrência') {
    estrutura = {
      tipo: 'Programa de Benefícios por Tempo',
      descricao: 'Para modelos de assinatura, recomendamos um programa que recompensa a permanência. Quanto mais tempo o cliente fica, mais benefícios acumula. Foco em redução de churn e aumento de LTV.',
    };
  } else {
    estrutura = {
      tipo: 'Programa de Pontos Simples',
      descricao: 'Recomendamos iniciar com um programa de pontos direto e simples. Cada compra gera pontos que podem ser trocados por benefícios. A simplicidade facilita a adesão e o entendimento dos clientes.',
    };
  }

  // Foco estratégico
  const focoMap: Record<string, { titulo: string; descricao: string; acoes: string[] }> = {
    'Reter clientes/Reduzir churn': {
      titulo: 'Retenção e Redução de Churn',
      descricao: 'O foco principal deve ser em manter os clientes ativos e reduzir a taxa de abandono. Identifique os sinais de churn e crie gatilhos automáticos de retenção.',
      acoes: [
        'Implementar alertas de inatividade baseados na recência',
        'Criar campanhas de win-back automatizadas para clientes em risco',
        'Desenvolver pesquisa de NPS para identificar insatisfações',
        'Estabelecer benefícios exclusivos para clientes de longa data',
      ],
    },
    'Aumentar frequência': {
      titulo: 'Aumento de Frequência de Compra',
      descricao: 'Incentive os clientes a comprar com mais regularidade através de mecânicas de gamificação e recompensas por frequência.',
      acoes: [
        'Criar sistema de "streak" - recompensas por compras consecutivas',
        'Implementar ofertas periódicas personalizadas',
        'Desenvolver programa de pontos acelerados para compras frequentes',
        'Estabelecer comunicação regular com conteúdo relevante',
      ],
    },
    'Aumentar ticket médio': {
      titulo: 'Aumento de Ticket Médio',
      descricao: 'Estratégias focadas em aumentar o valor médio de cada transação através de upsell, cross-sell e incentivos por valor.',
      acoes: [
        'Criar faixas de benefícios baseadas no valor da compra',
        'Implementar estratégias de bundle e cross-sell',
        'Desenvolver programa de cashback progressivo',
        'Oferecer frete grátis ou benefícios para pedidos acima de determinado valor',
      ],
    },
    'Reativar inativos': {
      titulo: 'Reativação de Clientes Inativos',
      descricao: 'Recupere clientes que pararam de comprar com campanhas estratégicas e ofertas irrecusáveis.',
      acoes: [
        'Segmentar inativos por tempo de ausência e valor histórico',
        'Criar escada de ofertas de reativação (leve → agressiva)',
        'Implementar pesquisa de motivo de abandono',
        'Desenvolver campanha "sentimos sua falta" com benefício exclusivo',
      ],
    },
  };

  const foco = focoMap[answers.desafio] || focoMap['Reter clientes/Reduzir churn'];

  // Checklist
  const checklist = [
    'Definir os objetivos mensuráveis do programa (KPIs)',
    'Estruturar a base de dados de clientes com campos RFV',
    'Definir as regras de pontuação e benefícios',
    'Criar a comunicação de lançamento do programa',
    'Implementar a análise RFV para segmentação inicial',
    'Configurar automações de comunicação por segmento',
    'Definir métricas de acompanhamento mensal',
    'Planejar a evolução do programa (fase 2)',
  ];

  if (maturidade.nivel === 'Inicial') {
    checklist.unshift('Investir em um CRM ou plataforma de dados de clientes');
  }

  return { maturidade, estrutura, foco, checklist };
}
