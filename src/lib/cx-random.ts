import { CXTicket, defaultCausas } from './cx-logic';

const nomes = [
  'Ana Silva', 'Bruno Costa', 'Carla Mendes', 'Daniel Oliveira', 'Elena Santos',
  'Felipe Rocha', 'Gabriela Lima', 'Hugo Ferreira', 'Isabela Souza', 'João Pereira',
  'Karen Almeida', 'Lucas Martins', 'Marina Barbosa', 'Neto Araújo', 'Olívia Nascimento',
  'Paulo Ribeiro', 'Rafael Gomes', 'Sandra Teixeira', 'Thiago Cardoso', 'Valéria Coelho',
  'Wesley Amaral', 'Yara Correia', 'André Castro', 'Beatriz Moura', 'Cássio Vieira',
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomCXTickets(count: number): CXTicket[] {
  const tickets: CXTicket[] = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = rand(1, 180);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    tickets.push({
      id_chamado: `CHM-${String(i + 1).padStart(5, '0')}`,
      cliente: nomes[rand(0, nomes.length - 1)],
      tma_minutos: rand(3, 120),
      nps_score: rand(0, 10),
      causa_raiz: defaultCausas[rand(0, defaultCausas.length - 1)],
      data_chamado: date.toISOString().split('T')[0],
    });
  }
  return tickets;
}
