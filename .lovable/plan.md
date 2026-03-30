

# Botão de Login no Header + Sidebar de Navegação Pós-Login

## Resumo

1. Adicionar botão "Entrar" no header (visível quando não logado)
2. Após login, substituir layout com sidebar lateral contendo navegação entre módulos
3. Na área logada, mostrar dados cadastrais do usuário na sidebar
4. Sidebar com links: Plano de Loyalty (Resultado), Módulo 2 (Upload RFV / Parametrização / Dashboard)

## Alterações

### 1. Header (`src/components/Header.tsx`)
- Verificar sessão do usuário com `supabase.auth.onAuthStateChange`
- Se **não logado**: mostrar botão "Entrar" que navega para `/login`
- Se **logado**: mostrar nome do usuário + botão "Sair"

### 2. Layout com Sidebar (`src/components/AppSidebar.tsx` — novo)
- Usar componentes `Sidebar` do shadcn já existente
- Seções:
  - **Perfil**: nome, empresa, cargo do usuário (lido da tabela `profiles`)
  - **Módulo 1**: link para "Plano Estratégico" (`/resultado`)
  - **Módulo 2**: links para Upload, Parametrização, Dashboard RFV
- Highlight da rota ativa

### 3. Layout Logado (`src/components/AuthenticatedLayout.tsx` — novo)
- Wrapper com `SidebarProvider` + `AppSidebar` + conteúdo principal
- Usado nas rotas que requerem login (`/resultado`, `/rfv/*`)

### 4. App.tsx
- Rotas `/resultado` e `/rfv/*` envolvidas pelo `AuthenticatedLayout`
- Rotas públicas (`/`, `/diagnostico`, `/cadastro`, `/login`) mantêm layout atual sem sidebar

### 5. Login.tsx
- Após login sem `answers`, redirecionar para `/resultado` (carregar último diagnóstico do banco)

### 6. Resultado.tsx
- Se não receber `answers` via state, buscar último diagnóstico do banco (`diagnostic_responses`) para o usuário logado
- Remover redirecionamento para `/` quando não há answers no state

## Fluxo

```text
Página Inicial (botão "Entrar" no header)
    → Login / Cadastro
    → Layout com Sidebar:
        ├── Perfil (nome, empresa, cargo)
        ├── Plano de Loyalty (/resultado)
        └── Módulo 2
            ├── Upload RFV
            ├── Parametrização
            └── Dashboard
```

