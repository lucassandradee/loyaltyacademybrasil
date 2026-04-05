import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Upload, SlidersHorizontal, BarChart3, ClipboardList, FileText, Users, DollarSign, Star, Target, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

const steps = [
  { label: 'Análise RFV', description: 'Upload e segmentação da base de clientes', icon: Users, route: '/rfv', dataKey: 'rfv' },
  { label: 'Next Best Offer', description: 'Classificação por faixa de gasto', icon: DollarSign, route: '/nbo/dashboard', dataKey: 'nbo' },
  { label: 'Customer Experience', description: 'Upload e análise de chamados', icon: Star, route: '/cx', dataKey: 'cx' },
  { label: 'Plano Estratégico', description: 'Formulário LAB e geração do plano', icon: Target, route: '/lab-framework', dataKey: 'diagnostic' },
];

const PlanoFinal = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchAll = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) { setLoading(false); return; }
      const uid = session.session.user.id;

      const [diagRes, rfvRes, cxRes] = await Promise.all([
        supabase.from('diagnostic_responses').select('id').eq('user_id', uid).limit(1).maybeSingle(),
        supabase.from('rfv_uploads').select('id').eq('user_id', uid).limit(1).maybeSingle(),
        supabase.from('cx_uploads').select('id').eq('user_id', uid).limit(1).maybeSingle(),
      ]);

      setCompleted({
        rfv: !!rfvRes.data,
        nbo: !!rfvRes.data,
        cx: !!cxRes.data,
        diagnostic: !!diagRes.data,
      });
      setLoading(false);
    };
    fetchAll();
  }, []);

  const stepsCompleted = Object.values(completed).filter(Boolean).length;
  const progressPct = (stepsCompleted / 4) * 100;
  const allDone = stepsCompleted === 4;

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Carregando dados...</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Loyalty Management</h1>
        <p className="mt-1 text-muted-foreground">Visão consolidada da certificação em Loyalty Management 4.0</p>
      </div>

      {/* Progress Thermometer */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {allDone ? <Trophy className="h-5 w-5 text-amber-500" /> : <Target className="h-5 w-5 text-primary" />}
              <h2 className="text-lg font-bold text-foreground">Progresso do Diagnóstico</h2>
            </div>
            <Badge variant={allDone ? 'default' : 'secondary'} className="text-sm">
              {stepsCompleted}/4 etapas
            </Badge>
          </div>

          <Progress value={progressPct} className="h-3 mb-4" />

          {allDone ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-4">
              <div className="flex items-start gap-3">
                <Trophy className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">
                    🎉 Parabéns! Você concluiu 100% do diagnóstico da Certificação em Loyalty Management 4.0!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Agora é hora de implementar as estratégias definidas no seu Plano Estratégico. Acesse cada módulo para revisar os insights e colocar as ações em prática.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Complete todas as etapas para finalizar o diagnóstico da certificação.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Steps Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {steps.map((step, i) => {
          const done = completed[step.dataKey];
          const Icon = step.icon;
          return (
            <button
              key={i}
              onClick={() => navigate(step.route)}
              className={`text-left rounded-xl border-2 p-5 transition-all hover:shadow-md hover:scale-[1.01] ${
                done
                  ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-700'
                  : 'border-border bg-card hover:border-primary/30'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                    done ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-muted'
                  }`}>
                    <Icon className={`h-5 w-5 ${done ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Passo {i + 1}</h3>
                    <p className="text-sm font-medium text-foreground">{step.label}</p>
                  </div>
                </div>
                {done ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground/40" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PlanoFinal;
