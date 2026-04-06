import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DiagnosticAnswers } from '@/lib/diagnostic-logic';

const DRAFT_KEY = 'diagnostic_draft';
const DRAFT_STEP_KEY = 'diagnostic_step';
const LAB_DRAFT_KEY = 'lab_draft';
const LAB_STEP_KEY = 'lab_step';

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [form, setForm] = useState({ email: '', senha: '' });

  // Get answers from route state OR localStorage draft
  const stateAnswers = (location.state as { answers?: DiagnosticAnswers })?.answers;
  const getAnswers = (): DiagnosticAnswers | null => {
    if (stateAnswers) return stateAnswers;
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try { return JSON.parse(draft) as DiagnosticAnswers; } catch { return null; }
    }
    return null;
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.senha,
      });

      if (error) throw error;

      // Clear LAB draft from any previous session
      localStorage.removeItem(LAB_DRAFT_KEY);
      localStorage.removeItem(LAB_STEP_KEY);
      const answers = getAnswers();
      if (answers) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: saveError } = await supabase
            .from('diagnostic_responses')
            .upsert(
              { user_id: user.id, answers: JSON.parse(JSON.stringify(answers)) },
              { onConflict: 'user_id' }
            );
          
          if (saveError) {
            console.error('Error saving answers:', saveError);
          } else {
            localStorage.removeItem(DRAFT_KEY);
            localStorage.removeItem(DRAFT_STEP_KEY);
          }
        }
        navigate('/plano-final');
      } else {
        navigate('/plano-final');
      }
    } catch (err: any) {
      toast({ title: 'Erro ao entrar', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <LogIn className="mx-auto mb-2 h-10 w-10 text-primary" />
          <CardTitle className="text-2xl">Entrar</CardTitle>
          <CardDescription>Acesse sua conta para ver seus diagnósticos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" required value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</> : 'Entrar'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Não tem conta?{' '}
            <Link to="/cadastro" state={getAnswers() ? { answers: getAnswers() } : undefined} className="font-medium text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
