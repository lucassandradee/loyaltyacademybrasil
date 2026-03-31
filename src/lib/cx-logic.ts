export interface CXTicket {
  id_chamado: string;
  cliente: string;
  tma_minutos: number;
  nps_score: number;
  causa_raiz: string;
  data_chamado: string;
}

export interface CXKPIs {
  tma_medio: number;
  tma_min: number;
  tma_max: number;
  nps_medio: number;
  nps_min: number;
  nps_max: number;
}

export interface CausaRaizAnalysis {
  causa: string;
  count: number;
  pct: number;
  nps_medio: number;
  impacto_nps: number;
}

export function calculateCXKPIs(tickets: CXTicket[]): CXKPIs {
  if (tickets.length === 0) return { tma_medio: 0, tma_min: 0, tma_max: 0, nps_medio: 0, nps_min: 0, nps_max: 0 };
  const tmas = tickets.map(t => t.tma_minutos);
  const npss = tickets.map(t => t.nps_score);
  return {
    tma_medio: tmas.reduce((a, b) => a + b, 0) / tmas.length,
    tma_min: Math.min(...tmas),
    tma_max: Math.max(...tmas),
    nps_medio: npss.reduce((a, b) => a + b, 0) / npss.length,
    nps_min: Math.min(...npss),
    nps_max: Math.max(...npss),
  };
}

export function analyzeCausasRaiz(tickets: CXTicket[]): CausaRaizAnalysis[] {
  if (tickets.length === 0) return [];
  const npsGeral = tickets.reduce((s, t) => s + t.nps_score, 0) / tickets.length;
  const groups: Record<string, CXTicket[]> = {};
  tickets.forEach(t => {
    if (!groups[t.causa_raiz]) groups[t.causa_raiz] = [];
    groups[t.causa_raiz].push(t);
  });
  return Object.entries(groups)
    .map(([causa, tks]) => {
      const nps_medio = tks.reduce((s, t) => s + t.nps_score, 0) / tks.length;
      const proporcao = tks.length / tickets.length;
      const impacto_nps = (npsGeral - nps_medio) * proporcao;
      return { causa, count: tks.length, pct: proporcao * 100, nps_medio, impacto_nps };
    })
    .sort((a, b) => b.count - a.count);
}

export const causaColors: Record<string, string> = {
  'Atraso na entrega': 'hsl(15, 80%, 55%)',
  'Produto com defeito': 'hsl(0, 70%, 50%)',
  'Cobrança indevida': 'hsl(45, 80%, 50%)',
  'Atendimento ruim': 'hsl(270, 50%, 55%)',
  'Troca/Devolução': 'hsl(200, 70%, 50%)',
  'Dúvida sobre produto': 'hsl(145, 60%, 40%)',
  'Problema no site/app': 'hsl(220, 60%, 55%)',
  'Cancelamento': 'hsl(340, 65%, 50%)',
};

export const defaultCausas = Object.keys(causaColors);

export interface ActionPlan5W2H {
  what: string; why: string; where: string; when: string; who: string; how: string; howMuch: string;
}

export interface EisenhowerMatrix {
  urgentImportant: string[];
  notUrgentImportant: string[];
  urgentNotImportant: string[];
  notUrgentNotImportant: string[];
}

export function generateCX5W2H(causas: CausaRaizAnalysis[]): Record<string, ActionPlan5W2H[]> {
  const plans: Record<string, ActionPlan5W2H[]> = {};
  causas.slice(0, 5).forEach(c => {
    plans[c.causa] = [
      {
        what: `Plano de correção: ${c.causa}`,
        why: `Representa ${c.pct.toFixed(1)}% dos chamados com impacto de ${c.impacto_nps.toFixed(1)} pontos no NPS`,
        where: 'Área responsável + CX',
        when: c.impacto_nps > 0.5 ? 'Imediato — urgente' : 'Próximos 30 dias',
        who: 'Gerência de CX e área operacional',
        how: `Análise de causa raiz profunda, implementar correção e monitorar por 30 dias`,
        howMuch: c.count > 20 ? 'Alto investimento justificado pelo volume' : 'Médio investimento',
      },
      {
        what: `Comunicação proativa sobre ${c.causa.toLowerCase()}`,
        why: 'Reduzir volume de chamados e melhorar percepção',
        where: 'E-mail, app, FAQ',
        when: 'Próximos 15 dias',
        who: 'Comunicação e CX',
        how: 'FAQ atualizado, comunicação proativa, status tracking',
        howMuch: 'Baixo custo',
      },
    ];
  });
  return plans;
}

export function generateCXEisenhower(causas: CausaRaizAnalysis[]): Record<string, EisenhowerMatrix> {
  const matrices: Record<string, EisenhowerMatrix> = {};
  causas.slice(0, 5).forEach(c => {
    matrices[c.causa] = {
      urgentImportant: [
        `Investigar e corrigir causa raiz de "${c.causa}"`,
        `Treinar equipe para lidar com "${c.causa}" de forma eficiente`,
      ],
      notUrgentImportant: [
        `Automatizar resolução de casos simples de "${c.causa}"`,
        `Criar base de conhecimento para "${c.causa}"`,
      ],
      urgentNotImportant: [
        `Atualizar scripts de atendimento para "${c.causa}"`,
        `Comunicar clientes afetados sobre melhorias`,
      ],
      notUrgentNotImportant: [
        `Benchmark de mercado para "${c.causa}"`,
        `Documentar lições aprendidas`,
      ],
    };
  });
  return matrices;
}
