import { NBOClient } from './nbo-logic';

const firstNames = [
  'Ana', 'Bruno', 'Carla', 'Daniel', 'Elena', 'Felipe', 'Gabriela', 'Hugo',
  'Isabela', 'João', 'Karen', 'Lucas', 'Marina', 'Neto', 'Olívia', 'Paulo',
  'Rafael', 'Sandra', 'Thiago', 'Valéria', 'Wesley', 'Yara', 'André',
  'Beatriz', 'Cássio', 'Diana', 'Eduardo', 'Fátima', 'Gustavo', 'Helena',
];

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Almeida',
  'Nascimento', 'Lima', 'Araújo', 'Pereira', 'Barbosa', 'Ribeiro', 'Martins',
  'Carvalho', 'Gomes', 'Rocha', 'Dias', 'Monteiro', 'Teixeira',
];

const categorias = ['Eletrônicos', 'Moda', 'Alimentos', 'Casa e Jardim', 'Esportes', 'Beleza', 'Livros', 'Brinquedos'];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomNBOClients(count: number): NBOClient[] {
  const clients: NBOClient[] = [];
  for (let i = 0; i < count; i++) {
    const first = firstNames[rand(0, firstNames.length - 1)];
    const last = lastNames[rand(0, lastNames.length - 1)];
    clients.push({
      nome: `${first} ${last}`,
      id_cliente: String(i + 1).padStart(4, '0'),
      gasto_total: rand(100, 12000),
      categoria_preferida: categorias[rand(0, categorias.length - 1)],
      ultima_compra_dias: rand(1, 180),
    });
  }
  return clients;
}
