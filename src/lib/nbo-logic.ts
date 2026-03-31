import type { ClientData } from './rfv-logic';

export interface ScoredNBOClient extends ClientData {
  faixa: string;
  oferta: string;
  gasto_total: number;
}

export interface FaixaConfig {
  nome: string;
  min: number;
  max: number;
  color: string;
  oferta: string;
}

export const defaultFaixas: FaixaConfig[] = [
  { nome: 'Bronze', min: 0, max: 500, color: 'hsl(30, 50%, 55%)', oferta: 'Cupom de 15% para compras acima de R$500 — suba para Prata!' },
  { nome: 'Prata', min: 501, max: 2000, color: 'hsl(220, 15%, 60%)', oferta: 'Frete grátis + 10% em compras acima de R$2.000 — suba para Ouro!' },
  { nome: 'Ouro', min: 2001, max: 5000, color: 'hsl(45, 80%, 50%)', oferta: 'Acesso VIP + cashback 5% acima de R$5.000 — suba para Diamante!' },
  { nome: 'Diamante', min: 5001, max: Infinity, color: 'hsl(260, 60%, 55%)', oferta: 'Experiência exclusiva, programa de embaixadores e benefícios premium' },
];

export const faixaColors: Record<string, string> = {
  Bronze: 'hsl(30, 50%, 55%)',
  Prata: 'hsl(220, 15%, 60%)',
  Ouro: 'hsl(45, 80%, 50%)',
  Diamante: 'hsl(260, 60%, 55%)',
};

/** Classify RFV clients into spending tiers using `valor` as gasto_total */
export function classifyNBO(clients: ClientData[], faixas: FaixaConfig[] = defaultFaixas): ScoredNBOClient[] {
  return clients.map(c => {
    const gasto = c.valor;
    const faixa = faixas.find(f => gasto >= f.min && gasto <= f.max) || faixas[0];
    return { ...c, gasto_total: gasto, faixa: faixa.nome, oferta: faixa.oferta };
  });
}

export const allFaixaNames = ['Bronze', 'Prata', 'Ouro', 'Diamante'];

export const faixaActions: Record<string, string> = {
  Bronze: 'Incentivar aumento de gasto com cupons progressivos. Campanhas de primeira compra acima de R$500.',
  Prata: 'Cross-sell de categorias complementares. Frete grátis condicional para aumentar ticket.',
  Ouro: 'Programa de cashback e benefícios VIP. Acesso antecipado a lançamentos e promoções exclusivas.',
  Diamante: 'Tratamento ultra-premium. Programa de embaixadores, eventos exclusivos, concierge dedicado.',
};

export interface ActionPlan5W2H {
  what: string; why: string; where: string; when: string; who: string; how: string; howMuch: string;
}

export interface EisenhowerMatrix {
  urgentImportant: string[];
  notUrgentImportant: string[];
  urgentNotImportant: string[];
  notUrgentNotImportant: string[];
}

export const faixa5W2H: Record<string, ActionPlan5W2H[]> = {
  Bronze: [
    { what: 'Campanha de upgrade Bronze → Prata', why: 'Aumentar gasto médio e LTV', where: 'E-mail, SMS, app', when: 'Próximos 15 dias', who: 'Marketing', how: 'Cupom de 15% para compras acima de R$500', howMuch: 'Baixo — cupons condicionais' },
    { what: 'Programa de incentivo à recompra', why: 'Criar hábito de compra recorrente', where: 'Push notification e e-mail', when: 'Contínuo', who: 'CRM', how: 'Pontos em dobro nas próximas 3 compras', howMuch: 'Baixo a médio' },
  ],
  Prata: [
    { what: 'Cross-sell de categorias complementares', why: 'Aumentar ticket e diversificar consumo', where: 'E-commerce e loja', when: 'Próximos 30 dias', who: 'Comercial', how: 'Recomendações personalizadas + frete grátis acima de R$2.000', howMuch: 'Médio — frete subsidiado' },
    { what: 'Programa de fidelidade com metas', why: 'Incentivar gasto progressivo', where: 'App e PDV', when: 'Próximos 60 dias', who: 'Marketing e TI', how: 'Barra de progresso para próxima faixa + recompensas', howMuch: 'Médio investimento' },
  ],
  Ouro: [
    { what: 'Cashback progressivo e acesso VIP', why: 'Reter e aumentar para Diamante', where: 'App, e-mail, eventos', when: 'Imediato', who: 'Relacionamento', how: 'Cashback 5% + convites para eventos exclusivos', howMuch: 'Alto investimento por cliente, alto retorno' },
    { what: 'Pré-venda e lançamentos exclusivos', why: 'Criar sensação de exclusividade', where: 'App e comunicação direta', when: 'A cada lançamento', who: 'Marketing e produto', how: 'Acesso 48h antes do público geral', howMuch: 'Baixo custo operacional' },
  ],
  Diamante: [
    { what: 'Programa de embaixadores premium', why: 'Gerar indicações e advocacy', where: 'Comunicação 1:1', when: 'Imediato — manter ativo', who: 'Equipe de relacionamento', how: 'Benefícios exclusivos, concierge, eventos VIP', howMuch: 'Alto investimento, altíssimo retorno' },
    { what: 'Experiências personalizadas', why: 'Reforçar vínculo emocional com a marca', where: 'Eventos, viagens, experiências', when: 'Trimestral', who: 'Branding e CX', how: 'Experiências únicas baseadas no perfil do cliente', howMuch: 'Alto — justificado pelo LTV' },
  ],
};

export const faixaEisenhower: Record<string, EisenhowerMatrix> = {
  Bronze: {
    urgentImportant: ['Enviar cupom de upgrade para compras acima de R$500', 'Identificar clientes próximos do threshold Prata'],
    notUrgentImportant: ['Criar régua de comunicação de upgrade', 'Analisar categorias mais compradas'],
    urgentNotImportant: ['Atualizar segmentação no CRM', 'Enviar newsletter com produtos populares'],
    notUrgentNotImportant: ['Benchmark de conversão Bronze→Prata', 'Teste A/B de mensagens de upgrade'],
  },
  Prata: {
    urgentImportant: ['Lançar campanha de cross-sell personalizado', 'Ativar frete grátis condicional'],
    notUrgentImportant: ['Desenvolver programa de metas progressivas', 'Criar conteúdo de valor para o segmento'],
    urgentNotImportant: ['Revisar recomendações de produto', 'Atualizar comunicações segmentadas'],
    notUrgentNotImportant: ['Análise de padrões de consumo', 'Mapear jornada de compra típica'],
  },
  Ouro: {
    urgentImportant: ['Implementar cashback progressivo', 'Garantir experiência premium em todos os canais'],
    notUrgentImportant: ['Criar calendário de eventos exclusivos', 'Desenvolver programa de pré-venda'],
    urgentNotImportant: ['Enviar convite para próximo evento', 'Atualizar benefícios do programa'],
    notUrgentNotImportant: ['Pesquisa de satisfação premium', 'Benchmark com programas concorrentes'],
  },
  Diamante: {
    urgentImportant: ['Manter relacionamento personalizado e frequente', 'Resolver qualquer insatisfação imediatamente'],
    notUrgentImportant: ['Planejar experiências exclusivas trimestrais', 'Programa de embaixadores e indicações'],
    urgentNotImportant: ['Atualizar perfil e preferências', 'Enviar novidades em primeira mão'],
    notUrgentNotImportant: ['Revisão anual de benefícios', 'Documentar cases de sucesso'],
  },
};
