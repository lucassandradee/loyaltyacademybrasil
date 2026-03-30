

# Cadastro + Plano Estratégico Completo com PDF

## Resumo

Três mudanças principais:
1. Tela de cadastro entre o questionário e o resultado
2. Plano estratégico muito mais completo (2-3 páginas na tela, com seções detalhadas)
3. Botão para baixar PDF com logo da plataforma em todas as páginas

## 1. Backend (Lovable Cloud / Supabase)

### Tabelas necessárias

**profiles** — criada automaticamente no signup via trigger:
- `id` (uuid, FK auth.users)
- `nome` (text)
- `empresa` (text)
- `cargo` (text)
- `created_at`

**diagnostic_responses** — salva as respostas do questionário:
- `id` (uuid)
- `user_id` (uuid, FK auth.users, NOT NULL)
- `answers` (jsonb) — armazena o objeto DiagnosticAnswers completo
- `created_at`

RLS: usuários só acessam seus próprios registros.

### Auth
- Email + senha (signup simples com nome, empresa, cargo)

## 2. Fluxo Atualizado

```text
Questionário (6 perguntas)
        ↓
  Tela de Cadastro (nome, email, empresa, cargo, senha)
  - Se já logado, pula direto
  - Ao criar conta, salva answers no banco
        ↓
  Plano Estratégico (Resultado)
  - Carrega answers do banco (ou do state)
  - Botão "Baixar PDF"
```

### Nova rota: `/cadastro`
- Recebe answers via location.state
- Formulário: nome, empresa, cargo, email, senha
- Ao submeter: cria conta → salva answers no `diagnostic_responses` → navega para `/resultado`
- Link "Já tenho conta" para login simples

## 3. Plano Estratégico Expandido

O `generateDiagnostic` será ampliado para retornar um relatório muito mais completo, com as seguintes seções:

1. **Sumário Executivo** — parágrafo personalizado resumindo o cenário do negócio
2. **Diagnóstico de Maturidade** — nível, score, descrição detalhada, pontos fortes e gaps identificados
3. **Modelo de Programa Recomendado** — tipo, descrição, mecânica de funcionamento, exemplos de mercado
4. **Estrutura de Tiers/Níveis** — se aplicável, descrição de cada tier com benefícios sugeridos
5. **Foco Estratégico e Plano de Ação** — objetivo, descrição, 6-8 ações detalhadas com prioridade
6. **KPIs e Métricas de Sucesso** — métricas recomendadas com metas sugeridas
7. **Cronograma de Implementação** — fases (curto/médio/longo prazo) com marcos
8. **Checklist de Próximos Passos** — lista expandida e categorizada

Toda a lógica condicional será baseada nas respostas (modelo de negócio, frequência, maturidade de dados, desafio, tiers).

### Tela de Resultado Redesenhada
- Layout de relatório profissional com seções colapsáveis
- Cada seção em card próprio com ícone
- Botão fixo "Baixar PDF" no topo

## 4. Geração de PDF (client-side)

Usar **jsPDF** + **jspdf-autotable** para gerar o PDF no browser:
- Header em todas as páginas: logo ESPM + nome da plataforma
- Footer: número da página
- Conteúdo formatado com as 8 seções do plano
- Cores corporativas ESPM (#A80030)
- ~2-3 páginas de conteúdo

## Arquivos Modificados/Criados

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabelas `profiles`, `diagnostic_responses` + trigger + RLS |
| `src/pages/Cadastro.tsx` | Nova tela de registro |
| `src/pages/Login.tsx` | Tela de login simples |
| `src/pages/Diagnostico.tsx` | Navegar para `/cadastro` ao finalizar |
| `src/lib/diagnostic-logic.ts` | Expandir `DiagnosticResult` e `generateDiagnostic` significativamente |
| `src/pages/Resultado.tsx` | Redesenhar com seções expandidas + botão PDF |
| `src/lib/generate-pdf.ts` | Lógica de geração do PDF com jsPDF |
| `src/App.tsx` | Adicionar rotas `/cadastro` e `/login` |
| `src/lib/supabase.ts` | Cliente Supabase |

