import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ChevronDown, Download, RefreshCw, FileText, Shield, Target, Lightbulb, Award, BarChart3, Calendar, ListChecks, DollarSign, Megaphone, Settings, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateRFVSummary, scoreClients, defaultPercentileParams } from '@/lib/rfv-logic';
import { generateNBOSummary, classifyNBO } from '@/lib/nbo-logic';
import { generateCXSummary } from '@/lib/cx-logic';
import type { ClientData } from '@/lib/rfv-logic';
import type { CXTicket } from '@/lib/cx-logic';

interface PlanSection {
  id: string;
  title: string;
  content: string;
}

const sectionIcons: Record<string, any> = {
  sumario: FileText,
  maturidade: Shield,
  objetivos: Target,
  estrutura: Lightbulb,
  estrategia: Award,
  beneficios: Award,
  segmentacao: Users,
  canais: Megaphone,
  operacoes: Settings,
  custos: DollarSign,
  cronograma: Calendar,
  plano5w2h: ListChecks,
};

const Resultado = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sections, setSections] = useState<PlanSection[]>([]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['sumario', 'maturidade']));
  const [hasLab, setHasLab] = useState(false);

  const toggleSection = (id: string) => {
    const next = new Set(openSections);
    next.has(id) ? next.delete(id) : next.add(id);
    setOpenSections(next);
  };

  const loadAndGenerate = async (forceRegenerate = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }

    // Check for existing plan first
    if (!forceRegenerate) {
      const { data: existingPlan } = await supabase
        .from('generated_plans')
        .select('plan_content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPlan?.plan_content) {
        const planData = existingPlan.plan_content as any;
        if (planData.sections && Array.isArray(planData.sections)) {
          setSections(planData.sections);
          setHasLab(true);
          setLoading(false);
          return;
        }
      }
    }

    // Fetch all required data in parallel
    const [profileRes, diagRes, rfvRes, cxRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('diagnostic_responses').select('answers').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('rfv_uploads').select('client_data').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('cx_uploads').select('ticket_data').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const profile = profileRes.data;
    const diagAnswers = diagRes.data?.answers as Record<string, any> | null;
    const labAnswers = diagAnswers?.lab || null;

    if (!labAnswers) {
      setHasLab(false);
      setLoading(false);
      return;
    }

    setHasLab(true);

    // Generate summaries
    let rfvSummary = '';
    let nboSummary = '';
    let cxSummary = '';

    if (rfvRes.data?.client_data) {
      const clientData = rfvRes.data.client_data as unknown as ClientData[];
      const scored = scoreClients(clientData, defaultPercentileParams(3));
      rfvSummary = generateRFVSummary(scored);
      const nboScored = classifyNBO(clientData);
      nboSummary = generateNBOSummary(nboScored);
    }

    if (cxRes.data?.ticket_data) {
      const tickets = cxRes.data.ticket_data as unknown as CXTicket[];
      cxSummary = generateCXSummary(tickets);
    }

    // Generate plan via edge function
    setGenerating(true);
    setLoading(false);

    try {
      const { data: funcData, error: funcError } = await supabase.functions.invoke('generate-plan', {
        body: { profile, labAnswers, rfvSummary, nboSummary, cxSummary },
      });

      if (funcError) throw new Error(funcError.message);
      if (funcData?.error) throw new Error(funcData.error);

      const planSections = funcData?.sections || [];
      setSections(planSections);

      // Save to DB
      // Delete old plans first
      await supabase.from('generated_plans').delete().eq('user_id', user.id);
      await supabase.from('generated_plans').insert({
        user_id: user.id,
        plan_content: JSON.parse(JSON.stringify({ sections: planSections })),
      });

    } catch (err: any) {
      console.error('Plan generation error:', err);
      toast({ title: 'Erro ao gerar plano', description: err.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    loadAndGenerate();
  }, []);

  const handleRegenerate = () => {
    setSections([]);
    setGenerating(true);
    loadAndGenerate(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-muted-foreground">Carregando plano estratégico...</p>
      </div>
    );
  }

  if (!hasLab) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-4">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold text-foreground">Framework LAB não preenchido</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Para gerar seu plano estratégico personalizado, complete primeiro o Formulário LAB com as definições do programa de Loyalty.
        </p>
        <Button onClick={() => navigate('/lab-framework')} size="lg" className="mt-4">
          Ir para Formulário LAB
        </Button>
      </div>
    );
  }

  if (generating && sections.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-muted-foreground">Gerando seu plano estratégico com IA...</p>
        <p className="text-sm text-muted-foreground">Isso pode levar até 60 segundos</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Plano Estratégico de Loyalty</h1>
          <p className="mt-1 text-muted-foreground">Gerado por IA com base nos seus dados e no Framework LAB</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={handleRegenerate} disabled={generating} variant="outline" className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Regenerar Plano
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((section) => {
          const Icon = sectionIcons[section.id] || FileText;
          return (
            <Collapsible key={section.id} open={openSections.has(section.id)} onOpenChange={() => toggleSection(section.id)}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-6 w-6 text-primary" />
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${openSections.has(section.id) ? 'rotate-180' : ''}`} />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div
                      className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_h4]:text-foreground [&_strong]:text-foreground [&_table]:w-full [&_th]:border [&_th]:p-2 [&_th]:text-left [&_th]:bg-muted [&_td]:border [&_td]:p-2 [&_li]:text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(section.content) }}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {sections.length > 0 && (
        <div className="mt-8 text-center">
          <Button size="lg" onClick={() => navigate('/plano-final')} className="h-12 px-8">
            Ir para Visão Consolidada
          </Button>
        </div>
      )}
    </div>
  );
};

/** Simple markdown to HTML converter */
function markdownToHtml(md: string): string {
  if (!md) return '';
  let html = md
    // Headers
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => /^[\s-:]+$/.test(c))) return ''; // separator row
      const isHeader = false; // simplified
      const tag = 'td';
      return '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
    })
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Paragraphs (double newlines)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br/>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*?<\/li>(?:<br\/>)?)+/g, (match) => {
    return '<ul>' + match.replace(/<br\/>/g, '') + '</ul>';
  });

  // Wrap consecutive <tr> in <table>
  html = html.replace(/(<tr>.*?<\/tr>(?:<br\/>)?)+/g, (match) => {
    return '<table>' + match.replace(/<br\/>/g, '') + '</table>';
  });

  return '<p>' + html + '</p>';
}

export default Resultado;
