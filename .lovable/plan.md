

# Persistir Dados RFV + Gerador de Dados Aleatórios

## Problema Atual
Os dados do upload RFV são passados apenas via `location.state` (memória do React Router). Se o usuário recarrega a página ou volta depois, perde tudo. Nada é salvo no banco.

## Solução em 2 partes

### 1. Persistir dados RFV no banco

**Nova tabela `rfv_uploads`**:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `client_data` (jsonb) -- array completo de ClientData
- `created_at` (timestamptz, default now())
- RLS: usuário vê/insere/atualiza apenas os próprios registros
- Constraint de unicidade em `user_id` (1 upload ativo por usuário, usa UPSERT)

**Fluxo ajustado**:
- `RFVUpload.tsx`: após processar o arquivo, salvar o array no banco via `supabase.from('rfv_uploads').upsert()`
- `RFVParametros.tsx`: se `location.state` estiver vazio, buscar do banco
- `RFVDashboard.tsx`: idem -- fallback para o banco se não tiver state
- Isso garante que recarregar a página não perde os dados

### 2. Gerador de dados aleatórios com download

Substituir o botão "Usar Dados de Demonstração" por uma seção interativa:

- **Slider ou input numérico** para escolher quantidade de clientes (50 a 200)
- **Botão "Gerar Dados Aleatórios"**: cria N clientes com nomes, IDs e valores RFV randomizados dentro de faixas realistas
- **Botão "Baixar Excel"**: gera um `.xlsx` com os dados gerados usando a lib `xlsx` (já instalada) e faz download no navegador
- **Botão "Usar para Análise"**: carrega os dados gerados diretamente no fluxo RFV (salva no banco e navega para parametrização)

A função geradora ficará em `rfv-logic.ts` e criará dados com distribuição variada (nomes brasileiros aleatórios, recência 1-365, frequência 1-20, valor 200-15000).

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| Migration SQL | Criar tabela `rfv_uploads` com RLS |
| `src/lib/rfv-logic.ts` | Função `generateRandomClients(count)` + lista de nomes |
| `src/pages/RFVUpload.tsx` | Salvar no banco após upload; seção de geração aleatória com slider, download e uso direto |
| `src/pages/RFVParametros.tsx` | Fallback: buscar dados do banco se state vazio |
| `src/pages/RFVDashboard.tsx` | Fallback: buscar dados do banco se state vazio |

