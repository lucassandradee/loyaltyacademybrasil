

# Menu de Perfil no Header para Usuário Logado

## Resumo
Substituir o botão "Sair" por um avatar clicável com dropdown menu contendo links para: Meu Perfil, Meu Diagnóstico, Plano de Loyalty, Análise de Clientes (RFV), e Sair.

## Alterações

### 1. Header.tsx
- Quando logado, mostrar avatar com iniciais do usuário (buscar do `profiles`)
- Ao clicar, abrir `DropdownMenu` com as opções:
  - **Meu Perfil** → nova página `/perfil` (dados cadastrais editáveis)
  - **Meu Diagnóstico** → `/diagnostico` (formulário preenchido, read-only)
  - **Plano de Loyalty** → `/resultado`
  - **Análise de Clientes** → `/rfv`
  - Separador + **Sair**

### 2. Nova página Perfil (`src/pages/Perfil.tsx`)
- Exibe nome, email, empresa, cargo do usuário
- Permite editar nome, empresa, cargo (update na tabela `profiles`)
- Card simples com formulário

### 3. App.tsx
- Adicionar rota `/perfil` dentro do `AuthenticatedLayout`

### 4. AppSidebar.tsx
- Adicionar link "Meu Perfil" na seção de perfil da sidebar

## Componentes usados
- `DropdownMenu` do shadcn (já existe no projeto)
- `Avatar` + `AvatarFallback` (já existem)
- Fetch do perfil via `supabase.from('profiles').select()`

