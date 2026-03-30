import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { DiagnosticAnswers } from '@/lib/diagnostic-logic';
import { supabase } from '@/integrations/supabase/client';

interface Question {
  id: keyof DiagnosticAnswers;
  question: string;
  type: 'single' | 'multi';
  options: string[];
}

const questions: Question[] = [
  {
    id: 'modelo',
    question: 'Qual é o modelo principal do seu negócio?',
    type: 'single',
    options: ['B2C', 'B2B', 'Assinatura/Recorrência', 'Híbrido'],
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
  {
    id: 'tiers',
    question: 'Você tem interesse em criar um programa com diferentes "níveis" (Tiers/Status)?',
    type: 'single',
    options: ['Sim - segmentar clientes', 'Não - modelo único', 'Não sei - preciso de recomendação'],
  },
];

const Diagnostico = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>({});

  const current = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

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

  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      // Navigate to result with answers
      navigate('/cadastro', { state: { answers: answers as DiagnosticAnswers } });
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Pergunta {step + 1} de {questions.length}</span>
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
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleSelect(option)}
                />
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
            onClick={() => step > 0 ? setStep(step - 1) : navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handleNext} disabled={!canAdvance}>
            {step < questions.length - 1 ? 'Próxima' : 'Ver Resultado'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Diagnostico;
