

# Fix: Redirecionar usuário logado fora da tela de cadastro

## Problema
A rota `/cadastro` não verifica se o usuário já está logado. Mesmo autenticado, o usuário vê o formulário de criação de conta.

## Solução

### 1. Cadastro.tsx
- Adicionar `useEffect` no início que verifica `supabase.auth.getSession()`
- Se já houver sessão ativa, redirecionar para `/resultado`
- Manter o fluxo normal apenas para usuários não autenticados

### 2. Login.tsx
- Mesma lógica: se já logado, redirecionar para `/resultado`

### Fluxo corrigido
```text
Usuário logado acessa /cadastro ou /login
  → Detecta sessão ativa → Redireciona para /resultado
```

