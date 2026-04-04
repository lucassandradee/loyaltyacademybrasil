

# Redesign da Parametrização RFV — Layout Vertical com Slider Visual

## Resumo

Trocar o layout de 3 colunas lado a lado para **vertical (um embaixo do outro)**. Cada dimensão (R, F, V) terá um card com layout em 2 colunas: à esquerda um **slider multi-thumb** visual onde o usuário arrasta os pontos de corte numa barra de 0–100%, e à direita uma explicação clara dos scores resultantes com os valores reais da base.

Além disso, mudar o **default** para uma distribuição desigual: Score 1 = 0–50%, Score 2 = 50–90%, Score 3 = 90–100% (top 10% da base). Ao mudar o número de scores, manter proporção similar (scores baixos pegam mais gente, score máximo sempre ~10%).

## Mudanças

### 1. `defaultPercentileParams` em `rfv-logic.ts`

Trocar a distribuição uniforme para uma distribuição "top-heavy":
- 3 scores: `[50, 90]` → Score 1: 0–50%, Score 2: 50–90%, Score 3: 90–100%
- 4 scores: `[35, 65, 90]`
- 5 scores: `[25, 50, 70, 90]`
- N scores: distribuir proporcionalmente mantendo o último score sempre nos top 10%

### 2. `RFVParametros.tsx` — Redesign completo

**Layout**: cards empilhados verticalmente (não mais `grid md:grid-cols-3`)

Cada card terá layout interno em 2 colunas (`grid md:grid-cols-2`):

**Coluna esquerda — Slider visual**:
- Uma barra horizontal representando 0–100% da base
- N-1 thumbs arrastáveis (usando Radix Slider com múltiplos valores)
- Segmentos coloridos entre os thumbs (cores distintas por score)
- Labels dos percentis nos thumbs

**Coluna direita — Resumo dos scores**:
- Lista dos scores com: faixa percentil, valor real correspondente da base, e quantidade estimada de clientes
- Texto explicativo: "Score 3 (Top): os 10% clientes com maior valor"
- Para Recência: nota "↓ Menor = melhor"

### 3. Componente `MultiRangeSlider`

Usar o Slider do Radix (já instalado em `slider.tsx`) com prop `value` como array de N-1 valores. O Radix Slider suporta múltiplos thumbs nativamente passando um array.

Renderizar segmentos coloridos via CSS posicionamento absoluto sobre o track.

## Arquivos a modificar

- `src/lib/rfv-logic.ts` — mudar `defaultPercentileParams` para distribuição top-heavy
- `src/pages/RFVParametros.tsx` — redesign completo: layout vertical, slider visual, painel explicativo

