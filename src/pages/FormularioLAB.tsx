import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LAB_DRAFT_KEY, LAB_DRAFT_USER_KEY, LAB_STEP_KEY, clearLabDraftStorage } from '@/lib/lab-storage';

interface LABStep {
  id: string;
  question: string;
  type: 'single' | 'multi';
  options: string[];
}

type LABAnswers = Record<string, string | string[]>;

const labSteps: LABStep[] = [
  { id: 'objetivos', question: 'Quais são os principais objetivos do programa de Loyalty?', type: 'multi', options: ['Expansão', 'Ganho de Share', 'Segmentar e premiar por valor', 'Adquirir clientes', 'Reter clientes', 'Combater concorrência', 'Reduzir custos', 'Diversificação', 'Serviços financeiros', 'Aumentar NPS'] },
  { id: 'estruturaPrograma', question: 'Qual estrutura de programa de Loyalty você prefere?', type: 'single', options: ['Programa Próprio', 'Coalizão', 'Parceiro', 'Híbrido'] },
  { id: 'tipoPrograma', question: 'Que tipos de mecânica você quer utilizar?', type: 'multi', options: ['Ganhar & Trocar', 'Tierização Interna', 'Tierização Pública', 'Brindes', 'Gamificação', 'Comunidades', 'Comportamento e Estilo', 'Recomendação', 'Assinatura'] },
  { id: 'plataforma', question: 'Qual modelo de plataforma (LMS)?', type: 'single', options: ['Própria', 'Terceirizada'] },
  { id: 'estrategia', question: 'Quais estratégias você pretende adotar?', type: 'multi', options: ['Apoio C-Level', 'Lançamento Piloto', 'Roll-out', 'Lançamento Big-Bang', 'Anuidade para todos', 'Tiers', 'Marketplace', 'Clube de Descontos', 'Gamificação', 'Pilares ESG', 'OPM', 'Estratégia de saída', 'Calendário de comunicação', 'Capacitação força de vendas'] },
  { id: 'timeEstrategico', question: 'Como será o time estratégico do programa?', type: 'single', options: ['Próprio', 'Terceirizado', 'Híbrido'] },
  { id: 'beneficiosTangiveis', question: 'Quais benefícios tangíveis serão oferecidos?', type: 'multi', options: ['Descontos', 'Pontos que expiram', 'Pontos que não expiram', 'Cashback/Gift back', 'Pontos/troca'] },
  { id: 'beneficiosIntangiveis', question: 'Quais benefícios intangíveis serão oferecidos?', type: 'multi', options: ['Privilégios', 'Serviços exclusivos', 'Experiências VIP', 'Acesso antecipado'] },
  { id: 'tierizacao', question: 'Como será a tierização/segmentação do programa?', type: 'single', options: ['Pública', 'Interna', 'Não aplicar'] },
  { id: 'segmentacao', question: 'Que tipo de segmentação será utilizada?', type: 'multi', options: ['Existente (Valor/RFV)', 'Básico + Jornada', 'Completo', 'Tipo de benefício', 'Geolocalização'] },
  { id: 'cadastro', question: 'Por quais canais será feito o cadastro no programa?', type: 'multi', options: ['Loja física/digital', 'App', 'Site'] },
  { id: 'infosCadastro', question: 'Qual nível de informações no cadastro?', type: 'single', options: ['Básico + Jornada', 'Completo'] },
  { id: 'canaisComunicacao', question: 'Quais canais de comunicação serão utilizados?', type: 'multi', options: ['App/Push', 'E-mail', 'WhatsApp/SMS', 'PDV', 'Recibo no caixa', 'Mala impressa', 'Mídia massa', 'Mídias sociais'] },
  { id: 'operacoes', question: 'Quais operações são relevantes para o programa?', type: 'multi', options: ['Unificação Database', 'CRM', 'Uso de dados/Hiperpersonalização', 'Call center próprio vs terceirizado', 'Atendimento humano vs bot vs híbrido', 'IA'] },
  { id: 'custos', question: 'Como você pensa sobre os custos do programa?', type: 'multi', options: ['Impacta ROI do programa', 'Não impacta ROI', 'Custos adicionais previstos', 'Absorvido pelas lojas', 'Absorvido pela matriz', 'Modelo híbrido de custo'] },
];

const labStepsById = new Map(labSteps.map((labStep) => [labStep.id, labStep]));

const sanitizeLabAnswers = (value: unknown): LABAnswers => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<LABAnswers>((acc, [id, rawValue]) => {
    const definition = labStepsById.get(id);
    if (!definition) return acc;

    if (definition.type === 'multi') {
      if (!Array.isArray(rawValue)) return acc;

      const selectedOptions = Array.from(
        new Set(rawValue.filter((item): item is string => typeof item === 'string' && definition.options.includes(item)))
      );

      if (selectedOptions.length > 0) {
        acc[id] = selectedOptions;
      }

      return acc;
    }

    if (typeof rawValue === 'string' && definition.options.includes(rawValue)) {
      acc[id] = rawValue;
    }

    return acc;
  }, {});
};

const getFirstIncompleteStep = (answers: LABAnswers) => {
  const firstIncompleteStep = labSteps.findIndex((labStep) => {
    const answer = answers[labStep.id];

    return labStep.type === 'multi'
      ? !Array.isArray(answer) || answer.length === 0
      : typeof answer !== 'string' || answer.length === 0;
  });

  return firstIncompleteStep === -1 ? labSteps.length - 1 : firstIncompleteStep;
};

const FormularioLAB = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<LABAnswers>({});
  const [saving, setSaving] = useState(false);
  const [loadingFromDB, setLoadingFromDB] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [didHydrateUserData, setDidHydrateUserData] = useState(false);

  // Load saved LAB answers from DB on mount — never trust localStorage blindly
  useEffect(() => {
    let isActive = true;

    const loadFromDB = async () => {
      setLoadingFromDB(true);
      setDidHydrateUserData(false);
      setAnswers({});
      setStep(0);

      const { data: { user } } = await supabase.auth.getUser();
      if (!isActive) return;

      if (!user) {
        setCurrentUserId(null);
        clearLabDraftStorage();
        setDidHydrateUserData(true);
        setLoadingFromDB(false);
        return;
      }

      setCurrentUserId(user.id);

      const storedDraftUserId = localStorage.getItem(LAB_DRAFT_USER_KEY);
      if (storedDraftUserId && storedDraftUserId !== user.id) {
        clearLabDraftStorage();
      }

      const { data } = await supabase
        .from('diagnostic_responses')
        .select('answers')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isActive) return;

      const responseAnswers = data?.answers && typeof data.answers === 'object' && !Array.isArray(data.answers)
        ? (data.answers as Record<string, unknown>)
        : null;
      const safeLabAnswers = sanitizeLabAnswers(responseAnswers?.lab);

      if (Object.keys(safeLabAnswers).length > 0) {
        setAnswers(safeLabAnswers);
        setStep(getFirstIncompleteStep(safeLabAnswers));
      } else {
        clearLabDraftStorage();
      }

      setDidHydrateUserData(true);
      setLoadingFromDB(false);
    };

    void loadFromDB();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void loadFromDB();
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!didHydrateUserData || !currentUserId) return;

    if (Object.keys(answers).length === 0 && step === 0) {
      localStorage.removeItem(LAB_DRAFT_KEY);
      localStorage.removeItem(LAB_STEP_KEY);
      localStorage.setItem(LAB_DRAFT_USER_KEY, currentUserId);
      return;
    }

    localStorage.setItem(LAB_DRAFT_KEY, JSON.stringify(answers));
    localStorage.setItem(LAB_STEP_KEY, String(step));
    localStorage.setItem(LAB_DRAFT_USER_KEY, currentUserId);
  }, [answers, currentUserId, didHydrateUserData, step]);

  const current = labSteps[step];
  const progress = ((step + 1) / labSteps.length) * 100;

  const currentAnswer = current.type === 'multi'
    ? (answers[current.id] as string[] || [])
    : (answers[current.id] as string || '');

  const canAdvance = current.type === 'multi'
    ? (currentAnswer as string[]).length > 0
    : currentAnswer !== '';

  const handleSelect = (option: string) => {
    if (current.type === 'multi') {
      const arr = (answers[current.id] as string[]) || [];
      const updated = arr.includes(option) ? arr.filter(o => o !== option) : [...arr, option];
      setAnswers({ ...answers, [current.id]: updated });
    } else {
      setAnswers({ ...answers, [current.id]: option });
    }
  };

  const handleNext = async () => {
    if (step < labSteps.length - 1) {
      setStep(step + 1);
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Check if record exists
    const { data: existing } = await supabase
      .from('diagnostic_responses')
      .select('id, answers')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let error;
    if (existing) {
      const existingAnswers = (existing.answers as Record<string, any>) || {};
      const merged = { ...existingAnswers, lab: answers };
      const res = await supabase
        .from('diagnostic_responses')
        .update({ answers: JSON.parse(JSON.stringify(merged)) })
        .eq('id', existing.id);
      error = res.error;
    } else {
      const res = await supabase
        .from('diagnostic_responses')
        .insert({ user_id: user.id, answers: JSON.parse(JSON.stringify({ lab: answers })) });
      error = res.error;
    }

    setSaving(false);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }

    clearLabDraftStorage();
    toast({ title: 'Framework LAB salvo!', description: 'Gerando seu Plano Estratégico...' });
    navigate('/resultado', { replace: true });
    window.setTimeout(() => {
      if (window.location.pathname !== '/resultado') {
        window.location.assign('/resultado');
      }
    }, 80);
  };

  if (loadingFromDB) {
    return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-4">
          <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Framework LAB — Plano Estratégico</p>
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Pergunta {step + 1} de {labSteps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <h2 className="mb-8 text-2xl font-bold text-foreground">{current.question}</h2>

        <div className="mb-8 space-y-3">
          {current.options.map((option) => {
            const isSelected = current.type === 'multi'
              ? (currentAnswer as string[]).includes(option)
              : currentAnswer === option;

            return current.type === 'multi' ? (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                  isSelected ? 'border-primary bg-accent' : 'hover:bg-muted'
                }`}
              >
                <Checkbox checked={isSelected} onCheckedChange={() => handleSelect(option)} />
                <span className="text-sm font-medium">{option}</span>
              </label>
            ) : (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className={`w-full rounded-lg border p-4 text-left text-sm font-medium transition-colors ${
                  isSelected ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-muted'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handleNext} disabled={!canAdvance || saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : step < labSteps.length - 1 ? 'Próxima' : 'Gerar Plano Estratégico'}
            {!saving && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default FormularioLAB;
