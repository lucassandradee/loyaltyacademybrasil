import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DiagnosticAnswers } from '@/lib/diagnostic-logic';

const DRAFT_KEY = 'diagnostic_draft';
const DRAFT_STEP_KEY = 'diagnostic_step';

const Cadastro = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [form, setForm] = useState({ nome: '', email: '', empresa: '', cargo: '', senha: '' });

  // Get answers from route state OR localStorage draft
  const stateAnswers = (location.state as { answers: DiagnosticAnswers })?.answers;
  const getAnswers = (): DiagnosticAnswers | null => {
    if (stateAnswers) return stateAnswers;
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try { return JSON.parse(draft) as DiagnosticAnswers; } catch { return null; }
    }
    return null;
  };

  const answers = getAnswers();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/plano-final', { replace: true });
      } else {
        setCheckingSession(false);
      }
    });
  }, [navigate]);

  if (checkingSession) return null;

  if (!answers) {
    navigate('/diagnostico');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,
        options: {
          emailRedirectTo: window.location.origin,
          data: { nome: form.nome, empresa: form.empresa, cargo: form.cargo },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: saveError } = await supabase
          .from('diagnostic_responses')
          .upsert(
            { user_id: authData.user.id, answers: JSON.parse(JSON.stringify(answers)) },
            { onConflict: 'user_id' }
          );

        if (saveError) {
          console.error('Error saving answers:', saveError);
          toast({ title: 'Erro ao salvar diagnóstico', description: saveError.message, variant: 'destructive' });
          setLoading(false);
          return;
        }

        // Successfully saved — clear draft
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(DRAFT_STEP_KEY);
      }

      toast({ title: 'Conta criada com sucesso!', description: 'Gerando seu plano estratégico...' });
      navigate('/plano-final');
    } catch (err: any) {
      toast({ title: 'Erro ao criar conta', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <UserPlus className="mx-auto mb-2 h-10 w-10 text-primary" />
          <CardTitle className="text-2xl">Crie sua conta</CardTitle>
          <CardDescription>Salve seu diagnóstico e acesse seu plano estratégico</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa</Label>
              <Input id="empresa" required value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input id="cargo" required value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" required minLength={6} value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando conta...</> : 'Criar conta e ver plano'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" state={{ answers }} className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cadastro;
