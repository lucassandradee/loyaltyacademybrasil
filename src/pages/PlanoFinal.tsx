import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Users, DollarSign, Star, Target, Trophy, ChevronDown, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { scoreClients, defaultPercentileParams, allClusterNames, clusterColors } from '@/lib/rfv-logic';
import { classifyNBO, allFaixaNames, faixaColors } from '@/lib/nbo-logic';
import { calculateCXKPIs } from '@/lib/cx-logic';
import type { ClientData } from '@/lib/rfv-logic';
import type { CXTicket } from '@/lib/cx-logic';

const steps = [
  { label: 'Análise RFV', description: 'Segmentação da base de clientes por Recência, Frequência e Valor', icon: Users, route: '/rfv', dataKey: 'rfv' },
  { label: 'Next Best Offer', description: 'Classificação por faixa de gasto e propensão de compra', icon: DollarSign, route: '/nbo/dashboard', dataKey: 'nbo' },
  { label: 'Customer Experience', description: 'Análise de chamados, NPS e causas raiz', icon: Star, route: '/cx', dataKey: 'cx' },
  { label: 'Plano Estratégico', description: 'Framework LAB e geração do plano com IA', icon: Target, route: '/lab-framework', dataKey: 'diagnostic' },
];

function getContextMessage(completed: Record<string, boolean>): { title: string; message: string } {
  const done = Object.entries(completed).filter(([, v]) => v).map(([k]) => k);
  const count = done.length;

  if (count === 0) return {
    title: 'Bem-vindo à Certificação em Loyalty Management 4.0',
    message: 'Para construir um programa de fidelidade sólido, é essencial seguir um processo estruturado. Comece pelo Passo 1 — a Análise RFV — para entender o comportamento da sua base de clientes. A partir daí, cada etapa vai construindo uma visão mais completa e estratégica do seu programa de Loyalty.',
  };

  if (count === 1 && done.includes('rfv')) return {
    title: '✅ RFV concluído — agora é hora do Next Best Offer',
    message: 'Excelente! Você já segmentou sua base de clientes por Recência, Frequência e Valor. Com essa visão clara dos clusters, o próximo passo é a análise NBO (Next Best Offer), que vai identificar as melhores ofertas para cada segmento, maximizando a conversão e o ticket médio.',
  };

  if (count === 2 && done.includes('rfv') && done.includes('nbo')) return {
    title: '✅ RFV e NBO concluídos — falta a análise de CX',
    message: 'Você já sabe quem são seus clientes e o que oferecer a eles. Agora é hora de entender a experiência que eles estão tendo. A análise CX vai revelar os pontos de atrito, as principais causas de insatisfação e o NPS da sua operação — dados cruciais para um programa de Loyalty efetivo.',
  };

  if (count === 3 && !done.includes('diagnostic')) return {
    title: '✅ Análises concluídas — gere seu Plano Estratégico',
    message: 'Você completou todas as análises de dados! Agora é o momento de consolidar tudo em um Plano Estratégico personalizado. Preencha o Formulário LAB com informações sobre seu negócio e nossa IA vai gerar um plano completo com cronograma, 5W2H e recomendações baseadas nos seus dados reais.',
  };

  if (count === 4) return {
    title: '🎉 Parabéns! Diagnóstico 100% concluído!',
    message: 'Você completou todas as etapas da Certificação em Loyalty Management 4.0! Seu Plano Estratégico está pronto com base nos dados reais da sua empresa. Agora é hora de implementar — acesse o Plano Estratégico para revisar o cronograma e o plano de ação 5W2H.',
  };

  // Fallback for partial/unordered completion
  return {
    title: `${count}/4 etapas concluídas`,
    message: 'Continue completando as etapas restantes para ter uma visão completa e gerar seu Plano Estratégico personalizado.',
  };
}

const PlanoFinal = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [diagOpen, setDiagOpen] = useState(true);
  const [rfvData, setRfvData] = useState<ClientData[] | null>(null);
  const [cxData, setCxData] = useState<CXTicket[] | null>(null);
  const [hasPlan, setHasPlan] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) { setLoading(false); return; }
      const uid = session.session.user.id;

      const [diagRes, rfvRes, cxRes, planRes] = await Promise.all([
        supabase.from('diagnostic_responses').select('id').eq('user_id', uid).limit(1).maybeSingle(),
        supabase.from('rfv_uploads').select('id, client_data').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('cx_uploads').select('id, ticket_data').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('generated_plans').select('id').eq('user_id', uid).limit(1).maybeSingle(),
      ]);

      setCompleted({
        rfv: !!rfvRes.data,
        nbo: !!rfvRes.data,
        cx: !!cxRes.data,
        diagnostic: !!diagRes.data,
      });
      if (rfvRes.data?.client_data) setRfvData(rfvRes.data.client_data as unknown as ClientData[]);
      if (cxRes.data?.ticket_data) setCxData(cxRes.data.ticket_data as unknown as CXTicket[]);
      setHasPlan(!!planRes.data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const stepsCompleted = Object.values(completed).filter(Boolean).length;
  const progressPct = (stepsCompleted / 4) * 100;
  const allDone = stepsCompleted === 4;
  const ctx = getContextMessage(completed);

  // Summaries
  const rfvScored = rfvData ? scoreClients(rfvData, defaultPercentileParams(3)) : null;
  const rfvClusters = rfvScored ? (() => {
    const counts: Record<string, number> = {};
    allClusterNames.forEach(n => counts[n] = 0);
    rfvScored.forEach(c => counts[c.cluster] = (counts[c.cluster] || 0) + 1);
    return allClusterNames.map(n => ({ name: n, count: counts[n], pct: rfvScored.length > 0 ? ((counts[n] / rfvScored.length) * 100).toFixed(1) : '0' })).filter(c => c.count > 0);
  })() : null;

  const nboScored = rfvData ? classifyNBO(rfvData) : null;
  const nboCounts = nboScored ? (() => {
    const counts: Record<string, number> = {};
    allFaixaNames.forEach(n => counts[n] = 0);
    nboScored.forEach(c => counts[c.faixa] = (counts[c.faixa] || 0) + 1);
    return allFaixaNames.map(n => ({ name: n, count: counts[n], pct: nboScored.length > 0 ? ((counts[n] / nboScored.length) * 100).toFixed(1) : '0' })).filter(c => c.count > 0);
  })() : null;

  const cxKpis = cxData ? calculateCXKPIs(cxData) : null;

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Carregando dados...</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Loyalty Management</h1>
        <p className="mt-1 text-muted-foreground">Certificação em Loyalty Management 4.0</p>
      </div>

      {/* Collapsible Diagnostic Progress */}
      <Card className="mb-6">
        <button
          onClick={() => setDiagOpen(!diagOpen)}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Progresso do Diagnóstico</h2>
              <p className="text-sm text-muted-foreground">{stepsCompleted} de 4 etapas concluídas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className={allDone ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400' : ''}>{Math.round(progressPct)}%</Badge>
            <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', diagOpen && 'rotate-180')} />
          </div>
        </button>

        {diagOpen && (
          <CardContent className="pt-0 px-5 pb-5">
            <Progress value={progressPct} className={cn("h-2.5 mb-5", allDone && "[&>div]:bg-emerald-500")} />

            {/* 4 steps in a row */}
            <div className="grid grid-cols-4 gap-3">
              {steps.map((step, i) => {
                const done = completed[step.dataKey];
                const Icon = step.icon;
                return (
                  <button
                    key={i}
                    onClick={() => navigate(step.route)}
                    className={cn(
                      'text-left rounded-lg border p-3 transition-all hover:shadow-sm hover:scale-[1.01]',
                      done
                        ? 'border-emerald-300 bg-card dark:border-emerald-800'
                        : 'border-border bg-card hover:border-primary/30'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={cn('h-4 w-4', done ? 'text-emerald-600' : 'text-muted-foreground')} />
                      {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground/30" />}
                    </div>
                    <p className="text-xs font-semibold text-foreground mb-0.5">Passo {i + 1}</p>
                    <p className="text-[11px] font-medium text-foreground leading-tight">{step.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{step.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Contextual Message */}
      <Card className={cn('mb-8', allDone ? 'border-emerald-200 dark:border-emerald-800' : '')}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            {allDone ? <Trophy className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" /> : <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
            <div>
              <h3 className="font-semibold text-foreground mb-1">{ctx.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{ctx.message}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summaries */}
      <div className="space-y-4">
        {/* RFV Summary */}
        {rfvClusters && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Passo 1 — Resumo RFV</h3>
                <Badge variant="outline" className="ml-auto text-xs">{rfvScored!.length} clientes</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {rfvClusters.map(c => (
                  <Badge key={c.name} variant="outline" style={{ borderColor: clusterColors[c.name], color: clusterColors[c.name] }}>
                    {c.name}: {c.count} ({c.pct}%)
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* NBO Summary */}
        {nboCounts && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Passo 2 — Resumo NBO</h3>
                <Badge variant="outline" className="ml-auto text-xs">{nboScored!.length} clientes</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {nboCounts.map(c => (
                  <Badge key={c.name} variant="outline" style={{ borderColor: faixaColors[c.name], color: faixaColors[c.name] }}>
                    {c.name}: {c.count} ({c.pct}%)
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CX Summary */}
        {cxKpis && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Passo 3 — Resumo CX</h3>
                <Badge variant="outline" className="ml-auto text-xs">{cxKpis.total_chamados} chamados</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">NPS</p>
                  <p className="text-lg font-bold text-foreground">{cxKpis.nps_real.toFixed(1)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">TMA Médio</p>
                  <p className="text-lg font-bold text-foreground">{cxKpis.tma_medio.toFixed(1)} min</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Promotores</p>
                  <p className="text-lg font-bold text-foreground">{cxKpis.pct_promotores.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan link */}
        {hasPlan && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Passo 4 — Plano Estratégico</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Seu plano foi gerado com base nos dados reais da sua empresa.</p>
              <button
                onClick={() => navigate('/resultado')}
                className="text-sm font-medium text-primary hover:underline"
              >
                Acessar Plano Estratégico →
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PlanoFinal;
