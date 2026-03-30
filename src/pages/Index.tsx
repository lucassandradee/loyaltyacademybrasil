import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Target, BarChart3, Users } from 'lucide-react';
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
          Plataforma Educacional ESPM
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Diagnóstico de Loyalty:
          <br />
          <span className="text-primary">Descubra o potencial da sua base de clientes</span>
        </h1>

        <p className="mb-10 text-lg text-muted-foreground">
          Responda algumas perguntas sobre o seu negócio e receba um plano estratégico
          personalizado de fidelização, com recomendações práticas e acionáveis.
        </p>

        <Button
          size="lg"
          className="h-14 px-8 text-base font-semibold"
          onClick={() => navigate('/diagnostico')}
        >
          Iniciar Diagnóstico
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            { icon: Target, title: 'Diagnóstico Estratégico', desc: 'Avalie a maturidade do seu negócio para loyalty' },
            { icon: BarChart3, title: 'Análise RFV', desc: 'Segmente sua base com metodologia Recência, Frequência e Valor' },
            { icon: Users, title: '8 Clusters', desc: 'Identifique e aja sobre cada perfil de cliente' },
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
