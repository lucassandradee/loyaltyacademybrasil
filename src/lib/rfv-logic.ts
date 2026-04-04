export interface ClientData {
  nome: string;
  id_cliente: string;
  recencia: number;
  frequencia: number;
  valor: number;
}

export interface RFVParams {
  recencia: { top: number; mid_min: number; mid_max: number; entry: number };
  frequencia: { top: number; mid_min: number; mid_max: number; entry_min: number; entry_max: number };
  valor: { top: number; mid_min: number; mid_max: number; entry: number };
}

export interface RFVPercentileParams {
  numScores: number;
  recencia: number[];   // percentile cutoffs e.g. [33.3, 66.6] for 3 scores
  frequencia: number[];
  valor: number[];
}

export interface ScoredClient extends ClientData {
  r_score: number;
  f_score: number;
  v_score: number;
  rfv_code: string;
  cluster: string;
}

export const defaultParams: RFVParams = {
  recencia: { top: 30, mid_min: 31, mid_max: 90, entry: 90 },
  frequencia: { top: 6, mid_min: 4, mid_max: 5, entry_min: 1, entry_max: 3 },
  valor: { top: 5000, mid_min: 1501, mid_max: 4999, entry: 1501 },
};

export function defaultPercentileParams(numScores: number = 3): RFVPercentileParams {
  // Top-heavy distribution for freq/valor: top score always ~10%, bottom score ~50%
  const freqValCuts: number[] = [];
  if (numScores === 2) {
    freqValCuts.push(90);
  } else if (numScores === 3) {
    freqValCuts.push(50, 90);
  } else if (numScores === 4) {
    freqValCuts.push(35, 65, 90);
  } else if (numScores === 5) {
    freqValCuts.push(25, 50, 70, 90);
  } else {
    const midCount = numScores - 2;
    freqValCuts.push(50);
    for (let i = 1; i < midCount; i++) {
      freqValCuts.push(50 + (40 * i) / midCount);
    }
    freqValCuts.push(90);
  }

  // For recência (inverted: lower = better), mirror the cutoffs so Score 3 = bottom 10%
  // freq/valor [50, 90] → recência [10, 50] (inverted mirror)
  const recCuts = freqValCuts.map(c => 100 - c).reverse();

  const roundArr = (arr: number[]) => arr.map(c => Math.round(c * 10) / 10);
  return {
    numScores,
    recencia: roundArr(recCuts),
    frequencia: roundArr(freqValCuts),
    valor: roundArr(freqValCuts),
  };
}

export const clusterMap: Record<string, string> = {
  '333': 'Campeão',
  '233': 'Fidelizado', '323': 'Fidelizado',
  '332': 'Potencial para ser fidelizado', '232': 'Potencial para ser fidelizado',
  '223': 'Potencial para ser fidelizado', '322': 'Potencial para ser fidelizado',
  '222': 'Potencial para ser fidelizado', '313': 'Potencial para ser fidelizado',
  '312': 'Potencial para ser fidelizado',
  '331': 'Promissor', '321': 'Promissor', '212': 'Promissor',
  '231': 'Promissor', '213': 'Promissor',
  '113': 'Em risco', '133': 'Em risco', '131': 'Em risco',
  '122': 'Em risco', '112': 'Em risco', '123': 'Em risco', '132': 'Em risco',
  '121': 'Precisa de atenção', '221': 'Precisa de atenção',
  '111': 'Hibernando', '211': 'Hibernando',
  '311': 'Novos Clientes',
};

export const clusterColors: Record<string, string> = {
  'Campeão': 'hsl(145, 60%, 40%)',
  'Fidelizado': 'hsl(200, 70%, 50%)',
  'Potencial para ser fidelizado': 'hsl(40, 80%, 55%)',
  'Promissor': 'hsl(270, 50%, 55%)',
  'Em risco': 'hsl(15, 80%, 55%)',
  'Precisa de atenção': 'hsl(30, 90%, 55%)',
  'Hibernando': 'hsl(220, 15%, 60%)',
  'Novos Clientes': 'hsl(170, 60%, 45%)',
};

export const clusterActions: Record<string, string> = {
  'Campeão': 'Oferecer experiências VIP e pedir indicações. Não dar descontos agressivos. Programa de embaixadores e acesso antecipado a lançamentos.',
  'Fidelizado': 'Recompensar com upgrades e benefícios exclusivos. Cross-sell e up-sell de produtos complementares. Programa de pontos acelerado.',
  'Potencial para ser fidelizado': 'Engajar com ofertas de valor. Campanhas de relacionamento e conteúdo relevante. Incentivar aumento de frequência com benefícios progressivos.',
  'Promissor': 'Nutrir o relacionamento com comunicação personalizada. Ofertas de boas-vindas e incentivos para segunda compra. Onboarding do programa de fidelidade.',
  'Em risco': 'Campanhas urgentes de retenção com ofertas personalizadas. Pesquisa de satisfação para entender motivos. Win-back com benefício irrecusável.',
  'Precisa de atenção': 'Reengajar com campanhas de "sentimos sua falta". Ofertas limitadas e com urgência. Pesquisa de NPS para identificar problemas.',
  'Hibernando': 'Campanhas agressivas de reativação ou considerar descarte. Oferta de último recurso. Análise de custo-benefício da reativação vs aquisição.',
  'Novos Clientes': 'Onboarding excepcional e primeira experiência memorável. Apresentar o programa de fidelidade. Incentivar segunda compra com benefício especial.',
};

// --- Percentile scoring ---

/** Given sorted ascending array and a percentile (0-100), return the value at that percentile */
function valueAtPercentile(sorted: number[], pct: number): number {
  if (sorted.length === 0) return 0;
  const idx = (pct / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

/** Compute real cutoff values from data for a set of percentile cutoffs */
export function computeRealCutoffs(values: number[], percentiles: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return percentiles.map(p => valueAtPercentile(sorted, p));
}

/**
 * Assign score based on percentile cutoff values.
 * cutoffValues are the real values at each percentile boundary, sorted ascending.
 * For "ascending" metrics (frequency, value): higher value = higher score.
 * For "inverted" metrics (recency): lower value = higher score.
 */
function scoreByPercentileCutoffs(value: number, cutoffValues: number[], inverted: boolean): number {
  if (inverted) {
    // Lower value = higher score. cutoffValues are ascending.
    // e.g. cutoffs [30, 90] for 3 scores:
    // value <= 30 → score 3, value <= 90 → score 2, else → score 1
    for (let i = 0; i < cutoffValues.length; i++) {
      if (value <= cutoffValues[i]) return cutoffValues.length - i + 1;
    }
    return 1;
  } else {
    // Higher value = higher score. cutoffValues are ascending.
    // e.g. cutoffs [1850, 5200] for 3 scores:
    // value > 5200 → score 3, value > 1850 → score 2, else → score 1
    for (let i = cutoffValues.length - 1; i >= 0; i--) {
      if (value > cutoffValues[i]) return cutoffValues.length - i + 1;
    }
    return 1;
  }
}

/** Map a dynamic score (1..N) to a normalized 1-3 score for cluster mapping */
function normalizeScore(score: number, numScores: number): number {
  if (numScores <= 3) return score;
  // Map 1..N to 1..3
  const ratio = (score - 1) / (numScores - 1); // 0..1
  if (ratio >= 0.667) return 3;
  if (ratio >= 0.333) return 2;
  return 1;
}

export function scoreClientsPercentile(clients: ClientData[], params: RFVPercentileParams): ScoredClient[] {
  const recValues = clients.map(c => c.recencia);
  const freqValues = clients.map(c => c.frequencia);
  const valValues = clients.map(c => c.valor);

  const recCutoffs = computeRealCutoffs(recValues, params.recencia);
  const freqCutoffs = computeRealCutoffs(freqValues, params.frequencia);
  const valCutoffs = computeRealCutoffs(valValues, params.valor);

  return clients.map(c => {
    const r_raw = scoreByPercentileCutoffs(c.recencia, recCutoffs, true);
    const f_raw = scoreByPercentileCutoffs(c.frequencia, freqCutoffs, false);
    const v_raw = scoreByPercentileCutoffs(c.valor, valCutoffs, false);

    const r = normalizeScore(r_raw, params.numScores);
    const f = normalizeScore(f_raw, params.numScores);
    const v = normalizeScore(v_raw, params.numScores);

    const code = `${r}${f}${v}`;
    return {
      ...c,
      r_score: r_raw,
      f_score: f_raw,
      v_score: v_raw,
      rfv_code: code,
      cluster: clusterMap[code] || 'Não classificado',
    };
  });
}

// Legacy scoring functions (kept for backward compat)
export function scoreRecencia(dias: number, params: RFVParams): number {
  if (dias < params.recencia.top) return 3;
  if (dias <= params.recencia.mid_max) return 2;
  return 1;
}

export function scoreFrequencia(freq: number, params: RFVParams): number {
  if (freq >= params.frequencia.top) return 3;
  if (freq >= params.frequencia.mid_min) return 2;
  return 1;
}

export function scoreValor(val: number, params: RFVParams): number {
  if (val >= params.valor.top) return 3;
  if (val >= params.valor.mid_min) return 2;
  return 1;
}

export function scoreClients(clients: ClientData[], params: RFVParams | RFVPercentileParams): ScoredClient[] {
  if ('numScores' in params) {
    return scoreClientsPercentile(clients, params);
  }
  return clients.map(c => {
    const r = scoreRecencia(c.recencia, params);
    const f = scoreFrequencia(c.frequencia, params);
    const v = scoreValor(c.valor, params);
    const code = `${r}${f}${v}`;
    return {
      ...c,
      r_score: r,
      f_score: f,
      v_score: v,
      rfv_code: code,
      cluster: clusterMap[code] || 'Não classificado',
    };
  });
}

export const demoData: ClientData[] = [
  { nome: 'Ana Silva', id_cliente: '001', recencia: 5, frequencia: 12, valor: 8500 },
  { nome: 'Bruno Costa', id_cliente: '002', recencia: 15, frequencia: 8, valor: 6200 },
  { nome: 'Carla Mendes', id_cliente: '003', recencia: 45, frequencia: 6, valor: 4500 },
  { nome: 'Daniel Oliveira', id_cliente: '004', recencia: 120, frequencia: 2, valor: 1200 },
  { nome: 'Elena Santos', id_cliente: '005', recencia: 200, frequencia: 1, valor: 800 },
  { nome: 'Felipe Rocha', id_cliente: '006', recencia: 10, frequencia: 10, valor: 7800 },
  { nome: 'Gabriela Lima', id_cliente: '007', recencia: 60, frequencia: 4, valor: 3200 },
  { nome: 'Hugo Ferreira', id_cliente: '008', recencia: 90, frequencia: 3, valor: 2100 },
  { nome: 'Isabela Souza', id_cliente: '009', recencia: 3, frequencia: 15, valor: 12000 },
  { nome: 'João Pereira', id_cliente: '010', recencia: 30, frequencia: 7, valor: 5500 },
  { nome: 'Karen Almeida', id_cliente: '011', recencia: 150, frequencia: 1, valor: 600 },
  { nome: 'Lucas Martins', id_cliente: '012', recencia: 25, frequencia: 5, valor: 3800 },
  { nome: 'Marina Barbosa', id_cliente: '013', recencia: 70, frequencia: 3, valor: 1800 },
  { nome: 'Neto Araújo', id_cliente: '014', recencia: 8, frequencia: 9, valor: 6900 },
  { nome: 'Olívia Nascimento', id_cliente: '015', recencia: 180, frequencia: 2, valor: 1500 },
  { nome: 'Paulo Ribeiro', id_cliente: '016', recencia: 40, frequencia: 6, valor: 4200 },
  { nome: 'Quitéria Dias', id_cliente: '017', recencia: 95, frequencia: 1, valor: 900 },
  { nome: 'Rafael Gomes', id_cliente: '018', recencia: 12, frequencia: 11, valor: 9500 },
  { nome: 'Sandra Teixeira', id_cliente: '019', recencia: 55, frequencia: 4, valor: 2800 },
  { nome: 'Thiago Cardoso', id_cliente: '020', recencia: 22, frequencia: 8, valor: 7100 },
  { nome: 'Ursula Fonseca', id_cliente: '021', recencia: 110, frequencia: 2, valor: 1100 },
  { nome: 'Vinícius Lopes', id_cliente: '022', recencia: 35, frequencia: 5, valor: 3500 },
  { nome: 'Wagner Campos', id_cliente: '023', recencia: 160, frequencia: 1, valor: 700 },
  { nome: 'Xuxa Menezes', id_cliente: '024', recencia: 7, frequencia: 13, valor: 11000 },
  { nome: 'Yara Correia', id_cliente: '025', recencia: 50, frequencia: 4, valor: 2600 },
  { nome: 'Zélia Pinto', id_cliente: '026', recencia: 85, frequencia: 3, valor: 1900 },
  { nome: 'André Castro', id_cliente: '027', recencia: 20, frequencia: 7, valor: 5800 },
  { nome: 'Beatriz Moura', id_cliente: '028', recencia: 130, frequencia: 2, valor: 1400 },
  { nome: 'Cássio Vieira', id_cliente: '029', recencia: 18, frequencia: 9, valor: 7500 },
  { nome: 'Diana Reis', id_cliente: '030', recencia: 65, frequencia: 3, valor: 2300 },
  { nome: 'Eduardo Nunes', id_cliente: '031', recencia: 4, frequencia: 14, valor: 10500 },
  { nome: 'Fátima Azevedo', id_cliente: '032', recencia: 75, frequencia: 4, valor: 3000 },
  { nome: 'Gustavo Henrique', id_cliente: '033', recencia: 100, frequencia: 2, valor: 1300 },
  { nome: 'Helena Monteiro', id_cliente: '034', recencia: 28, frequencia: 6, valor: 4800 },
  { nome: 'Igor Sampaio', id_cliente: '035', recencia: 140, frequencia: 1, valor: 500 },
  { nome: 'Juliana Franco', id_cliente: '036', recencia: 38, frequencia: 5, valor: 3600 },
  { nome: 'Klaus Medeiros', id_cliente: '037', recencia: 9, frequencia: 10, valor: 8200 },
  { nome: 'Lívia Pacheco', id_cliente: '038', recencia: 170, frequencia: 1, valor: 750 },
  { nome: 'Marcos Duarte', id_cliente: '039', recencia: 42, frequencia: 5, valor: 3900 },
  { nome: 'Natália Borges', id_cliente: '040', recencia: 15, frequencia: 8, valor: 6500 },
  { nome: 'Oscar Tavares', id_cliente: '041', recencia: 88, frequencia: 3, valor: 2000 },
  { nome: 'Patrícia Cunha', id_cliente: '042', recencia: 6, frequencia: 12, valor: 9000 },
  { nome: 'Quirino Brito', id_cliente: '043', recencia: 105, frequencia: 2, valor: 1250 },
  { nome: 'Rosana Freitas', id_cliente: '044', recencia: 33, frequencia: 6, valor: 4600 },
  { nome: 'Sérgio Matos', id_cliente: '045', recencia: 190, frequencia: 1, valor: 650 },
  { nome: 'Tatiana Ramos', id_cliente: '046', recencia: 48, frequencia: 4, valor: 2900 },
  { nome: 'Ulisses Pires', id_cliente: '047', recencia: 11, frequencia: 9, valor: 7200 },
  { nome: 'Valéria Coelho', id_cliente: '048', recencia: 80, frequencia: 3, valor: 2200 },
  { nome: 'Wesley Amaral', id_cliente: '049', recencia: 26, frequencia: 7, valor: 5200 },
  { nome: 'Zilda Nogueira', id_cliente: '050', recencia: 145, frequencia: 1, valor: 850 },
];

export const allClusterNames = [
  'Campeão', 'Fidelizado', 'Potencial para ser fidelizado', 'Promissor',
  'Em risco', 'Precisa de atenção', 'Hibernando', 'Novos Clientes'
];

export interface ActionPlan5W2H {
  what: string;
  why: string;
  where: string;
  when: string;
  who: string;
  how: string;
  howMuch: string;
}

export interface EisenhowerMatrix {
  urgentImportant: string[];
  notUrgentImportant: string[];
  urgentNotImportant: string[];
  notUrgentNotImportant: string[];
}

export const cluster5W2H: Record<string, ActionPlan5W2H[]> = {
  'Campeão': [
    { what: 'Programa de embaixadores VIP', why: 'Reter os melhores clientes e gerar indicações', where: 'CRM e comunicação direta', when: 'Imediato — manter ativo', who: 'Equipe de relacionamento', how: 'Benefícios exclusivos, acesso antecipado a lançamentos, eventos VIP', howMuch: 'Alto investimento por cliente, alto retorno' },
    { what: 'Pesquisa de satisfação premium', why: 'Entender o que os mantém fiéis', where: 'E-mail personalizado', when: 'Trimestral', who: 'Equipe de CX', how: 'Entrevistas 1:1 e pesquisa qualitativa', howMuch: 'Baixo custo, altíssimo valor estratégico' },
  ],
  'Fidelizado': [
    { what: 'Cross-sell e up-sell personalizado', why: 'Aumentar ticket médio de clientes já engajados', where: 'E-commerce e loja física', when: 'Próximos 30 dias', who: 'Equipe comercial', how: 'Recomendações baseadas em histórico de compra', howMuch: 'Médio — campanhas segmentadas' },
    { what: 'Programa de pontos acelerado', why: 'Recompensar frequência e aumentar retenção', where: 'App e PDV', when: 'Próximos 60 dias', who: 'Marketing e TI', how: 'Multiplicador de pontos em categorias estratégicas', howMuch: 'Médio investimento' },
  ],
  'Potencial para ser fidelizado': [
    { what: 'Campanha de engajamento progressivo', why: 'Converter potencial em fidelidade real', where: 'E-mail marketing e push', when: 'Próximos 30 dias', who: 'Marketing', how: 'Sequência de benefícios crescentes por frequência', howMuch: 'Médio — automação de marketing' },
    { what: 'Conteúdo educativo e de valor', why: 'Criar conexão emocional com a marca', where: 'Blog, redes sociais, newsletter', when: 'Contínuo', who: 'Conteúdo e branding', how: 'Série de conteúdos exclusivos para este segmento', howMuch: 'Baixo custo' },
  ],
  'Promissor': [
    { what: 'Onboarding do programa de fidelidade', why: 'Capturar interesse inicial e criar hábito', where: 'E-mail e app', when: 'Imediato após 1ª compra', who: 'CRM', how: 'Boas-vindas personalizada + incentivo para 2ª compra', howMuch: 'Baixo — automação' },
    { what: 'Oferta de segunda compra', why: 'Transformar comprador único em recorrente', where: 'E-mail e SMS', when: '7-15 dias após 1ª compra', who: 'Marketing', how: 'Desconto ou frete grátis na próxima compra', howMuch: 'Baixo a médio' },
  ],
  'Em risco': [
    { what: 'Campanha urgente de win-back', why: 'Recuperar clientes antes que hibernem', where: 'E-mail, SMS, WhatsApp', when: 'Imediato — urgente', who: 'CRM e retenção', how: 'Oferta irrecusável + pesquisa de motivos', howMuch: 'Alto — justificado pelo LTV' },
    { what: 'Pesquisa de satisfação/NPS', why: 'Identificar causas de afastamento', where: 'E-mail ou telefone', when: 'Próximos 7 dias', who: 'CX e atendimento', how: 'Pesquisa curta + contato humano se necessário', howMuch: 'Baixo custo' },
  ],
  'Precisa de atenção': [
    { what: 'Campanha "Sentimos sua falta"', why: 'Reengajar antes que se tornem Em Risco', where: 'E-mail e push notification', when: 'Próximos 15 dias', who: 'Marketing', how: 'Comunicação emocional + oferta limitada', howMuch: 'Baixo a médio' },
    { what: 'Oferta com urgência', why: 'Criar senso de urgência para ação', where: 'E-mail e SMS', when: 'Próximos 7 dias', who: 'CRM', how: 'Cupom com validade curta (48-72h)', howMuch: 'Médio — desconto controlado' },
  ],
  'Hibernando': [
    { what: 'Campanha agressiva de reativação', why: 'Última tentativa antes de descarte', where: 'E-mail, SMS, mala direta', when: 'Próximos 30 dias', who: 'Marketing e comercial', how: 'Oferta de último recurso + análise de custo-benefício', howMuch: 'Avaliar ROI vs custo de aquisição' },
    { what: 'Análise de descarte vs reativação', why: 'Otimizar investimento de marketing', where: 'Interno — análise de dados', when: 'Imediato', who: 'Inteligência de dados', how: 'Comparar custo de reativação vs aquisição de novo cliente', howMuch: 'Baixo — análise interna' },
  ],
  'Novos Clientes': [
    { what: 'Onboarding excepcional', why: 'Primeira impressão define retenção futura', where: 'E-mail, app, loja', when: 'Imediato — primeiros 7 dias', who: 'CX e marketing', how: 'Sequência de boas-vindas, tutorial, benefício de 2ª compra', howMuch: 'Baixo — automação' },
    { what: 'Apresentação do programa de fidelidade', why: 'Engajar desde o início', where: 'Pós-compra e e-mail', when: 'Após 1ª compra', who: 'CRM', how: 'Explicar benefícios e dar bônus de entrada', howMuch: 'Baixo custo' },
  ],
};

export const clusterEisenhower: Record<string, EisenhowerMatrix> = {
  'Campeão': {
    urgentImportant: ['Manter contato personalizado e frequente', 'Resolver qualquer insatisfação imediatamente'],
    notUrgentImportant: ['Criar programa de embaixadores', 'Pedir indicações e depoimentos'],
    urgentNotImportant: ['Enviar novidades e lançamentos', 'Atualizar benefícios do programa'],
    notUrgentNotImportant: ['Pesquisa anual de satisfação', 'Revisão de benefícios exclusivos'],
  },
  'Fidelizado': {
    urgentImportant: ['Implementar cross-sell baseado em dados', 'Ativar programa de pontos acelerado'],
    notUrgentImportant: ['Desenvolver trilha de upgrades', 'Criar conteúdo exclusivo para o segmento'],
    urgentNotImportant: ['Atualizar comunicações segmentadas', 'Revisar ofertas ativas'],
    notUrgentNotImportant: ['Benchmark com concorrentes', 'Análise de tendências de consumo'],
  },
  'Potencial para ser fidelizado': {
    urgentImportant: ['Lançar campanha de engajamento progressivo', 'Configurar automações de nutrição'],
    notUrgentImportant: ['Criar jornada de conteúdo educativo', 'Desenvolver benefícios por frequência'],
    urgentNotImportant: ['Segmentar por sub-perfis de comportamento', 'Ajustar scoring de engajamento'],
    notUrgentNotImportant: ['Testar novos canais de comunicação', 'Mapear preferências de produto'],
  },
  'Promissor': {
    urgentImportant: ['Enviar incentivo para 2ª compra em 7 dias', 'Onboarding personalizado imediato'],
    notUrgentImportant: ['Construir sequência de nutrição de 30 dias', 'Apresentar programa de fidelidade'],
    urgentNotImportant: ['Coletar dados de preferência', 'Configurar triggers de recompra'],
    notUrgentNotImportant: ['Análise de perfil demográfico', 'Teste A/B de comunicações'],
  },
  'Em risco': {
    urgentImportant: ['Lançar campanha de win-back AGORA', 'Contato direto com top clientes do segmento'],
    notUrgentImportant: ['Investigar causas raiz de churn', 'Desenvolver plano de retenção estruturado'],
    urgentNotImportant: ['Enviar pesquisa de NPS rápida', 'Revisar experiência de compra recente'],
    notUrgentNotImportant: ['Documentar aprendizados para prevenção', 'Atualizar playbook de retenção'],
  },
  'Precisa de atenção': {
    urgentImportant: ['Enviar campanha "sentimos sua falta"', 'Cupom com validade de 48h'],
    notUrgentImportant: ['Analisar histórico para entender padrão', 'Criar régua de comunicação preventiva'],
    urgentNotImportant: ['Atualizar segmentação no CRM', 'Verificar entregabilidade de e-mails'],
    notUrgentNotImportant: ['Revisar política de descontos', 'Benchmark de taxas de reengajamento'],
  },
  'Hibernando': {
    urgentImportant: ['Decidir: reativar ou descartar?', 'Oferta de último recurso para top perfis'],
    notUrgentImportant: ['Análise de ROI de reativação vs aquisição', 'Limpar base e reduzir custos'],
    urgentNotImportant: ['Última tentativa de contato multicanal', 'Atualizar status no CRM'],
    notUrgentNotImportant: ['Documentar motivos de hibernação', 'Usar insights para prevenção futura'],
  },
  'Novos Clientes': {
    urgentImportant: ['Garantir experiência de 1ª compra impecável', 'Enviar e-mail de boas-vindas em 24h'],
    notUrgentImportant: ['Construir jornada de onboarding de 30 dias', 'Apresentar programa de fidelidade'],
    urgentNotImportant: ['Coletar feedback da 1ª experiência', 'Configurar trigger de 2ª compra'],
    notUrgentNotImportant: ['Analisar canal de aquisição', 'Mapear perfil para futuras segmentações'],
  },
};
