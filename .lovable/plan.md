

# Reestruturação Completa: Logo, Formulário, Ordem dos Passos e Plano LAB

## Resumo

Trocar o logo ESPM pelo Loyalty Academy Brasil, reestruturar o formulário inicial com perguntas de perfil da empresa, reordenar os passos (1=RFV, 2=NBO, 3=CX, 4=Plano Estratégico baseado no Framework LAB), e criar um formulário adicional antes do plano final com as perguntas do Framework LAB.

---

## 1. Trocar o Logo

- Copiar `user-uploads://lab.webp` para `src/assets/lab-logo.webp`
- Atualizar `Header.tsx`: importar o novo logo no lugar de `espm-logo.jpg`
- Atualizar `Index.tsx`: trocar "Plataforma Educacional ESPM" por "Loyalty Academy Brasil"
- Atualizar `generate-pdf.ts`: trocar textos "ESPM" por "Loyalty Academy Brasil"

## 2. Reestruturar o Formulário Inicial (Diagnostico.tsx)

**Remover**: a pergunta sobre Tiers (`id: 'tiers'`)

**Manter**: perguntas de modelo, frequência, dados, infos, desafio

**Adicionar novas perguntas de perfil da empresa**:
- **Produtos/Serviços**: campo dinâmico com botão "+" onde o usuário adiciona: nome do produto, breve descrição e % de representatividade na venda
- **Ano de fundação**: input numérico
- **Tamanho médio da base de clientes**: seleção (Até 1.000 / 1.001–10.000 / 10.001–50.000 / 50.001–200.000 / Acima de 200.000)
- **Segmento/Indústria**: seleção (Varejo, Serviços, Tecnologia, Saúde, Alimentação, Educação, Outro)
- **Faturamento anual estimado**: seleção (Até R$1M / R$1M–10M / R$10M–50M / R$50M–200M / Acima de R$200M)

Atualizar `DiagnosticAnswers` em `diagnostic-logic.ts` para incluir os novos campos. Remover `tiers` do tipo.

## 3. Reordenar os Passos

**Nova ordem na sidebar (`AppSidebar.tsx`)**:
- Passo 1 — RFV (upload, parametrização, dashboard)
- Passo 2 — Next Best Offer (dashboard)
- Passo 3 — Customer Experience (upload, dashboard)
- Passo 4 — Plano Estratégico de Loyalty (formulário LAB + resultado)

**Atualizar**: labels da sidebar, remover o antigo "Plano Estratégico de Loyalty" do topo, mover para o final como Passo 4.

O "Plano Final / Visão Consolidada" permanece como item final.

## 4. Criar Formulário do Framework LAB (nova página)

Nova página `FormularioLAB.tsx` com perguntas baseadas no framework da imagem, organizado em seções:

1. **Top Objetivos** (multi-select): Expansão, Ganho de Share, Segmentar e premiar por valor, Adquirir clientes, Reter clientes, Combater concorrência, Reduzir custos, Diversificação, Serviços financeiros, Aumentar NPS, Outros
2. **Estrutura do Programa** (single): Programa Próprio, Coalizão, Parceiro, Híbrido
3. **Tipo** (multi-select): Ganhar & Trocar, Tierização Interna, Tierização Pública, Brindes, Gamificação, Comunidades, Comportamento e Estilo, Recomendação, Assinatura
4. **Plataforma (LMS)** (single): Própria, Terceirizada
5. **Estratégia** (multi-select): Apoio C-Level, Lançamento Piloto, Roll-out, Lançamento Big-Bang, Anuidade para todos, Tiers, Marketplace, Clube de Descontos, Gamificação, Pilares ESG, OPM, Estratégia de saída, Calendário de comunicação, Capacitação força de vendas
6. **Time Estratégico** (single): Próprio, Terceirizado, Híbrido
7. **Benefícios Tangíveis** (multi-select): Descontos, Pontos que expiram, Pontos que não expiram, Cashback/Gift back, Pontos/troca
8. **Benefícios Intangíveis** (multi-select): Privilégios, Serviços exclusivos, Outros
9. **Tierização/Segmentação** (single): Pública, Interna, Não aplicar
10. **Segmentação** (multi-select): Existente (Valor/RFV), Básico + Jornada, Completo, Tipo de benefício, Geolocalização, Outras
11. **Cadastro** (multi-select): Loja física/digital, App, Site
12. **Infos Cadastro** (single): Básico + Jornada, Completo
13. **Canais de Comunicação** (multi-select com ranking): App/Push, E-mail, WhatsApp/SMS, PDV, Recibo no caixa, Mala impressa, Mídia massa, Mídias sociais
14. **Operações** (multi-select): Unificação Database, CRM, Uso de dados/Hiperpersonalização, Call center próprio vs terceirizado, Atendimento humano vs bot vs híbrido, IA
15. **Custos** (multi-select): Impacta ROI programa vs não, Custos adicionais, Quem absorve (lojas, matriz, híbrido)

Rota: `/lab-framework` — acessível antes de gerar o Plano Estratégico final.

## 5. Adaptar o Plano Estratégico (Resultado.tsx)

O Plano Estratégico agora será o **Passo 4**, gerado após RFV + NBO + CX + formulário LAB. Ele incorporará:
- Os dados do perfil da empresa (formulário inicial)
- Os resultados da análise RFV, NBO e CX
- As respostas do formulário LAB

A estrutura do plano seguirá as colunas do Framework LAB:
1. Top Objetivos
2. Estrutura do Programa / Plataforma
3. Estratégia
4. Benefícios (tangíveis e intangíveis)
5. Tierização / Segmentação
6. Cadastro / Canais de Comunicação
7. Operações
8. Custos do Programa

Cada seção mostrará as escolhas do usuário + recomendações inteligentes baseadas nos dados dos passos anteriores.

## 6. Atualizar Navegação e Fluxo

- Sidebar: nova ordem dos passos
- `Index.tsx`: atualizar textos e CTA para refletir o novo fluxo (primeiro RFV, não diagnóstico)
- Após login/cadastro, redirecionar para upload RFV (Passo 1)
- O formulário do perfil da empresa pode ser parte do onboarding (após cadastro)
- O formulário LAB fica antes do Plano Estratégico (Passo 4)

## Detalhes Técnicos

**Arquivos a criar**:
- `src/pages/FormularioLAB.tsx` — formulário com perguntas do framework
- Atualizar `src/lib/diagnostic-logic.ts` — novo tipo com campos de perfil + LAB, remover `tiers`

**Arquivos a modificar**:
- `src/components/Header.tsx` — novo logo
- `src/components/AppSidebar.tsx` — reordenar passos
- `src/pages/Diagnostico.tsx` — novas perguntas de perfil, remover tiers, UI para produtos dinâmicos
- `src/pages/Resultado.tsx` — integrar dados LAB + analytics na geração do plano
- `src/pages/PlanoFinal.tsx` — ajustar referências de passos
- `src/pages/Index.tsx` — atualizar textos
- `src/lib/generate-pdf.ts` — atualizar branding
- `src/App.tsx` — nova rota `/lab-framework`

**Banco de dados**: 
- Criar nova tabela `lab_responses` (id, user_id, answers jsonb, created_at) com RLS para o próprio user
- Ou reutilizar `diagnostic_responses` expandindo o campo `answers` (mais simples, sem migração)

