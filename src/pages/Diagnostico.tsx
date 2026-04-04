import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { DiagnosticAnswers, ProductEntry } from '@/lib/diagnostic-logic';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const DRAFT_KEY = 'diagnostic_draft';
const DRAFT_STEP_KEY = 'diagnostic_step';

type StepType = 'single' | 'multi' | 'products' | 'input' | 'custom-single';

interface Step {
  id: string;
  question: string;
  type: StepType;
  options?: string[];
  inputType?: string;
  placeholder?: string;
}

const steps: Step[] = [
  {
    id: 'modelo',
    question: 'Qual é o modelo principal do seu negócio?',
    type: 'single',
    options: ['B2C', 'B2B', 'Assinatura/Recorrência', 'Híbrido'],
  },
  {
    id: 'segmento',
    question: 'Qual é o segmento/indústria da sua empresa?',
    type: 'single',
    options: ['Varejo', 'Serviços', 'Tecnologia', 'Saúde', 'Alimentação', 'Educação', 'Outro'],
  },
  {
    id: 'anoFundacao',
    question: 'Em que ano a empresa foi fundada?',
    type: 'input',
    inputType: 'number',
    placeholder: 'Ex: 2010',
  },
  {
    id: 'tamanhoBase',
    question: 'Qual é o tamanho médio da sua base de clientes?',
    type: 'single',
    options: ['Até 1.000', '1.001–10.000', '10.001–50.000', '50.001–200.000', 'Acima de 200.000'],
  },
  {
    id: 'faturamento',
    question: 'Qual é o faturamento anual estimado da empresa?',
    type: 'single',
    options: ['Até R$1M', 'R$1M–10M', 'R$10M–50M', 'R$50M–200M', 'Acima de R$200M'],
  },
  {
    id: 'produtos',
    question: 'Quais são os principais produtos/serviços da sua empresa?',
    type: 'products',
  },
  {
    id: 'frequencia',
    question: 'Qual é a frequência de compra ideal para o seu produto/serviço?',
    type: 'single',
    options: ['Alta/Diária', 'Média/Mensal', 'Baixa/Anual', 'Compra Única'],
  },
  {
    id: 'dados',
    question: 'Como você gerencia os dados dos seus clientes atualmente?',
    type: 'single',
    options: ['Sem dados estruturados', 'Planilhas', 'PDV básico', 'CRM estruturado', 'Plataforma de dados avançada'],
  },
  {
    id: 'infos',
    question: 'Quais informações você consegue extrair facilmente hoje?',
    type: 'multi',
    options: ['Data da última compra', 'Quantidade de compras', 'Valor total gasto', 'CAC', 'LTV'],
  },
  {
    id: 'desafio',
    question: 'Qual é o principal desafio que você quer resolver?',
    type: 'single',
    options: ['Reter clientes/Reduzir churn', 'Aumentar frequência', 'Aumentar ticket médio', 'Reativar inativos'],
  },
];

const Diagnostico = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(DRAFT_STEP_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    return saved ? JSON.parse(saved) : {};
  });
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchParams] = useSearchParams();
  const isRefazer = searchParams.get('refazer') === 'true';

  useEffect(() => {
    if (isRefazer) {
      setChecking(false);
      return;
    }
    const checkExisting = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('diagnostic_responses')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        if (data && data.length > 0) {
          localStorage.removeItem(DRAFT_KEY);
          localStorage.removeItem(DRAFT_STEP_KEY);
          navigate('/resultado', { replace: true });
          return;
        }
      }
      setChecking(false);
    };
    checkExisting();
  }, [navigate, isRefazer]);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
    localStorage.setItem(DRAFT_STEP_KEY, String(step));
  }, [answers, step]);

  if (checking) return null;

  const current = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  const getAnswer = () => {
    if (current.id === 'produtos') return answers.produtos || [];
    if (current.type === 'multi') return (answers as any)[current.id] as string[] || [];
    if (current.type === 'input') return (answers as any)[current.id] as string || '';
    return (answers as any)[current.id] as string || '';
  };

  const currentAnswer = getAnswer();

  const canAdvance = (() => {
    if (current.type === 'products') {
      const prods = answers.produtos || [];
      return prods.length > 0 && prods.every(p => p.nome.trim() !== '');
    }
    if (current.type === 'multi') return (currentAnswer as string[]).length > 0;
    if (current.type === 'input') return (currentAnswer as string).trim() !== '';
    return currentAnswer !== '';
  })();

  const handleSelect = (option: string) => {
    if (current.type === 'multi') {
      const arr = ((answers as any)[current.id] as string[]) || [];
      const updated = arr.includes(option) ? arr.filter((o: string) => o !== option) : [...arr, option];
      setAnswers({ ...answers, [current.id]: updated });
    } else {
      setAnswers({ ...answers, [current.id]: option });
    }
  };

  const handleProductAdd = () => {
    const prods = [...(answers.produtos || []), { nome: '', descricao: '', percentual: 0 }];
    setAnswers({ ...answers, produtos: prods });
  };

  const handleProductUpdate = (index: number, field: keyof ProductEntry, value: string | number) => {
    const prods = [...(answers.produtos || [])];
    prods[index] = { ...prods[index], [field]: value };
    setAnswers({ ...answers, produtos: prods });
  };

  const handleProductRemove = (index: number) => {
    const prods = (answers.produtos || []).filter((_, i) => i !== index);
    setAnswers({ ...answers, produtos: prods });
  };

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }

    const finalAnswers = answers as DiagnosticAnswers;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setSaving(true);
      const { error } = await supabase
        .from('diagnostic_responses')
        .upsert({ user_id: user.id, answers: JSON.parse(JSON.stringify(finalAnswers)) }, { onConflict: 'user_id' });
      setSaving(false);

      if (error) {
        toast({ title: 'Erro ao salvar diagnóstico', description: error.message, variant: 'destructive' });
        return;
      }

      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_STEP_KEY);
      navigate('/resultado', { state: { answers: finalAnswers } });
    } else {
      navigate('/cadastro', { state: { answers: finalAnswers } });
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Pergunta {step + 1} de {steps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <h2 className="mb-8 text-2xl font-bold text-foreground">{current.question}</h2>

        <div className="mb-8 space-y-3">
          {/* Single select */}
          {current.type === 'single' && current.options?.map((option) => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={`w-full rounded-lg border p-4 text-left text-sm font-medium transition-colors ${
                currentAnswer === option ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-muted'
              }`}
            >
              {option}
            </button>
          ))}

          {/* Multi select */}
          {current.type === 'multi' && current.options?.map((option) => {
            const isSelected = (currentAnswer as string[]).includes(option);
            return (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                  isSelected ? 'border-primary bg-accent' : 'hover:bg-muted'
                }`}
              >
                <Checkbox checked={isSelected} onCheckedChange={() => handleSelect(option)} />
                <span className="text-sm font-medium">{option}</span>
              </label>
            );
          })}

          {/* Input */}
          {current.type === 'input' && (
            <Input
              type={current.inputType || 'text'}
              placeholder={current.placeholder}
              value={currentAnswer as string}
              onChange={(e) => setAnswers({ ...answers, [current.id]: e.target.value })}
              className="text-base"
            />
          )}

          {/* Products */}
          {current.type === 'products' && (
            <div className="space-y-4">
              {(answers.produtos || []).map((prod, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Produto {i + 1}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleProductRemove(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Nome do produto/serviço"
                    value={prod.nome}
                    onChange={(e) => handleProductUpdate(i, 'nome', e.target.value)}
                  />
                  <Textarea
                    placeholder="Breve descrição"
                    value={prod.descricao}
                    onChange={(e) => handleProductUpdate(i, 'descricao', e.target.value)}
                    className="min-h-[60px]"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="% vendas"
                      value={prod.percentual || ''}
                      onChange={(e) => handleProductUpdate(i, 'percentual', Number(e.target.value))}
                      className="w-28"
                    />
                    <span className="text-sm text-muted-foreground">% da receita</span>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={handleProductAdd} className="w-full gap-2">
                <Plus className="h-4 w-4" /> Adicionar Produto/Serviço
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => step > 0 ? setStep(step - 1) : navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handleNext} disabled={!canAdvance || saving}>
            {saving ? 'Salvando...' : step < steps.length - 1 ? 'Próxima' : 'Ver Resultado'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Diagnostico;
