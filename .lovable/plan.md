# Bloco "Distribuição de Scores" no Dashboard RFV

## Nada fica fixo

Nenhum valor da planilha entra no código. As regras de análise atuais continuam exatamente iguais — o RFV segue sendo calculado com os parâmetros que você escolher na tela de parametrização (percentil ou valores fixos).

O novo bloco é só uma **visualização** dos cortes que a análise já usou por baixo dos panos. Ele lê os parâmetros vigentes e a base carregada no momento e mostra o resultado. Se você mudar os percentuais, o bloco muda junto. Se subir outra base, muda junto também.

O Excel da masterclass serviu apenas para confirmar que a regra do app é a mesma da planilha (validado: com 20%/50% em Recência o app dá 22 e 87 dias, exatamente como no Excel).

## O que aparece na tela

Um card novo no dashboard RFV, abaixo dos KPIs, com uma tabelinha por critério — mesmo formato do Excel:

```text
Recência                                        Base total: 478
Score        Posição   % da Base   Cliente-régua          Valor      Clientes
Top (3)         96        20%      Ailton Lucena          22 dias       96
Middle (2)     239        50%      Aelton Rosa da Silva   87 dias      143
Entry (1)      478       100%      Wender Vasco          177 dias      239
```

Uma tabela igual para Frequência e outra para Valor.

Cada coluna é 100% derivada dos parâmetros atuais:
- **% da Base** — o percentual que você configurou;
- **Posição** — a linha correspondente na base ordenada;
- **Cliente-régua** — quem está nessa posição (o valor dele virou o corte);
- **Valor** — o corte real usado no cálculo dos scores;
- **Clientes** — quantos clientes ficaram com aquela nota.

No modo "valores fixos" o corte é o número que você digitou, as colunas Posição/%/Cliente-régua não se aplicam e a coluna Clientes continua mostrando a contagem real.

## Como usar na masterclass
Basta configurar os mesmos percentuais do Excel (Recência 20/50, Frequência 5/50, Valor 5/50) e os cortes e contagens batem com a planilha. Depois é só mudar os percentuais para mostrar que a análise recalcula tudo na hora.

## Detalhes técnicos
- `src/lib/rfv-logic.ts`: nova função `computeScoreDistribution(clients, params)` que reaproveita `computeRealCutoffs` (a mesma usada no scoring) — sem lógica paralela, sem constante nova. Retorna por critério e por nota: percentual, posição, valor de corte, nome do cliente-régua e contagem.
- `src/pages/RFVDashboard.tsx`: componente `ScoreDistributionCard` renderizando as três tabelas, com as cores atuais por nota (Top dourado, Middle laranja, Entry cinza).
- Exportação CSV do RFV ganha o mesmo bloco (padrão atual: ponto e vírgula + BOM).

Observação: em Frequência e Valor há muitos empates na base, então o nome exibido pode ser outro cliente com o mesmo valor da planilha — o valor de corte e as contagens são idênticos.
