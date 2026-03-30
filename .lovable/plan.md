
## Diagnóstico

Hoje, para a sua conta, **não está salvo de forma confiável**. Confirmei que:
- o usuário e o perfil existem;
- porém a tabela de respostas do diagnóstico está **sem nenhum registro** para essa conta.

Ou seja: o sistema está deixando você ver o plano em memória na hora, mas depois perde tudo e volta a pedir o formulário.

## Causa raiz

Há 3 problemas no fluxo atual:

1. **As respostas vivem só em memória/rota (`location.state`)**
   - Se a página recarrega, muda a rota, ou você volta depois, essas respostas somem.

2. **No cadastro, a gravação acontece no momento do `signUp`**
   - Como o app exige autenticação normal, esse insert pode falhar naquele momento.
   - Hoje esse erro não bloqueia o fluxo: ele segue para o resultado mesmo sem ter salvo.

3. **O resultado busca com `.single()`**
   - Quando não existe resposta salva, a tela cai no caso de “zero linhas” e te manda refazer.

## O que vou implementar

### 1. Persistência temporária do formulário antes do login
Guardar o diagnóstico como **rascunho local** no navegador enquanto o usuário responde:
- salvar respostas a cada etapa;
- restaurar automaticamente se a pessoa sair, recarregar ou voltar depois;
- limpar esse rascunho só quando o salvamento definitivo funcionar.

### 2. Salvar no backend do jeito certo após autenticação
Trocar o fluxo frágil atual por um fluxo confiável:

- **Usuário deslogado**
  - responde o questionário;
  - vai para cadastro/login;
  - após autenticar, o sistema pega o rascunho e salva no backend;
  - só depois abre `/resultado`.

- **Usuário já logado**
  - responde o questionário;
  - salva direto no backend;
  - vai para `/resultado` sem passar por cadastro.

### 3. Tornar o salvamento idempotente
Hoje o código usa apenas `insert`. Vou ajustar para existir **um diagnóstico principal por usuário**, evitando duplicação e facilitando retomada:
- adicionar restrição única por `user_id` em `diagnostic_responses`;
- permitir `UPDATE` do próprio diagnóstico;
- usar `upsert` em vez de `insert`.

### 4. Corrigir as páginas que hoje perdem contexto
#### `src/pages/Diagnostico.tsx`
- carregar rascunho local ao abrir;
- salvar progresso local a cada resposta;
- se já existir diagnóstico salvo no backend, redirecionar para `/resultado`;
- se estiver logado e finalizar, salvar direto.

#### `src/pages/Cadastro.tsx`
- ler respostas do `location.state` **ou** do rascunho local;
- se já houver sessão ativa e existir rascunho pendente, salvar antes de redirecionar;
- não navegar para `/resultado` antes do salvamento definitivo.

#### `src/pages/Login.tsx`
- mesma lógica do cadastro;
- ao entrar, salvar o rascunho pendente antes de abrir o plano.

#### `src/pages/Resultado.tsx`
- trocar `.single()` por leitura tolerante a “zero linhas”;
- se não houver registro salvo mas existir rascunho local, usar esse rascunho;
- só mandar para `/diagnostico` quando realmente não existir nada.

### 5. Melhorar feedback de erro
Hoje a falha de salvamento praticamente fica silenciosa. Vou mudar para:
- mostrar toast claro quando não salvar;
- não avançar para o resultado se a persistência falhar;
- manter o rascunho intacto para não perder o que foi respondido.

## Ajuste no backend

Vou aplicar uma pequena melhoria estrutural em `diagnostic_responses`:
- `UNIQUE (user_id)` para garantir 1 diagnóstico principal por usuário;
- política `UPDATE` para o próprio usuário;
- manter `SELECT` e `INSERT` do próprio usuário.

## Fluxo final

```text
Deslogado:
Diagnóstico -> salva rascunho local -> Cadastro/Login -> salva no backend -> Resultado

Logado sem diagnóstico salvo:
Diagnóstico -> salva no backend -> Resultado

Logado com diagnóstico salvo:
Diagnóstico -> Resultado

Se recarregar no meio:
abre página -> recupera rascunho -> continua de onde parou
```

## Arquivos que serão ajustados

- `src/pages/Diagnostico.tsx`
- `src/pages/Cadastro.tsx`
- `src/pages/Login.tsx`
- `src/pages/Resultado.tsx`

## Mudança de banco
- nova migration para:
  - criar unicidade por `user_id` em `diagnostic_responses`;
  - adicionar policy de `UPDATE` do próprio registro.

## Resultado esperado

Depois disso:
- você **não vai mais precisar preencher tudo de novo**;
- o diagnóstico ficará salvo corretamente na sua conta;
- recarregar a página ou voltar depois não fará você perder o que respondeu;
- o plano abrirá sempre a partir do que estiver salvo de verdade.
