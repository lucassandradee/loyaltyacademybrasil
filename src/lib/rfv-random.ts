import { ClientData } from './rfv-logic';

const firstNames = [
  'Ana', 'Bruno', 'Carla', 'Daniel', 'Elena', 'Felipe', 'Gabriela', 'Hugo',
  'Isabela', 'João', 'Karen', 'Lucas', 'Marina', 'Neto', 'Olívia', 'Paulo',
  'Rafael', 'Sandra', 'Thiago', 'Valéria', 'Wesley', 'Yara', 'André',
  'Beatriz', 'Cássio', 'Diana', 'Eduardo', 'Fátima', 'Gustavo', 'Helena',
  'Igor', 'Juliana', 'Klaus', 'Lívia', 'Marcos', 'Natália', 'Oscar',
  'Patrícia', 'Renata', 'Sérgio', 'Tatiana', 'Ulisses', 'Vinícius',
  'Wagner', 'Xuxa', 'Zélia', 'Adriana', 'Bernardo', 'Cecília', 'Diego',
  'Elisa', 'Fernando', 'Gisele', 'Henrique', 'Ingrid', 'Jorge', 'Karina',
  'Leonardo', 'Mariana', 'Nicolas', 'Otávio', 'Priscila', 'Rodrigo',
  'Simone', 'Tales', 'Úrsula', 'Vitor', 'William', 'Yasmin', 'Zilda',
];

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Almeida',
  'Nascimento', 'Lima', 'Araújo', 'Pereira', 'Barbosa', 'Ribeiro', 'Martins',
  'Carvalho', 'Gomes', 'Rocha', 'Dias', 'Monteiro', 'Teixeira', 'Mendes',
  'Cardoso', 'Costa', 'Moura', 'Nunes', 'Campos', 'Duarte', 'Vieira',
  'Freitas', 'Correia', 'Pinto', 'Castro', 'Matos', 'Fonseca', 'Borges',
  'Ramos', 'Lopes', 'Cunha', 'Brito', 'Tavares', 'Pacheco', 'Sampaio',
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomClients(count: number): ClientData[] {
  const clients: ClientData[] = [];
  for (let i = 0; i < count; i++) {
    const first = firstNames[rand(0, firstNames.length - 1)];
    const last = lastNames[rand(0, lastNames.length - 1)];
    clients.push({
      nome: `${first} ${last}`,
      id_cliente: String(i + 1).padStart(4, '0'),
      recencia: rand(1, 365),
      frequencia: rand(1, 20),
      valor: rand(200, 15000),
    });
  }
  return clients;
}
