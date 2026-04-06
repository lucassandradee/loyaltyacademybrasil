
Objetivo: corrigir 2 coisas sem inventar moda:
1. o pós-cadastro/pós-login sempre cair em Loyalty Management (`/plano-final`);
2. o PDF obedecer a regra correta de paginação.

O que está errado hoje

1. Redirecionamento
- Há vários `navigate('/resultado')` espalhados no app.
- Por isso, quando você abre `/cadastro` ou `/login` já autenticado, ele joga para o Passo 4 em vez de abrir Loyalty Management.

2. PDF
- A exportação ainda não está realmente paginando por bloco lógico.
- Em `Resultado.tsx`, o código captura `mount.children`, mas na prática o `SectionContent` renderiza um wrapper grande; então o PDF continua tratando uma seção inteira como um bloco grande demais.
- Quando esse bloco passa do limite, ele cai no fallback que fatia por pixel (`sliceCanvas`), que é exatamente o que produz essas quebras horrorosas.

Plano de correção

1. Corrigir o destino padrão do usuário autenticado
Arquivos:
- `src/pages/Cadastro.tsx`
- `src/pages/Login.tsx`
- `src/pages/Diagnostico.tsx`
- `src/pages/FormularioLAB.tsx`
- `src/pages/Index.tsx`

Mudança:
- trocar os redirects automáticos de `/resultado` para `/plano-final`.
- regra: redirecionamento automático/session check sempre vai para Loyalty Management.
- `/resultado` fica só para acesso explícito ao Plano Estratégico.

Resultado esperado:
- abriu nova aba em cadastro/login já autenticado -> vai para Loyalty Management
- terminou cadastro/login/diagnóstico/LAB -> vai para Loyalty Management

2. Separar o plano em blocos reais para o PDF
Arquivo principal:
- `src/pages/Resultado.tsx`

Mudança:
- marcar explicitamente os blocos renderizados com `data-pdf-block`.
- regra correta:
  - seção sempre começa em página nova
  - seção pode continuar em páginas seguintes
  - bloco nunca quebra entre páginas
- separar em blocos de verdade:
  - título da seção
  - contexto
  - cada trecho textual
  - cada diagrama
  - principais pontos
  - tabela
  - conclusão
  - fases do cronograma
  - cards/itens do 5W2H

3. Reescrever a captura do PDF para usar esses blocos
Arquivo:
- `src/pages/Resultado.tsx`

Mudança:
- parar de usar a estrutura atual que captura wrapper grande demais.
- renderizar a seção no host oculto e coletar `[data-pdf-block]`.
- antes de inserir cada bloco:
  - calcular altura no PDF
  - se não couber no espaço restante, abrir nova página
  - inserir o bloco inteiro na próxima página

4. Eliminar o corte cego por pixel
Arquivo:
- `src/pages/Resultado.tsx`

Mudança:
- remover o uso normal de `sliceCanvas`.
- só permitir quebra em caso excepcional de bloco maior que uma página inteira.
- nesses casos, dividir pelo conteúdo lógico, não por fatia visual:
  - cronograma: por fase
  - 5W2H: por card/grupo
  - listas: por item/grupo
  - tabela: por grupos de linhas

5. Não mexer no espaçamento global da tela
- vou manter a UI do plano como está agora e focar só em:
  - redirect correto
  - paginação correta do PDF

Detalhes técnicos
- Problema central do PDF não é “margem” nem “escala”; é granularidade errada de captura.
- Enquanto a exportação enxergar wrapper grande e usar `sliceCanvas`, a quebra continuará ruim.
- A correção certa é paginação orientada por bloco lógico real.

Resultado esperado
- Loyalty Management vira a entrada padrão sempre que o usuário já estiver autenticado ou concluir cadastro/login/diagnóstico/LAB.
- Cada seção do PDF começa em página nova.
- A seção pode seguir para a página seguinte.
- Nenhum bloco quebra no meio.
- Some o efeito de “imagem cortada no facão” entre páginas.
