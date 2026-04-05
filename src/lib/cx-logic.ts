export interface CXTicket {
  id_chamado: string;
  cliente: string;
  tma_minutos: number;
  tme_minutos: number;
  nps_score: number;
  fcr: number; // 0 or 1
  causa_raiz: string;
  tipo_chamado: string;
  data_chamado: string;
  transcricao: string;
  comentario_nps: string;
}

export interface CXKPIs {
  total_chamados: number;
  tma_medio: number;
  tme_medio: number;
  nps_real: number;
  fcr_rate: number;
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
  tme_medio: number;
  nps_real: number;
  pct_promotores: number;
  pct_detratores: number;
  fcr_rate: number;
  impacto_nps: number;
}

export interface NPSDistribution {
  categoria: string;
  count: number;
  pct: number;
  color: string;
  faixa: 'promotores' | 'neutros' | 'detratores';
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
  if (tickets.length === 0) return { total_chamados: 0, tma_medio: 0, tme_medio: 0, nps_real: 0, fcr_rate: 0, pct_promotores: 0, pct_neutros: 0, pct_detratores: 0, causas_unicas: 0 };
  const { nps, pctPromo, pctNeutro, pctDetrator } = calcNPS(tickets);
  const causas = new Set(tickets.map(t => t.causa_raiz));
  return {
    total_chamados: tickets.length,
    tma_medio: tickets.reduce((s, t) => s + t.tma_minutos, 0) / tickets.length,
    tme_medio: tickets.reduce((s, t) => s + t.tme_minutos, 0) / tickets.length,
    nps_real: nps,
    fcr_rate: (tickets.filter(t => t.fcr === 1).length / tickets.length) * 100,
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
    { categoria: 'Promotores (9-10)', count: promotores, pct: (promotores / total) * 100, color: 'hsl(145, 60%, 45%)', faixa: 'promotores' },
    { categoria: 'Neutros (7-8)', count: neutros, pct: (neutros / total) * 100, color: 'hsl(45, 80%, 50%)', faixa: 'neutros' },
    { categoria: 'Detratores (0-6)', count: detratores, pct: (detratores / total) * 100, color: 'hsl(0, 70%, 50%)', faixa: 'detratores' },
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
      const tme_medio = tks.reduce((s, t) => s + t.tme_minutos, 0) / tks.length;
      const fcr_rate = (tks.filter(t => t.fcr === 1).length / tks.length) * 100;
      const proporcao = tks.length / tickets.length;
      const impacto_nps = (npsGeral - nps_real) * proporcao;
      return { causa, count: tks.length, pct: proporcao * 100, tma_medio, tme_medio, nps_real, pct_promotores, pct_detratores, fcr_rate, impacto_nps };
    })
    .sort((a, b) => b.count - a.count);
}

export function generateCXSummary(tickets: CXTicket[]): string {
  if (tickets.length === 0) return 'Sem dados para análise.';
  
  const kpis = calculateCXKPIs(tickets);
  const causas = analyzeCausasRaiz(tickets);
  
  // NPS classification
  const npsClass = kpis.nps_real >= 75 ? 'excelente' : kpis.nps_real >= 50 ? 'muito bom' : kpis.nps_real >= 0 ? 'regular' : 'crítico';
  
  // Top causes by volume
  const top3Volume = causas.slice(0, 3);
  const concentracao = top3Volume.reduce((s, c) => s + c.pct, 0);
  
  // Worst NPS causes
  const worstNPS = [...causas].sort((a, b) => a.nps_real - b.nps_real).slice(0, 3);
  
  // TME x NPS correlation
  const highTME = tickets.filter(t => t.tme_minutos > 5);
  const lowTME = tickets.filter(t => t.tme_minutos <= 5);
  const npsHighTME = highTME.length > 0 ? calcNPS(highTME).nps : 0;
  const npsLowTME = lowTME.length > 0 ? calcNPS(lowTME).nps : 0;
  
  // Tipo distribution
  const tipos: Record<string, number> = {};
  tickets.forEach(t => { tipos[t.tipo_chamado] = (tipos[t.tipo_chamado] || 0) + 1; });
  const tiposSorted = Object.entries(tipos).sort((a, b) => b[1] - a[1]);
  const tipoPrincipal = tiposSorted[0];
  
  // FCR by tipo
  const reclamacoes = tickets.filter(t => t.tipo_chamado === 'Reclamação');
  const fcrReclamacao = reclamacoes.length > 0 ? (reclamacoes.filter(t => t.fcr === 1).length / reclamacoes.length) * 100 : 0;
  
  let summary = `A base analisada contém ${kpis.total_chamados} chamados com um NPS de ${kpis.nps_real.toFixed(1)} (${npsClass}), composto por ${kpis.pct_promotores.toFixed(1)}% de promotores e ${kpis.pct_detratores.toFixed(1)}% de detratores. `;
  
  summary += `As três principais causas raiz — ${top3Volume.map(c => `"${c.causa}" (${c.count})`).join(', ')} — concentram ${concentracao.toFixed(1)}% dos chamados. `;
  
  summary += `As causas com pior NPS são: ${worstNPS.map(c => `"${c.causa}" (NPS ${c.nps_real.toFixed(1)})`).join(', ')}. `;
  
  summary += `O TMA médio é de ${kpis.tma_medio.toFixed(1)} minutos e o TME médio é de ${kpis.tme_medio.toFixed(1)} minutos. `;
  
  summary += `Chamados com TME acima de 5 minutos apresentam NPS médio de ${npsHighTME.toFixed(1)}, contra ${npsLowTME.toFixed(1)} para TME abaixo de 5 minutos, evidenciando o impacto negativo do tempo de espera na satisfação. `;
  
  summary += `A taxa de resolução no primeiro contato (FCR) é de ${kpis.fcr_rate.toFixed(1)}% no geral`;
  if (reclamacoes.length > 0) {
    summary += `, caindo para ${fcrReclamacao.toFixed(1)}% nas reclamações`;
  }
  summary += `. `;
  
  summary += `O tipo de chamado mais frequente é "${tipoPrincipal[0]}" com ${tipoPrincipal[1]} ocorrências (${((tipoPrincipal[1] / tickets.length) * 100).toFixed(1)}%). `;
  
  const tiposStr = tiposSorted.map(([t, c]) => `${t}: ${((c / tickets.length) * 100).toFixed(1)}%`).join(', ');
  summary += `Distribuição por tipo: ${tiposStr}.`;
  
  return summary;
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

export const tiposChamado = ['Reclamação', 'Informação', 'Compra', 'Suporte Técnico', 'Cancelamento'];

let hueCounter = 0;
export function getCausaColor(causa: string): string {
  if (causaColors[causa]) return causaColors[causa];
  hueCounter += 37;
  const color = `hsl(${(hueCounter * 137) % 360}, 55%, 50%)`;
  causaColors[causa] = color;
  return color;
}
