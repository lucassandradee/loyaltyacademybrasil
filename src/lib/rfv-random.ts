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
  // Create diverse client profiles to avoid over-concentration in any segment
  const profiles = [
    { recMin: 1, recMax: 30, freqMin: 8, freqMax: 20, valMin: 5000, valMax: 15000, weight: 0.12 },   // Champions
    { recMin: 1, recMax: 60, freqMin: 5, freqMax: 12, valMin: 3000, valMax: 10000, weight: 0.15 },   // Loyal
    { recMin: 1, recMax: 45, freqMin: 1, freqMax: 4, valMin: 500, valMax: 5000, weight: 0.12 },      // Recent
    { recMin: 30, recMax: 120, freqMin: 3, freqMax: 8, valMin: 1500, valMax: 6000, weight: 0.13 },   // Potential
    { recMin: 60, recMax: 180, freqMin: 2, freqMax: 6, valMin: 800, valMax: 4000, weight: 0.13 },    // Needs attention
    { recMin: 90, recMax: 250, freqMin: 1, freqMax: 4, valMin: 300, valMax: 3000, weight: 0.12 },    // About to sleep
    { recMin: 150, recMax: 365, freqMin: 1, freqMax: 3, valMin: 200, valMax: 2000, weight: 0.12 },   // At risk
    { recMin: 200, recMax: 365, freqMin: 1, freqMax: 2, valMin: 200, valMax: 1500, weight: 0.11 },   // Lost
  ];

  for (let i = 0; i < count; i++) {
    // Pick a profile based on weights
    const r = Math.random();
    let cum = 0;
    let profile = profiles[0];
    for (const p of profiles) {
      cum += p.weight;
      if (r <= cum) { profile = p; break; }
    }

    const first = firstNames[rand(0, firstNames.length - 1)];
    const last = lastNames[rand(0, lastNames.length - 1)];
    clients.push({
      nome: `${first} ${last}`,
      id_cliente: String(i + 1).padStart(4, '0'),
      recencia: rand(profile.recMin, profile.recMax),
      frequencia: rand(profile.freqMin, profile.freqMax),
      valor: rand(profile.valMin, profile.valMax),
    });
  }
  return clients;
}
