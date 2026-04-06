
Objetivo: deixar o fluxo claro para o usuário, travar a navegação na ordem correta e corrigir de vez a experiência de geração do plano/PDF sem mais “silêncio” nem cortes feios.

1. Feedback visual real na geração do plano
- Arquivo principal: `src/pages/Resultado.tsx`
- Hoje o usuário só vê um loader genérico quando não há seções, e se a IA devolver conteúdo incompleto ele parece “travado” ou “terminado”.
- Vou transformar a geração em um estado visível na própria tela:
  - status textual (“coletando dados”, “gerando conteúdo”, “montando seções”, “finalizado” / “erro”)
  - overlay/modal de progresso ao regenerar
  - mensagem clara se o retorno vier incompleto ou inválido
  - fallback visual quando vier só 1 seção ou conteúdo mal parseado, orientando a tentar regenerar
- Também vou evitar o falso positivo de “sumário executivo apenas” validando melhor o retorno antes de considerar o plano pronto.

2. Feedback visual real na geração do PDF
- Arquivo principal: `src/pages/Resultado.tsx`
- Hoje o PDF só usa toast; isso é fraco para uma operação longa.
- Vou adicionar estado de exportação visível na tela:
  - botão “PDF Completo” com loading real
  - overlay/modal com etapa atual (“preparando seções”, “capturando blocos”, “montando páginas”, “baixando arquivo”)
  - mensagem de erro detalhada se falhar
- Assim o usuário sabe se está executando, se travou ou se concluiu.

3. Corrigir a quebra de página do PDF pelo conteúdo lógico
- Arquivo principal: `src/pages/Resultado.tsx`
- O problema atual ainda existe porque o código continua permitindo fallback com corte por pixel (`sliceCanvas`) quando um bloco passa da altura útil.
- Vou ajustar a regra para funcionar assim:
  - cada seção sempre começa em nova página
  - a seção pode continuar em páginas seguintes
  - cada bloco deve entrar inteiro na página; se não couber, vai inteiro para a próxima
  - se um bloco for grande demais, ele precisa ser quebrado antes na estrutura React, não no canvas
- Para isso, vou refinar os `data-pdf-block`:
  - texto longo por sub-bloco
  - tabela por grupos/linhas
  - cronograma por fase
  - 5W2H por card
- O objetivo é matar o corte cego, não só “amenizar”.

4. Melhorar especificamente o PDF do Plano de Ação 5W2H
- Arquivo principal: `src/pages/Resultado.tsx`
- Pela imagem, o 5W2H está ruim de visualizar e ainda pode gerar card vazio/placeholder feio.
- Vou ajustar a renderização para PDF:
  - garantir parse robusto da tabela 5W2H
  - ignorar linhas inválidas/vazias
  - manter um card por ação como bloco indivisível
  - melhorar hierarquia visual dentro do card para leitura no PDF
- Se necessário, separo visualização de tela e visualização de exportação para o 5W2H, sem mudar o restante da UX.

5. Travar o fluxo exatamente na ordem do menu
- Arquivos principais:
  - `src/components/AppSidebar.tsx`
  - `src/pages/PlanoFinal.tsx`
  - possivelmente `src/components/Header.tsx`
- Hoje a sidebar usa flags locais simples (`rfv_data_uploaded`, `cx_data_uploaded`) e não respeita o fluxo completo.
- Vou unificar a lógica de progresso real:
  - Passo 1: RFV concluído
  - Passo 2: NBO só libera depois do RFV
  - Passo 3: CX só libera depois do NBO
  - Passo 4: LAB só libera depois do CX
  - Plano Estratégico só libera depois do LAB/plano gerado
- Também vou adicionar check visual nas etapas concluídas e estilo de bloqueio nas futuras.

6. Adicionar botão de “Próxima etapa” ao final de cada módulo
- Arquivos:
  - `src/pages/RFVDashboard.tsx`
  - `src/pages/NBODashboard.tsx`
  - `src/pages/CXDashboard.tsx`
  - `src/pages/FormularioLAB.tsx` (ajuste final se necessário)
  - `src/pages/Resultado.tsx` / `src/pages/PlanoFinal.tsx` se fizer sentido
- Cada tela de análise vai terminar com CTA claro levando para o próximo passo.
- Isso reforça o fluxo linear e reduz confusão do usuário sobre “o que fazer agora”.

7. Ajustar consistência de navegação global
- Arquivos:
  - `src/pages/Index.tsx`
  - `src/components/Header.tsx`
  - `src/pages/PlanoFinal.tsx`
- Vou alinhar os atalhos para não conflitar com a navegação linear:
  - manter Loyalty Management como entrada do usuário autenticado
  - preservar acesso ao plano estratégico, mas sem sugerir caminhos fora de ordem quando a etapa anterior não estiver concluída
  - revisar o texto do CTA da home, que hoje está inconsistente com o destino real

Detalhes técnicos
- O problema do PDF ainda é estrutural: o código continua fatiando canvas quando um bloco excede a página. Enquanto isso existir, as quebras podem continuar ruins.
- O problema da geração do plano é ausência de estado intermediário explícito e validação fraca do retorno parseado.
- O problema da navegação é que a UI mistura progresso real do backend com flags locais e regras soltas por página.

Resultado esperado
- O usuário vê claramente se o plano está gerando, se terminou ou se falhou.
- O usuário vê claramente se o PDF está exportando, em que etapa está, e se deu erro.
- O menu lateral mostra checks das etapas concluídas e bloqueia as futuras na ordem correta.
- Cada análise termina com botão de próxima etapa.
- O PDF para de parecer “cortado no facão”, especialmente no 5W2H.
