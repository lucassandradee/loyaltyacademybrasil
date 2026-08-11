# Distribuição de Scores mais simples e legível

## O que muda na tela

O card "Distribuição de Scores" fica com uma tabela enxuta por critério, sem coluna de cliente-régua e sem posição:

```text
Recência                          Base total: 478
Score          Corte        Clientes     % da base
Top (3)        até 22 dias      96          20,1%
Middle (2)     até 87 dias     143          29,9%
Entry (1)      acima            239          50,0%
```

Mesma tabela para Frequência e Valor.

- Colunas: Score, Corte, Clientes, % da base.
- Corte escrito de forma legível ("até 22 dias", "5x ou mais", "R$ 5.000 ou mais") em vez de só o número solto.
- Sem rolagem horizontal: com 4 colunas as três tabelas cabem lado a lado; em telas menores empilham.
- Ponto colorido por nota continua (Top dourado, Middle laranja, Entry cinza).

## Correção do cálculo

Hoje, quando a análise usa o modo "valores fixos" (ou os parâmetros legados), as colunas Posição/% da Base/Cliente-régua aparecem como "—" e dá a impressão de que nada foi calculado. Removendo essas colunas, a tabela passa a mostrar sempre corte e contagem reais em qualquer modo de parametrização — percentil ou valores fixos.

A coluna "% da base" passa a ser calculada a partir da contagem real de clientes em cada nota (contagem/total), não do percentual configurado — então bate sempre com o que a análise produziu.

Nada da regra de análise muda: os scores continuam saindo dos parâmetros vigentes.

## Detalhes técnicos

- `src/lib/rfv-logic.ts`: `computeScoreDistribution` deixa de retornar `position` e `clientName`; `pct` passa a ser a share real (`count / total * 100`). Mantém `cutoff` e `count` por nota, funcionando nos três modos de params.
- `src/pages/RFVDashboard.tsx`: tabela reduzida a 4 colunas, corte formatado com prefixo ("até" para recência, "ou mais" para frequência/valor, "acima"/"abaixo" para a nota Entry).
- `exportDistribution`: CSV com as mesmas 4 colunas (mantém ponto e vírgula + BOM).
