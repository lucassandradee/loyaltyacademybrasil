export interface CXTicket {
  id_chamado: string;
  cliente: string;
  tma_minutos: number;
  nps_score: number;
  causa_raiz: string;
  data_chamado: string;
}

export interface CXKPIs {
  total_chamados: number;
  tma_medio: number;
  nps_real: number;
  pct_promotores: number;
  pct_neutros: number;
  pct_detratores: number;
  causas_unicas: number;
}

export interface CausaRaizAnalysis {
  causa: string;
  count: number;
  pct: number;
  tma_medio: number;
  nps_real: number;
  pct_promotores: number;
  pct_detratores: number;
  impacto_nps: number;
}

export interface NPSDistribution {
  categoria: string;
  count: number;
  pct: number;
  color: string;
}

function calcNPS(tickets: { nps_score: number }[]) {
  if (tickets.length === 0) return { nps: 0, pctPromo: 0, pctNeutro: 0, pctDetrator: 0 };
  const promotores = tickets.filter(t => t.nps_score >= 9).length;
  const detratores = tickets.filter(t => t.nps_score <= 6).length;
  const neutros = tickets.length - promotores - detratores;
  const pctPromo = (promotores / tickets.length) * 100;
  const pctDetrator = (detratores / tickets.length) * 100;
  const pctNeutro = (neutros / tickets.length) * 100;
  return { nps: pctPromo - pctDetrator, pctPromo, pctNeutro, pctDetrator };
}

export function calculateCXKPIs(tickets: CXTicket[]): CXKPIs {
  if (tickets.length === 0) return { total_chamados: 0, tma_medio: 0, nps_real: 0, pct_promotores: 0, pct_neutros: 0, pct_detratores: 0, causas_unicas: 0 };
  const tmas = tickets.map(t => t.tma_minutos);
  const { nps, pctPromo, pctNeutro, pctDetrator } = calcNPS(tickets);
  const causas = new Set(tickets.map(t => t.causa_raiz));
  return {
    total_chamados: tickets.length,
    tma_medio: tmas.reduce((a, b) => a + b, 0) / tmas.length,
    nps_real: nps,
    pct_promotores: pctPromo,
    pct_neutros: pctNeutro,
    pct_detratores: pctDetrator,
    causas_unicas: causas.size,
  };
}

export function getNPSDistribution(tickets: CXTicket[]): NPSDistribution[] {
  const promotores = tickets.filter(t => t.nps_score >= 9).length;
  const neutros = tickets.filter(t => t.nps_score >= 7 && t.nps_score <= 8).length;
  const detratores = tickets.filter(t => t.nps_score <= 6).length;
  const total = tickets.length || 1;
  return [
    { categoria: 'Promotores (9-10)', count: promotores, pct: (promotores / total) * 100, color: 'hsl(145, 60%, 45%)' },
    { categoria: 'Neutros (7-8)', count: neutros, pct: (neutros / total) * 100, color: 'hsl(45, 80%, 50%)' },
    { categoria: 'Detratores (0-6)', count: detratores, pct: (detratores / total) * 100, color: 'hsl(0, 70%, 50%)' },
  ];
}

export function analyzeCausasRaiz(tickets: CXTicket[]): CausaRaizAnalysis[] {
  if (tickets.length === 0) return [];
  const { nps: npsGeral } = calcNPS(tickets);
  const groups: Record<string, CXTicket[]> = {};
  tickets.forEach(t => {
    if (!groups[t.causa_raiz]) groups[t.causa_raiz] = [];
    groups[t.causa_raiz].push(t);
  });
  return Object.entries(groups)
    .map(([causa, tks]) => {
      const { nps: nps_real, pctPromo: pct_promotores, pctDetrator: pct_detratores } = calcNPS(tks);
      const tma_medio = tks.reduce((s, t) => s + t.tma_minutos, 0) / tks.length;
      const proporcao = tks.length / tickets.length;
      const impacto_nps = (npsGeral - nps_real) * proporcao;
      return { causa, count: tks.length, pct: proporcao * 100, tma_medio, nps_real, pct_promotores, pct_detratores, impacto_nps };
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

// Assign colors dynamically for unknown causes
let hueCounter = 0;
export function getCausaColor(causa: string): string {
  if (causaColors[causa]) return causaColors[causa];
  hueCounter += 37;
  const color = `hsl(${(hueCounter * 137) % 360}, 55%, 50%)`;
  causaColors[causa] = color;
  return color;
}
