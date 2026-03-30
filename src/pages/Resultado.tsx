import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, CheckCircle2, Loader2, Shield, Target, Lightbulb, ListChecks } from 'lucide-react';
import { DiagnosticAnswers, DiagnosticResult, generateDiagnostic } from '@/lib/diagnostic-logic';

const Resultado = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const answers = (location.state as { answers: DiagnosticAnswers })?.answers;

  useEffect(() => {
    if (!answers) {
      navigate('/');
      return;
    }
    const timer = setTimeout(() => {
      setResult(generateDiagnostic(answers));
      setLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [answers, navigate]);

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Seu Plano Estratégico de Loyalty</h1>
        <p className="mt-2 text-muted-foreground">Baseado nas suas respostas, preparamos um diagnóstico completo</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle className="text-lg">Diagnóstico de Maturidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <span className="text-sm text-muted-foreground">Nível: </span>
              <span className={`font-bold ${maturidadeColor}`}>{result.maturidade.nivel}</span>
              <span className="ml-2 text-xs text-muted-foreground">({result.maturidade.score}/10)</span>
            </div>
            <p className="text-sm text-muted-foreground">{result.maturidade.descricao}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Lightbulb className="h-6 w-6 text-primary" />
            <CardTitle className="text-lg">Estrutura Recomendada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 font-semibold text-foreground">{result.estrutura.tipo}</p>
            <p className="text-sm text-muted-foreground">{result.estrutura.descricao}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <CardTitle className="text-lg">Foco Estratégico: {result.foco.titulo}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">{result.foco.descricao}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {result.foco.acoes.map((acao, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md bg-muted p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm">{acao}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center gap-3">
            <ListChecks className="h-6 w-6 text-primary" />
            <CardTitle className="text-lg">Checklist de Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent>
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
                  <span className={`text-sm ${checkedItems.has(i) ? 'text-muted-foreground line-through' : ''}`}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
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
