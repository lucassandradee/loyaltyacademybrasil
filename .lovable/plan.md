

# Corrigir gating de etapas e auto-geração indevida do plano

## Problemas identificados

1. **Plano Estratégico auto-gera sem dados**: A página `Resultado.tsx` chama `loadAndGenerate()` no mount (linha 568). Ela só verifica se existem `diagnostic_responses` (o formulário inicial do cadastro). Como o cadastro salva as respostas do diagnóstico, o plano gera imediatamente, sem RFV, NBO ou CX.

2. **Sidebar não bloqueia corretamente**: O gating atual (`step4Enabled = completion.rfv && completion.cx`) não exige NBO nem diagnóstico LAB separado. E o `diagnostic_responses` é preenchido no cadastro, então `lab: true` desde o início.

3. **PlanoFinal.tsx permite navegar para qualquer etapa**: Os cards dos 4 passos são clicáveis sem verificar se a etapa anterior foi concluída.

## Plano de correção

### 1. Resultado.tsx: não auto-gerar sem dados reais
- Modificar `loadAndGenerate` para exigir **pelo menos RFV concluído** antes de gerar o plano.
- Se não tiver RFV, mostrar mensagem clara: "Complete as etapas anteriores antes de gerar o plano" com botão para voltar ao fluxo.
- Separar `diagnostic_responses` (formulário inicial do cadastro) de `lab_completed` (formulário LAB do Passo 4). O plano só deve gerar se o Formulário LAB foi preenchido E pelo menos RFV existe.

### 2. AppSidebar.tsx: gating sequencial rigoroso
- Alterar a lógica de gating:
  - Passo 1 (RFV): sempre habilitado
  - Passo 2 (NBO): só se RFV concluído
  - Passo 3 (CX): só se RFV concluído (NBO usa mesmos dados)
  - Passo 4 (LAB + Plano): só se RFV **e** CX concluídos
  - Plano Estratégico: só se LAB concluído (verificar se `generated_plans` existe ou se o formulário LAB foi preenchido)
- Adicionar verificação de `generated_plans` para o item "Plano Estratégico" especificamente.

### 3. PlanoFinal.tsx: gating nos cards de navegação
- Desabilitar click nos cards de passos futuros se o passo anterior não foi concluído.
- Mostrar visualmente que o card está bloqueado (opacidade, ícone de cadeado).

### 4. Distinguir diagnóstico inicial vs Formulário LAB
- O `diagnostic_responses` é salvo no cadastro (diagnóstico inicial).
- O Formulário LAB é uma etapa separada (Passo 4). Preciso verificar se o FormularioLAB salva em algum lugar diferente ou se usa a mesma tabela.
- Se usa a mesma tabela, adicionar um campo ou verificar se os dados do LAB existem dentro do JSON de answers.

### Arquivos modificados
- `src/pages/Resultado.tsx` — bloquear auto-geração sem dados, mostrar estado "etapas pendentes"
- `src/components/AppSidebar.tsx` — gating sequencial correto
- `src/pages/PlanoFinal.tsx` — desabilitar cards de etapas futuras bloqueadas

### Resultado esperado
- Usuário novo após cadastro cai no Loyalty Management com todas as etapas bloqueadas exceto Passo 1
- Plano Estratégico não gera sozinho sem ter feito RFV + CX + LAB
- Sidebar mostra cadeado nas etapas não liberadas
- Fluxo é estritamente linear: RFV → NBO → CX → LAB → Plano

