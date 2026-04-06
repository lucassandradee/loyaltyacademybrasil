

## Problema

O FormularioLAB carrega dados de duas fontes que podem conter lixo de sessões anteriores:

1. **localStorage** (`lab_draft`, `lab_step`): persiste entre contas no mesmo navegador. Um usuário anterior preencheu o formulário, e o localStorage ficou com os dados.
2. **diagnostic_responses do banco**: o cadastro inicial salva nessa mesma tabela. Se houver chave `lab` residual, o formulário carrega como se já tivesse sido preenchido.

## Correção

### Arquivo: `src/pages/FormularioLAB.tsx`

1. **Limpar localStorage ao montar**: antes de tentar carregar do DB, limpar `lab_draft` e `lab_step` do localStorage se os dados do DB para o usuário atual NÃO tiverem `answers.lab`. Isso garante que dados de outra conta não vazem.

2. **Inicializar estado vazio**: mudar o `useState` inicial de `answers` e `step` para NÃO ler do localStorage no construtor. Em vez disso, inicializar vazio e só carregar no `useEffect` após verificar o DB.

3. **Fluxo correto**:
   - Mount → buscar `diagnostic_responses` do usuário atual
   - Se tiver `answers.lab` no DB → carregar
   - Se NÃO tiver → manter vazio (e limpar localStorage)
   - Só salvar no localStorage DEPOIS de confirmar que os dados são do usuário atual

### Arquivo: `src/pages/Login.tsx` / `src/pages/Cadastro.tsx` (se necessário)

4. **Limpar localStorage do LAB no login/cadastro**: ao trocar de conta, limpar `lab_draft` e `lab_step` para evitar vazamento entre contas.

## Resultado esperado
- Conta nova abre o FormularioLAB totalmente vazio
- Dados de outra conta não aparecem
- Se o próprio usuário já preencheu o LAB antes, os dados dele são restaurados corretamente do banco

