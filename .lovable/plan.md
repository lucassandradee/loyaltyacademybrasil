

# Redirecionar Usuário Logado com Diagnóstico Existente

## Problema
Usuário já preencheu o questionário e criou conta, mas ao acessar `/diagnostico` novamente, precisa refazer tudo. O sistema deveria detectar que já existe um diagnóstico salvo e redirecionar.

## Alterações

### 1. Diagnostico.tsx
- No `useEffect`, verificar se o usuário está logado (`supabase.auth.getUser()`)
- Se logado, checar se já existe registro em `diagnostic_responses` para esse usuário
- Se existir, redirecionar automaticamente para `/resultado` (que já carrega do banco)
- Se não existir, permitir preencher normalmente

### 2. Página Inicial (Index.tsx)
- Se usuário logado acessa a landing page, mostrar botão "Ver meu Plano" em vez de "Começar Diagnóstico"
- Ou redirecionar direto para `/resultado`

### 3. Header.tsx
- Quando logado, o botão/link deve levar para `/resultado` em vez de mostrar "Sair" sozinho

## Fluxo Corrigido

```text
Usuário logado acessa /diagnostico
  → Tem diagnóstico salvo? → Redireciona para /resultado
  → Não tem? → Mostra questionário normalmente

Usuário logado acessa / (landing)
  → Mostra opção de ir para /resultado diretamente
```

