import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Target, BarChart3, Users, Headphones, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setLoggedIn(true);
    });
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
          <Target className="h-4 w-4 text-primary" />
          Loyalty Academy Brasil
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Certificação em Loyalty Management 4.0
          <br />
          <span className="text-primary">Construa sua estratégia de fidelização</span>
        </h1>

        <p className="mb-10 text-lg text-muted-foreground">
          Responda o diagnóstico inicial, analise sua base de clientes com RFV, NBO e CX,
          e receba um plano estratégico completo baseado no Framework LAB.
        </p>

        <Button
          size="lg"
          className="h-14 px-8 text-base font-semibold"
          onClick={() => navigate(loggedIn ? '/plano-final' : '/diagnostico')}
        >
          {loggedIn ? 'Ir para Análise RFV' : 'Iniciar Diagnóstico'}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        <div className="mt-16 grid gap-6 sm:grid-cols-4">
          {[
            { icon: BarChart3, title: 'Passo 1 — RFV', desc: 'Segmente sua base com Recência, Frequência e Valor' },
            { icon: Users, title: 'Passo 2 — NBO', desc: 'Proponha ofertas personalizadas por faixa de gasto' },
            { icon: Headphones, title: 'Passo 3 — CX', desc: 'Analise chamados, NPS e causas raiz' },
            { icon: FileText, title: 'Passo 4 — Plano', desc: 'Plano estratégico completo com Framework LAB' },
          ].map((item, i) => (
            <div key={i} className="rounded-lg border bg-card p-6 text-left">
              <item.icon className="mb-3 h-8 w-8 text-primary" />
              <h3 className="mb-1 font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
