

# Passo 3 (Next Best Offer) + Passo 4 (Customer Experience) + Plano Final

## Conceito do Passo 3 — Next Best Offer (NBO)

A ideia é: dado o histórico de compras/gastos dos clientes, propor **quebras de faixas de gasto** para criar promoções segmentadas. O usuário faz upload de uma base com clientes e seus gastos, e o sistema:
- Segmenta em faixas de gasto (ex: até R$500, R$501-2000, R$2001-5000, acima de R$5000)
- Propõe a "próxima melhor oferta" para cada faixa (upsell para a faixa acima)
- Gera um plano de ação com promoções recomendadas por faixa

## Conceito do Passo 4 — Customer Experience (CX)

Upload de base de chamados contendo: TMA, NPS, motivo/causa raiz. O dashboard mostra:
- KPIs: TMA médio/mín/máx, NPS médio/mín/máx
- Ranking de causas raiz por volume
- Impacto estimado no NPS se resolver cada causa (baseado na proporção)
- Plano de ação CX

## Conceito do Passo 5 — Plano Final Consolidado

Página que puxa os resultados dos passos 1-4 e gera uma conclusão global com próximos passos.

---

## Estrutura de arquivos

| Arquivo | Descrição |
|---|---|
| `src/lib/nbo-logic.ts` | Interfaces, segmentação por faixas de gasto, propostas de oferta por faixa |
| `src/lib/nbo-random.ts` | Gerador de dados aleatórios NBO |
| `src/pages/NBOUpload.tsx` | Upload de base + geração aleatória + histórico (mesmo padrão do RFV) |
| `src/pages/NBODashboard.tsx` | Dashboard com faixas de gasto, gráficos, tabela de clientes, plano de ação |
| `src/lib/cx-logic.ts` | Interfaces (chamado com TMA, NPS, causa raiz), cálculos de impacto |
| `src/lib/cx-random.ts` | Gerador de dados aleatórios de chamados |
| `src/pages/CXUpload.tsx` | Upload de base de chamados + geração aleatória + histórico |
| `src/pages/CXDashboard.tsx` | Dashboard CX com KPIs, ranking causas raiz, impacto NPS, plano de ação |
| `src/pages/PlanoFinal.tsx` | Consolidação: resume resultados dos 4 passos, próximos passos |
| `src/components/AppSidebar.tsx` | Adicionar Passo 3, 4 e Plano Final na sidebar |
| `src/App.tsx` | Novas rotas |
| Migration SQL | Tabelas `nbo_uploads` e `cx_uploads` com RLS |

---

## Detalhes por componente

### Passo 3 — NBO

**Base esperada**: colunas `nome`, `id_cliente`, `gasto_total`, `categoria_preferida` (opcional), `ultima_compra_dias`

**Faixas de gasto** (configuráveis): Bronze (até R$500), Prata (R$501-2000), Ouro (R$2001-5000), Diamante (acima R$5000)

**Próxima melhor oferta por faixa**:
- Bronze → "Cupom de 15% para compras acima de R$500" (puxar para Prata)
- Prata → "Frete grátis + 10% em compras acima de R$2000" (puxar para Ouro)
- Ouro → "Acesso VIP + cashback 5% acima de R$5000" (puxar para Diamante)
- Diamante → "Experiência exclusiva, programa de embaixadores"

**Dashboard**: gráfico de barras por faixa, tabela de clientes filtrável, plano de ação 5W2H + Eisenhower

### Passo 4 — CX

**Base esperada**: colunas `id_chamado`, `cliente`, `tma_minutos`, `nps_score`, `causa_raiz`, `data_chamado`

**KPIs**: cards com TMA (médio, mín, máx) e NPS (médio, mín, máx)

**Causas raiz**: ranking por volume, com cálculo de "se eliminar essa causa, NPS melhora X pontos" baseado na média do NPS dos chamados daquela causa vs média geral

**Plano de ação**: 5W2H + Eisenhower por causa raiz (top 5)

### Passo 5 — Plano Final

- Card resumo do diagnóstico (Passo 1)
- Card resumo da segmentação RFV (Passo 2): distribuição de clusters
- Card resumo NBO (Passo 3): distribuição por faixa
- Card resumo CX (Passo 4): NPS médio, top causas
- Seção "Próximos Passos" com recomendações consolidadas
- Botão para baixar tudo em PDF/Excel

### Sidebar

```text
Plano Estratégico de Loyalty
  └─ Plano Estratégico

Passo 2 — RFV
  ├─ Upload Base de Dados
  ├─ Parametrização
  └─ Dashboard

Passo 3 — Next Best Offer
  ├─ Upload Base de Dados
  └─ Dashboard

Passo 4 — Customer Experience
  ├─ Upload Base de Dados
  └─ Dashboard

Plano Final
  └─ Visão Consolidada
```

Cada passo tem bloqueio condicional (mesma lógica: só libera sub-itens após upload).

### Banco de dados

Duas novas tabelas com a mesma estrutura do `rfv_uploads`:

```sql
CREATE TABLE nbo_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_data jsonb NOT NULL,
  file_name text NOT NULL DEFAULT 'Upload',
  client_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cx_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ticket_data jsonb NOT NULL,
  file_name text NOT NULL DEFAULT 'Upload',
  ticket_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

RLS idêntico ao rfv_uploads (SELECT/INSERT/UPDATE/DELETE para o próprio user_id).

