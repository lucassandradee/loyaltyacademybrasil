import { CXTicket, defaultCausas, tiposChamado } from './cx-logic';

const nomes = [
  'Ana Silva', 'Bruno Costa', 'Carla Mendes', 'Daniel Oliveira', 'Elena Santos',
  'Felipe Rocha', 'Gabriela Lima', 'Hugo Ferreira', 'Isabela Souza', 'João Pereira',
  'Karen Almeida', 'Lucas Martins', 'Marina Barbosa', 'Neto Araújo', 'Olívia Nascimento',
  'Paulo Ribeiro', 'Rafael Gomes', 'Sandra Teixeira', 'Thiago Cardoso', 'Valéria Coelho',
  'Wesley Amaral', 'Yara Correia', 'André Castro', 'Beatriz Moura', 'Cássio Vieira',
];

// Causas por tipo de chamado
const causasPorTipo: Record<string, string[]> = {
  'Reclamação': ['Atraso na entrega', 'Produto com defeito', 'Cobrança indevida', 'Atendimento ruim'],
  'Informação': ['Dúvida sobre produto', 'Dúvida sobre produto', 'Problema no site/app'],
  'Compra': ['Compra assistida', 'Dúvida sobre produto'],
  'Suporte Técnico': ['Problema no site/app', 'Produto com defeito'],
  'Cancelamento': ['Cancelamento', 'Cobrança indevida'],
};

// Distribuição de tipos: 30% info, 25% reclamação, 20% compra, 15% suporte, 10% cancelamento
const tipoWeights = [
  { tipo: 'Informação', weight: 0.30 },
  { tipo: 'Reclamação', weight: 0.25 },
  { tipo: 'Compra', weight: 0.20 },
  { tipo: 'Suporte Técnico', weight: 0.15 },
  { tipo: 'Cancelamento', weight: 0.10 },
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickWeighted(): string {
  const r = Math.random();
  let cum = 0;
  for (const tw of tipoWeights) {
    cum += tw.weight;
    if (r <= cum) return tw.tipo;
  }
  return tipoWeights[0].tipo;
}

function pickRandom<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}

// Transcrições simuladas por tipo
const transcricoes: Record<string, string[]> = {
  'Reclamação': [
    'Cliente: Olá, fiz um pedido há 10 dias e ainda não recebi. Atendente: Vou verificar o status do seu pedido. Um momento, por favor. Atendente: Identifiquei que houve um atraso na transportadora. Vou abrir uma prioridade.',
    'Cliente: Recebi o produto com defeito, a tela está trincada. Atendente: Sinto muito pelo ocorrido. Vou iniciar o processo de troca imediatamente. Preciso que envie fotos do produto.',
    'Cliente: Estou sendo cobrado por algo que não comprei! Atendente: Vou verificar suas últimas transações. Realmente há uma cobrança indevida, vou solicitar o estorno.',
    'Cliente: O atendente anterior foi muito grosso comigo. Atendente: Peço desculpas pela experiência. Vou registrar o ocorrido e garantir que isso não se repita.',
  ],
  'Informação': [
    'Cliente: Gostaria de saber as especificações do produto X. Atendente: Claro! O produto X possui as seguintes características... Posso ajudar com mais alguma dúvida?',
    'Cliente: Qual o prazo de entrega para minha região? Atendente: Para sua região o prazo estimado é de 3 a 5 dias úteis após a confirmação do pagamento.',
    'Cliente: Vocês têm esse modelo na cor azul? Atendente: Sim, temos disponível nas cores azul, preto e branco. Gostaria de fazer o pedido?',
  ],
  'Compra': [
    'Cliente: Quero comprar o produto Y, mas preciso de ajuda. Atendente: Claro! Vou te ajudar com o processo de compra. Qual forma de pagamento prefere?',
    'Cliente: Consigo parcelar em quantas vezes? Atendente: Parcelamos em até 12x sem juros no cartão. Para boleto temos 5% de desconto à vista.',
  ],
  'Suporte Técnico': [
    'Cliente: O aplicativo não está funcionando, fica travando. Atendente: Vamos resolver isso. Pode tentar limpar o cache do aplicativo? Se não funcionar, vamos reinstalar.',
    'Cliente: Não consigo finalizar minha compra no site. Atendente: Parece ser um problema no navegador. Tente usar outro navegador ou limpar os cookies.',
  ],
  'Cancelamento': [
    'Cliente: Quero cancelar minha assinatura. Atendente: Entendo. Posso saber o motivo? Temos algumas opções que podem te interessar antes de cancelar.',
    'Cliente: Preciso cancelar meu pedido, comprei errado. Atendente: Sem problemas, vou processar o cancelamento. O estorno será feito em até 7 dias úteis.',
  ],
};

// Comentários NPS por faixa
function gerarComentarioNPS(nps: number, tipo: string, tme: number): string {
  if (nps >= 9) {
    const opts = [
      'Excelente atendimento! Muito rápido e eficiente.',
      'Adorei o atendimento, resolveram tudo na hora.',
      'Atendente muito educado e prestativo. Recomendo!',
      'Fui atendido rapidamente e o problema foi resolvido. Parabéns!',
      'Serviço impecável, superou minhas expectativas.',
    ];
    return pickRandom(opts);
  } else if (nps >= 7) {
    const opts = [
      'Atendimento ok, nada de especial.',
      'Resolveram meu problema, mas demorou um pouco.',
      'Bom atendimento no geral, mas poderia ser mais rápido.',
      'Tudo certo, sem reclamações.',
    ];
    return pickRandom(opts);
  } else if (nps >= 4) {
    const opts = [
      `Esperei ${tme} minutos para ser atendido, muito demorado.`,
      'Não resolveram meu problema completamente.',
      'Atendente parecia não saber o que fazer.',
      'Precisei ligar duas vezes para resolver o mesmo problema.',
    ];
    return pickRandom(opts);
  } else {
    const opts = [
      `Péssimo! Esperei ${tme} minutos e ainda não resolveram nada.`,
      'Pior atendimento que já tive. Nunca mais compro aqui.',
      'Fui muito mal atendido, o atendente foi grosso e não resolveu nada.',
      'Experiência horrível do início ao fim. Vou reclamar no Reclame Aqui.',
    ];
    return pickRandom(opts);
  }
}

export function generateRandomCXTickets(count: number): CXTicket[] {
  const tickets: CXTicket[] = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = rand(1, 90);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const tipo = pickWeighted();
    const causasDisponiveis = causasPorTipo[tipo] || defaultCausas;
    const causa = pickRandom(causasDisponiveis);

    // TME: realistic wait times, complaints/cancellations wait longer
    let tme: number;
    if (tipo === 'Reclamação' || tipo === 'Cancelamento') {
      tme = randFloat(1, 12);
    } else {
      tme = randFloat(0.5, 6);
    }
    tme = Math.round(tme * 10) / 10;

    // TMA: 1-8 minutes (realistic)
    const tma = Math.round(randFloat(1, 6) * 10) / 10;

    // FCR: higher for simple calls, lower for complaints
    let fcrChance: number;
    if (tipo === 'Informação' || tipo === 'Compra') fcrChance = 0.88;
    else if (tipo === 'Suporte Técnico') fcrChance = 0.65;
    else if (tipo === 'Reclamação') fcrChance = 0.45;
    else fcrChance = 0.50;
    const fcr = Math.random() < fcrChance ? 1 : 0;

    // NPS: base by type, then modulated by TME and FCR for realistic correlations
    let npsBase: number;
    if (tipo === 'Reclamação') {
      npsBase = randFloat(3, 8);  // not always terrible
    } else if (tipo === 'Cancelamento') {
      npsBase = randFloat(3, 8);
    } else if (tipo === 'Informação') {
      npsBase = randFloat(6, 10);  // usually positive
    } else if (tipo === 'Compra') {
      npsBase = randFloat(7, 10);  // buyers tend to be happy
    } else {
      npsBase = randFloat(4, 9);
    }

    // TME correlation: high wait = lower NPS (visible in scatter)
    if (tme > 8) npsBase -= randFloat(2, 4);
    else if (tme > 5) npsBase -= randFloat(1, 2.5);
    else if (tme > 3) npsBase -= randFloat(0, 1);

    // TMA correlation: slightly negative impact
    if (tma > 5) npsBase -= randFloat(0.3, 1);

    // FCR correlation: not resolving = worse NPS
    if (fcr === 0) npsBase -= randFloat(1, 3);
    else npsBase += randFloat(0, 0.5);  // slight boost for resolution

    const nps = Math.min(10, Math.max(0, Math.round(npsBase)));

    const transcricao = pickRandom(transcricoes[tipo] || transcricoes['Informação']);
    const comentario = gerarComentarioNPS(nps, tipo, tme);

    tickets.push({
      id_chamado: `CHM-${String(i + 1).padStart(5, '0')}`,
      cliente: pickRandom(nomes),
      tma_minutos: tma,
      tme_minutos: tme,
      nps_score: nps,
      fcr: fcr as 0 | 1,
      causa_raiz: causa,
      tipo_chamado: tipo,
      data_chamado: date.toISOString().split('T')[0],
      transcricao,
      comentario_nps: comentario,
    });
  }
  return tickets;
}
