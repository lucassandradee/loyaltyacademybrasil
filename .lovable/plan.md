

# Ajustes: Sidebar, Botão Refazer, e Bloqueio Módulo 2

## 1. Renomear Módulo 1 na Sidebar
- Em `AppSidebar.tsx`, trocar o label "Módulo 1 — Loyalty" para **"Plano Estratégico de Loyalty"**

## 2. Botão "Refazer Diagnóstico" na página Resultado
- Em `Resultado.tsx`, adicionar um botão **"Refazer Diagnóstico"** logo abaixo do botão "Baixar PDF"
- Ao clicar, limpar o rascunho local (`localStorage`) e navegar para `/diagnostico` com um flag (ex: `?refazer=true`)
- Em `Diagnostico.tsx`, quando detectar esse flag, ignorar o diagnóstico salvo no banco e permitir refazer

## 3. Bloquear Parametrização e Dashboard no Módulo 2 até o Upload
- Em `AppSidebar.tsx`, verificar se já existe dados RFV carregados (checar `localStorage` por uma chave como `rfv_data_uploaded` que será setada após upload bem-sucedido)
- Itens "Parametrização" e "Dashboard" ficam desabilitados (cinza, sem link) até que o upload tenha sido feito
- Em `RFVUpload.tsx`, após `processData` com sucesso, setar `localStorage.setItem('rfv_data_uploaded', 'true')`

## Arquivos alterados
| Arquivo | Mudança |
|---|---|
| `src/components/AppSidebar.tsx` | Renomear label do Módulo 1; bloquear itens do Módulo 2 condicionalmente |
| `src/pages/Resultado.tsx` | Adicionar botão "Refazer Diagnóstico" abaixo do PDF |
| `src/pages/Diagnostico.tsx` | Aceitar param `?refazer=true` para ignorar diagnóstico existente |
| `src/pages/RFVUpload.tsx` | Setar flag `rfv_data_uploaded` no localStorage após upload |

