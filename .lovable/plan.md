

# Correção de Score 3 e Label de Valor

## Problemas Identificados

1. **Assimetria nos defaults de percentil**: Os mesmos cutoffs `[50, 90]` são usados para R, F e V. Para frequência/valor (higher=better), Score 3 = top 10%. Mas para recência (lower=better, inverted), Score 3 = bottom 50% dos dados. Isso cria uma inconsistência — 50% dos clientes ficam no Score 3 de recência, mas só 10% no Score 3 de valor.

2. **Label "ticket médio"**: Na página de upload (`RFVUpload.tsx` linha 225), o campo valor é descrito como "ticket médio". O usuário quer que seja "valor total gasto".

## Correções

### 1. `src/lib/rfv-logic.ts` — Percentis invertidos para recência

Mudar `defaultPercentileParams` para gerar cutoffs **invertidos** para recência. Para 3 scores:
- Recência: `[10, 50]` → Score 1 = 50-100% (recência alta = ruim), Score 2 = 10-50%, Score 3 = 0-10% (recência baixa = melhor)
- Frequência/Valor: `[50, 90]` → mantém como está

Assim, Score 3 sempre = ~10% melhores clientes em todas as dimensões.

Para N scores, aplicar a mesma lógica invertida: recência usa `[100-corte invertido]`.

### 2. `src/pages/RFVUpload.tsx` — Trocar "ticket médio" por "valor total"

Linha 225: mudar o texto descritivo de "Valor Monetário (ticket médio)" para "Valor Monetário (valor total gasto)".

### 3. `src/pages/RFVParametros.tsx` — Ajustar display dos segmentos

A lógica de display dos segmentos (linhas 62-79) já trata o caso inverted corretamente com `scoreNum = inverted ? numScores - i : i + 1`. Com os novos defaults invertidos para recência, o Score 3 ficará nos ~10% com menor recência (mais recentes), consistente com as outras dimensões.

## Arquivos a modificar
- `src/lib/rfv-logic.ts` — defaults diferentes para recência vs frequência/valor
- `src/pages/RFVUpload.tsx` — label "valor total gasto"

