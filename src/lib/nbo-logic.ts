import type { ClientData, ScoredClient } from './rfv-logic';
import { scoreClientsPercentile, defaultPercentileParams, clusterMap } from './rfv-logic';

export interface ScoredNBOClient extends ClientData {
  faixa: string;
  oferta: string;
  oferta_curta: string;
  oferta_regra: string;
  gasto_total: number;
  nbo_score: number;
  r_score: number;
  f_score: number;
  v_score: number;
  cluster: string;
}

export const faixaColors: Record<string, string> = {
  Bronze: 'hsl(30, 50%, 55%)',
  Prata: 'hsl(220, 15%, 60%)',
  Ouro: 'hsl(45, 80%, 50%)',
  Diamante: 'hsl(260, 60%, 55%)',
};

export const allFaixaNames = ['Diamante', 'Ouro', 'Prata', 'Bronze'];

export const faixaActions: Record<string, string> = {
  Diamante: 'Tratamento ultra-premium. Programa de embaixadores, eventos exclusivos, concierge dedicado.',
  Ouro: 'Programa de cashback e benefícios VIP. Acesso antecipado a lançamentos e promoções exclusivas.',
  Prata: 'Cross-sell de categorias complementares. Frete grátis condicional para aumentar ticket.',
  Bronze: 'Incentivar aumento de gasto com cupons progressivos. Campanhas de primeira compra.',
};

// Distribution: top 10% Diamante, next 20% Ouro, next 30% Prata, bottom 40% Bronze
const FAIXA_DISTRIBUTION = [
  { name: 'Diamante', pct: 0.10 },
  { name: 'Ouro', pct: 0.20 },
  { name: 'Prata', pct: 0.30 },
  { name: 'Bronze', pct: 0.40 },
];

/** Calculate NBO weighted score: V*3 + F*2 + R*1 using normalized scores (1-3) */
function calcNBOScore(r: number, f: number, v: number): number {
  // Normalize to 1-3 range
  const rn = Math.min(3, Math.max(1, r));
  const fn = Math.min(3, Math.max(1, f));
  const vn = Math.min(3, Math.max(1, v));
  return vn * 3 + fn * 2 + rn * 1;
}

/** Generate smart offer based on faixa + individual RFV scores */
export function generateSmartOffer(faixa: string, r: number, f: number, v: number): { oferta: string; regra: string } {
  // Normalize scores to 1-3
  const rn = Math.min(3, Math.max(1, r));
  const fn = Math.min(3, Math.max(1, f));
  const vn = Math.min(3, Math.max(1, v));

  if (faixa === 'Diamante') {
    if (fn <= 1) return { oferta: 'Programa de pontos em dobro para incentivar compras mais frequentes', regra: 'Diamante com frequência baixa (F=1): precisa aumentar recorrência' };
    if (rn <= 1) return { oferta: 'Campanha de reativação VIP com benefício exclusivo e contato personalizado', regra: 'Diamante com recência baixa (R=1): cliente valioso se afastando' };
    if (vn <= 2 && fn >= 3) return { oferta: 'Cashback progressivo de 8% para compras acima do ticket médio', regra: 'Diamante com valor médio mas alta frequência: incentivar aumento de ticket' };
    return { oferta: 'Experiência exclusiva de embaixador: eventos VIP, pré-lançamentos e concierge dedicado', regra: 'Diamante completo (scores altos): manter engajamento premium' };
  }

  if (faixa === 'Ouro') {
    if (rn <= 1) return { oferta: 'Oferta de retorno exclusiva: 15% off + frete grátis para reativar', regra: 'Ouro com recência baixa (R=1): reativar antes de perder' };
    if (fn <= 1) return { oferta: 'Desafio de compras: complete 3 compras este mês e ganhe cashback 10%', regra: 'Ouro com frequência baixa (F=1): criar hábito de compra' };
    if (vn >= 3) return { oferta: 'Acesso antecipado a lançamentos + cashback 5% para subir a Diamante', regra: 'Ouro com valor alto (V=3): próximo da faixa Diamante, incentivar upgrade' };
    return { oferta: 'Programa de fidelidade acelerado: pontos em dobro nas próximas 5 compras', regra: 'Ouro equilibrado: acelerar progressão para Diamante' };
  }

  if (faixa === 'Prata') {
    if (fn >= 3) return { oferta: 'Upgrade para Ouro: meta de gasto de R$500 adicionais para desbloquear benefícios premium', regra: 'Prata com alta frequência (F=3): já compra bastante, incentivar aumento de valor' };
    if (rn >= 3 && fn <= 1) return { oferta: 'Kit de boas-vindas especial + frete grátis nas próximas 3 compras', regra: 'Prata recente mas baixa frequência (R=3, F=1): engajar enquanto quente' };
    if (vn >= 3) return { oferta: 'Cross-sell personalizado com 10% off em categorias complementares', regra: 'Prata com valor alto (V=3): diversificar consumo para aumentar frequência' };
    return { oferta: 'Cupom de 10% + frete grátis em compras acima de R$200', regra: 'Prata equilibrado: incentivar aumento geral de engajamento' };
  }

  // Bronze
  if (fn >= 3) return { oferta: 'Upgrade de categoria: atinja R$300 em compras e ganhe benefícios Prata por 3 meses', regra: 'Bronze com alta frequência (F=3): compra bastante mas pouco valor, incentivar ticket maior' };
  if (rn >= 3) return { oferta: 'Cupom de 20% na próxima compra acima de R$150 — válido por 7 dias', regra: 'Bronze recente (R=3): comprou há pouco, oportunidade de crescimento' };
  if (rn <= 1 && fn <= 1) return { oferta: 'Oferta de reativação: 25% off + brinde exclusivo na próxima compra', regra: 'Bronze inativo (R=1, F=1): última tentativa de engajamento' };
  return { oferta: 'Cupom progressivo: 15% na 1ª compra, 20% na 2ª, 25% na 3ª este mês', regra: 'Bronze padrão: criar hábito de compra com incentivos crescentes' };
}

/** Generate humanized explanation for the offer */
export function generateOfferExplanation(client: ScoredNBOClient): string {
  const nome = client.nome.split(' ')[0]; // first name
  const rn = client.r_score;
  const fn = client.f_score;
  const vn = client.v_score;

  // Build recency description
  let recDesc = '';
  if (rn >= 3) recDesc = 'comprou recentemente';
  else if (rn === 2) recDesc = 'comprou há um tempo moderado';
  else recDesc = 'não compra há bastante tempo';

  // Build frequency description
  let freqDesc = '';
  if (fn >= 3) freqDesc = 'compra com muita frequência';
  else if (fn === 2) freqDesc = 'compra com frequência moderada';
  else freqDesc = 'compra raramente';

  // Build value description
  let valDesc = '';
  if (vn >= 3) valDesc = 'gasta valores altos';
  else if (vn === 2) valDesc = 'gasta valores moderados';
  else valDesc = 'gasta valores baixos';

  // Build recommendation reasoning
  let reason = '';
  if (client.faixa === 'Diamante') {
    if (fn <= 1) reason = 'Como é um cliente de alto valor mas com baixa frequência, o foco é incentivar compras mais recorrentes para maximizar o potencial.';
    else if (rn <= 1) reason = 'Apesar de ser um cliente premium, está se afastando. É urgente reativá-lo com uma abordagem VIP personalizada.';
    else reason = 'É um dos melhores clientes da base. O objetivo é mantê-lo engajado com experiências exclusivas e tratamento diferenciado.';
  } else if (client.faixa === 'Ouro') {
    if (rn <= 1) reason = 'Este cliente tem potencial alto mas está se distanciando. Uma oferta agressiva de retorno pode reativá-lo antes que seja tarde.';
    else if (vn >= 3) reason = 'Já gasta bem e está próximo do nível Diamante. Um incentivo direcionado pode levá-lo ao topo da pirâmide.';
    else reason = 'Está em uma boa posição e pode evoluir. O foco é acelerar a progressão com benefícios de fidelidade.';
  } else if (client.faixa === 'Prata') {
    if (fn >= 3) reason = 'Compra bastante mas com ticket menor. Incentivar aumento de valor por compra pode elevá-lo para a faixa Ouro.';
    else if (rn >= 3 && fn <= 1) reason = 'Comprou recentemente mas ainda não criou hábito. Engajar agora enquanto está "quente" é a melhor estratégia.';
    else reason = 'Tem potencial de crescimento. Incentivos graduais podem aumentar tanto a frequência quanto o valor das compras.';
  } else {
    if (fn >= 3) reason = 'Compra com frequência mas gasta pouco. Um desafio de meta de gasto pode transformar esse comportamento.';
    else if (rn >= 3) reason = 'Comprou recentemente, é uma oportunidade de ouro para criar engajamento desde o início.';
    else if (rn <= 1 && fn <= 1) reason = 'É um cliente praticamente inativo. Uma oferta de reativação forte é a última tentativa de recuperação.';
    else reason = 'Precisa de incentivos crescentes para criar o hábito de compra e aumentar o engajamento com a marca.';
  }

  return `${nome} ${recDesc}, ${freqDesc} e ${valDesc}. ${reason}`;
}

/** Classify clients into NBO tiers using weighted RFV scoring + percentile distribution */
export function classifyNBO(clients: ClientData[]): ScoredNBOClient[] {
  // First, score clients with RFV percentile system
  const params = defaultPercentileParams(3);
  const rfvScored = scoreClientsPercentile(clients, params);

  // Calculate NBO scores and sort descending
  const withScores = rfvScored.map(c => ({
    ...c,
    nbo_score: calcNBOScore(c.r_score, c.f_score, c.v_score),
  }));

  // Sort by score descending, then by valor descending as tiebreaker
  withScores.sort((a, b) => b.nbo_score - a.nbo_score || b.valor - a.valor);

  const total = withScores.length;
  const result: ScoredNBOClient[] = [];

  let idx = 0;
  for (const tier of FAIXA_DISTRIBUTION) {
    const count = Math.round(tier.pct * total);
    const end = Math.min(idx + count, total);
    // Last tier gets all remaining
    const actualEnd = tier.name === 'Bronze' ? total : end;

    for (let i = idx; i < actualEnd; i++) {
      const c = withScores[i];
      // Normalize scores to 1-3 for smart offer
      const rn = Math.min(3, Math.max(1, c.r_score));
      const fn = Math.min(3, Math.max(1, c.f_score));
      const vn = Math.min(3, Math.max(1, c.v_score));
      const { oferta, regra } = generateSmartOffer(tier.name, rn, fn, vn);
      result.push({
        nome: c.nome,
        id_cliente: c.id_cliente,
        recencia: c.recencia,
        frequencia: c.frequencia,
        valor: c.valor,
        gasto_total: c.valor,
        r_score: rn,
        f_score: fn,
        v_score: vn,
        cluster: c.cluster,
        nbo_score: c.nbo_score,
        faixa: tier.name,
        oferta,
        oferta_regra: regra,
      });
    }
    idx = actualEnd;
  }

  return result;
}
