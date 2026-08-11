# Distribuição de Scores no Dashboard RFV (igual ao Excel da masterclass)

## Regra decodificada (validada contra a base de 478 clientes)

Para cada critério:
1. Ordena a base pelo critério (Recência: do menor para o maior; Frequência e Valor: do maior para o menor).
2. Converte o percentual escolhido em posição: `posição = arredonda(% x total)`.
3. O valor do cliente que está nessa posição vira o valor de corte da nota.
4. Nota 3 = até o corte do Top; Nota 2 = até o corte do Middle; Nota 1 = o restante (100% da base).

Validação com a planilha enviada:

```text
Recência    20%  -> pos 96  -> Ailton Lucena        -> 22 dias   OK
            50%  -> pos 239 -> Aelton Rosa da Silva -> 87 dias   OK
           100%  -> pos 478 -> Wender Vasco         -> 177 dias  OK
Frequência   5%  -> pos 24  -> 5 compras                          OK
            50%  -> pos 239 -> 2 compras                          OK
Pontos       5%  -> pos 24  -> 5.000                              OK
            50%  -> pos 239 -> 1.000                              OK
```

Observação: em Frequência e Pontos há muitos empates, então o nome exibido na planilha pode ser outro cliente com o mesmo valor. O valor de corte é sempre idêntico; o nome é apenas ilustrativo. O bloco "Valor Monetário" da planilha usa uma coluna de reais que não existe nessa base (a base tem só Recência, Frequência e Valor/Pontos).

## O que será feito

### 1. Cálculo (`src/lib/rfv-logic.ts`)
Nova função `computeScoreDistribution(clients, params)` que devolve, por critério e por nota (3, 2, 1):
- posição de corte, percentual usado e valor de corte;
- nome do cliente-régua (o que ocupa a posição);
- quantidade de clientes com aquela nota e o % efetivo da base.

Funciona nos dois modos já existentes: percentil e valores fixos (no modo fixo o corte é o valor digitado e não há cliente-régua).

### 2. Novo bloco no dashboard (`src/pages/RFVDashboard.tsx`)
Card "Distribuição de Scores", logo abaixo dos KPIs, com uma tabela por critério no mesmo formato da planilha:

```text
Recência        Posição   % da Base   Cliente-régua        Valor    Clientes
Top (3)            96        20%      Ailton Lucena        22 dias     96
Middle (2)        239        50%      Aelton Rosa da Silva 87 dias    143
Entry (1)         478       100%      Wender Vasco        177 dias    239
```

Cores por nota seguindo a identidade atual (Top dourado, Middle laranja, Entry cinza) e total da base no cabeçalho do card.

### 3. Exportação
O bloco entra no CSV de exportação do RFV (mesmo padrão atual: ponto e vírgula + BOM), para comparar lado a lado com o Excel na masterclass.

## Como reproduzir os números da planilha no app
Na tela de parametrização, usar os mesmos percentuais do Excel: Recência 20/50, Frequência 5/50, Valor 5/50. Aí os cortes e as contagens batem 100%.
