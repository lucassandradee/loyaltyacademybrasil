import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowRight, CheckCircle2, Loader2, Shield, Target, Lightbulb, ListChecks, BarChart3, Calendar, Award, FileText, ChevronDown, Download } from 'lucide-react';
import { DiagnosticAnswers, DiagnosticResult, generateDiagnostic } from '@/lib/diagnostic-logic';
import { generatePDF } from '@/lib/generate-pdf';
import { supabase } from '@/integrations/supabase/client';

const Resultado = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['sumario', 'maturidade', 'estrutura']));

  const answers = (location.state as { answers: DiagnosticAnswers })?.answers;

  useEffect(() => {
    const load = async () => {
      if (answers) {
        const timer = setTimeout(() => {
          setResult(generateDiagnostic(answers));
          setLoading(false);
        }, 2500);
        return () => clearTimeout(timer);
      }
      // No answers in state — fetch from DB
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      const { data } = await supabase
        .from('diagnostic_responses')
        .select('answers')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data?.answers) {
        setResult(generateDiagnostic(data.answers as unknown as DiagnosticAnswers));
        setLoading(false);
      } else {
        navigate('/diagnostico');
      }
    };
    load();
  }, [answers, navigate]);

  const toggleSection = (id: string) => {
    const next = new Set(openSections);
    next.has(id) ? next.delete(id) : next.add(id);
    setOpenSections(next);
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-muted-foreground">Analisando suas respostas...</p>
        <p className="text-sm text-muted-foreground">Gerando seu plano estratégico de loyalty</p>
      </div>
    );
  }

  if (!result) return null;

  const maturidadeColor = result.maturidade.nivel === 'Avançado' ? 'text-green-600' :
    result.maturidade.nivel === 'Em Desenvolvimento' ? 'text-yellow-600' : 'text-red-500';

  const SectionCard = ({ id, icon: Icon, title, children }: { id: string; icon: any; title: string; children: React.ReactNode }) => (
    <Collapsible open={openSections.has(id)} onOpenChange={() => toggleSection(id)}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6 text-primary" />
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${openSections.has(id) ? 'rotate-180' : ''}`} />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <CheckCircle2 className="mb-2 h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Seu Plano Estratégico de Loyalty</h1>
          <p className="mt-1 text-muted-foreground">Relatório personalizado baseado no seu diagnóstico</p>
        </div>
        <Button onClick={() => generatePDF(result)} size="lg" className="gap-2">
          <Download className="h-5 w-5" /> Baixar PDF
        </Button>
      </div>

      <div className="space-y-4">
        {/* 1. Sumário Executivo */}
        <SectionCard id="sumario" icon={FileText} title="1. Sumário Executivo">
          <p className="text-sm leading-relaxed text-muted-foreground">{result.sumarioExecutivo}</p>
        </SectionCard>

        {/* 2. Maturidade */}
        <SectionCard id="maturidade" icon={Shield} title="2. Diagnóstico de Maturidade">
          <div className="mb-3">
            <span className="text-sm text-muted-foreground">Nível: </span>
            <span className={`font-bold ${maturidadeColor}`}>{result.maturidade.nivel}</span>
            <span className="ml-2 text-xs text-muted-foreground">({result.maturidade.score}/10)</span>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">{result.maturidade.descricao}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Pontos Fortes</h4>
              {result.maturidade.pontosFortes.map((p, i) => (
                <div key={i} className="mb-1 flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                  <span className="text-sm text-muted-foreground">{p}</span>
                </div>
              ))}
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Gaps Identificados</h4>
              {result.maturidade.gaps.map((g, i) => (
                <div key={i} className="mb-1 flex items-start gap-2">
                  <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full bg-destructive/20 text-center text-[10px] leading-[14px] text-destructive">!</span>
                  <span className="text-sm text-muted-foreground">{g}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* 3. Estrutura */}
        <SectionCard id="estrutura" icon={Lightbulb} title="3. Modelo de Programa Recomendado">
          <p className="mb-2 font-semibold text-foreground">{result.estrutura.tipo}</p>
          <p className="mb-3 text-sm text-muted-foreground">{result.estrutura.descricao}</p>
          <h4 className="mb-1 text-sm font-semibold text-foreground">Mecânica de Funcionamento</h4>
          <p className="mb-3 text-sm text-muted-foreground">{result.estrutura.mecanica}</p>
          <h4 className="mb-1 text-sm font-semibold text-foreground">Exemplos de Mercado</h4>
          {result.estrutura.exemplos.map((ex, i) => (
            <p key={i} className="mb-1 text-sm text-muted-foreground">• {ex}</p>
          ))}
        </SectionCard>

        {/* 4. Tiers */}
        {result.tiers.length > 0 && (
          <SectionCard id="tiers" icon={Award} title="4. Estrutura de Tiers">
            <div className="space-y-4">
              {result.tiers.map((tier, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-bold text-primary">{tier.nome}</span>
                    <span className="text-xs text-muted-foreground">{tier.criterio}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tier.beneficios.map((b, j) => (
                      <span key={j} className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">{b}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* 5. Foco Estratégico */}
        <SectionCard id="foco" icon={Target} title={`5. Foco Estratégico: ${result.foco.titulo}`}>
          <p className="mb-4 text-sm text-muted-foreground">{result.foco.descricao}</p>
          <div className="space-y-2">
            {result.foco.acoes.map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-md bg-muted p-3">
                <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-[10px] font-bold text-primary-foreground ${
                  item.prioridade === 'Alta' ? 'bg-destructive' : item.prioridade === 'Média' ? 'bg-yellow-500' : 'bg-muted-foreground'
                }`}>{item.prioridade}</span>
                <span className="text-sm">{item.acao}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 6. KPIs */}
        <SectionCard id="kpis" icon={BarChart3} title="6. KPIs e Métricas de Sucesso">
          <div className="space-y-3">
            {result.kpis.map((kpi, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-sm">{kpi.metrica}</span>
                  <span className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{kpi.meta}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.descricao}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 7. Cronograma */}
        <SectionCard id="cronograma" icon={Calendar} title="7. Cronograma de Implementação">
          <div className="space-y-4">
            {result.cronograma.map((fase, i) => (
              <div key={i}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-primary">{fase.fase}</span>
                  <span className="text-xs text-muted-foreground">{fase.periodo}</span>
                </div>
                {fase.marcos.map((m, j) => (
                  <div key={j} className="mb-1 flex items-start gap-2 pl-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">{m}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 8. Checklist */}
        <SectionCard id="checklist" icon={ListChecks} title="8. Checklist de Próximos Passos">
          <div className="space-y-3">
            {result.checklist.map((item, i) => (
              <label key={i} className="flex cursor-pointer items-center gap-3">
                <Checkbox
                  checked={checkedItems.has(i)}
                  onCheckedChange={() => {
                    const next = new Set(checkedItems);
                    next.has(i) ? next.delete(i) : next.add(i);
                    setCheckedItems(next);
                  }}
                />
                <span className={`text-sm ${checkedItems.has(i) ? 'text-muted-foreground line-through' : ''}`}>{item}</span>
              </label>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-8 text-center">
        <Button size="lg" onClick={() => navigate('/rfv')} className="h-12 px-8">
          Ir para Análise de Dados RFV (Módulo 2)
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default Resultado;
