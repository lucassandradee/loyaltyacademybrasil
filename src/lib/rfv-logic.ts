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

export function scoreClients(clients: ClientData[], params: RFVParams): ScoredClient[] {
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
