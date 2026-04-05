import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Download, RefreshCw, FileText, Shield, Target, Lightbulb, Award, Calendar, ListChecks, DollarSign, Megaphone, Settings, Users, ChevronLeft, ChevronRight, ChevronDown, LayoutList, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
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
  plano: FileText,
};

function markdownToHtml(md: string): string {
  if (!md) return '';
  if (md.trim().startsWith('{') || md.trim().startsWith('```json')) {
    return '<p><em>Conteúdo sendo processado...</em></p>';
  }

  let html = md
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => /^[\s-:]+$/.test(c))) return '';
      return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
    })
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  html = html.replace(/(<li>.*?<\/li>(?:<br\/>)?)+/g, (match) => '<ul>' + match.replace(/<br\/>/g, '') + '</ul>');
  html = html.replace(/(<tr>.*?<\/tr>(?:<br\/>)?)+/g, (match) => '<table>' + match.replace(/<br\/>/g, '') + '</table>');
  return '<p>' + html + '</p>';
}

function parseSectionsFromContent(planContent: any): PlanSection[] {
  if (!planContent) return [];
  if (planContent.sections && Array.isArray(planContent.sections)) {
    const firstSection = planContent.sections[0];
    if (firstSection?.content && !firstSection.content.trim().startsWith('{')) {
      return planContent.sections;
    }
  }
  if (typeof planContent === 'string') {
    try { return parseSectionsFromContent(JSON.parse(planContent)); } catch { return [{ id: 'plano', title: 'Plano Estratégico', content: planContent }]; }
  }
  return [];
}

const Resultado = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sections, setSections] = useState<PlanSection[]>([]);
  const [activeSection, setActiveSection] = useState(0);
  const [hasLab, setHasLab] = useState(false);

  // Notify sidebar when sections are ready
  useEffect(() => {
    if (sections.length > 0) {
      localStorage.setItem('plan_sections_ready', 'true');
      window.dispatchEvent(new Event('plan-sections-ready'));
      // Set initial hash
      if (!window.location.hash && sections[0]) {
        window.location.hash = sections[0].id;
      }
    }
    return () => {
      localStorage.removeItem('plan_sections_ready');
    };
  }, [sections]);

  // Listen for sidebar navigation clicks
  useEffect(() => {
    const handler = (e: Event) => {
      const sectionId = (e as CustomEvent).detail;
      const idx = sections.findIndex(s => s.id === sectionId);
      if (idx >= 0) setActiveSection(idx);
    };
    window.addEventListener('plan-navigate', handler);
    return () => window.removeEventListener('plan-navigate', handler);
  }, [sections]);

  // Update hash when active section changes
  useEffect(() => {
    if (sections[activeSection]) {
      window.location.hash = sections[activeSection].id;
    }
  }, [activeSection, sections]);

  const loadAndGenerate = async (forceRegenerate = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }

    if (!forceRegenerate) {
      const { data: existingPlan } = await supabase
        .from('generated_plans')
        .select('plan_content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPlan?.plan_content) {
        const parsed = parseSectionsFromContent(existingPlan.plan_content);
        if (parsed.length > 0 && parsed[0].content && !parsed[0].content.trim().startsWith('{') && !parsed[0].content.trim().startsWith('```')) {
          setSections(parsed);
          setHasLab(true);
          setLoading(false);
          return;
        }
      }
    }

    const [profileRes, diagRes, rfvRes, cxRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('diagnostic_responses').select('answers').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('rfv_uploads').select('client_data').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('cx_uploads').select('ticket_data').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const profile = profileRes.data;
    const diagAnswers = diagRes.data?.answers as Record<string, any> | null;
    const labAnswers = diagAnswers?.lab || diagAnswers || null;

    if (!labAnswers || (typeof labAnswers === 'object' && Object.keys(labAnswers).length === 0)) {
      setHasLab(false);
      setLoading(false);
      return;
    }

    setHasLab(true);
    let rfvSummary = '', nboSummary = '', cxSummary = '';

    if (rfvRes.data?.client_data) {
      const clientData = rfvRes.data.client_data as unknown as ClientData[];
      const scored = scoreClients(clientData, defaultPercentileParams(3));
      rfvSummary = generateRFVSummary(scored);
      nboSummary = generateNBOSummary(classifyNBO(clientData));
    }
    if (cxRes.data?.ticket_data) {
      cxSummary = generateCXSummary(cxRes.data.ticket_data as unknown as CXTicket[]);
    }

    setGenerating(true);
    setLoading(false);

    try {
      const { data: funcData, error: funcError } = await supabase.functions.invoke('generate-plan', {
        body: { profile, labAnswers, rfvSummary, nboSummary, cxSummary },
      });
      if (funcError) throw new Error(funcError.message);
      if (funcData?.error) throw new Error(funcData.error);

      const planSections = parseSectionsFromContent(funcData);
      setSections(planSections);

      const userId = (await supabase.auth.getUser()).data.user!.id;
      await supabase.from('generated_plans').delete().eq('user_id', userId);
      await supabase.from('generated_plans').insert({
        user_id: userId,
        plan_content: JSON.parse(JSON.stringify({ sections: planSections })),
      });
    } catch (err: any) {
      console.error('Plan generation error:', err);
      toast({ title: 'Erro ao gerar plano', description: err.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => { loadAndGenerate(); }, []);

  const handleRegenerate = () => {
    setSections([]);
    setActiveSection(0);
    setGenerating(true);
    loadAndGenerate(true);
  };

  const handleDownloadPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const w = doc.internal.pageSize.getWidth();
      const maxW = w - 28;
      const BRAND_BLUE: [number, number, number] = [30, 64, 175];
      const DARK_GRAY: [number, number, number] = [51, 51, 51];

      const checkBreak = (y: number, needed: number) => {
        if (y + needed > doc.internal.pageSize.getHeight() - 25) { doc.addPage(); return 28; }
        return y;
      };

      doc.setFillColor(...BRAND_BLUE);
      doc.rect(0, 0, w, 50, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Plano Estratégico de Loyalty', 14, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Relatório personalizado — Framework LAB', 14, 38);
      doc.text(new Date().toLocaleDateString('pt-BR'), 14, 45);
      let y = 60;

      sections.forEach((section) => {
        y = checkBreak(y, 20);
        doc.setFillColor(...BRAND_BLUE);
        doc.rect(14, y, 3, 8, 'F');
        doc.setTextColor(...DARK_GRAY);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(section.title, 20, y + 6);
        y += 14;

        const plainText = section.content
          .replace(/#{1,4}\s*/g, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
          .replace(/^\|.*\|$/gm, '').replace(/^[-]+$/gm, '').replace(/^- /gm, '• ').replace(/^\d+\. /gm, '→ ');

        doc.setTextColor(80, 80, 80);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(plainText, maxW);
        lines.forEach((line: string) => { y = checkBreak(y, 5); doc.text(line, 14, y); y += 4.2; });
        y += 8;
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (i > 1) {
          doc.setFillColor(...BRAND_BLUE);
          doc.rect(0, 0, w, 14, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Loyalty Academy Brasil — Plano Estratégico', 14, 9);
          doc.text(`${i}/${totalPages}`, w - 14, 9, { align: 'right' });
        }
        const h = doc.internal.pageSize.getHeight();
        doc.setDrawColor(...BRAND_BLUE);
        doc.setLineWidth(0.3);
        doc.line(14, h - 12, w - 14, h - 12);
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text('Documento gerado pela Plataforma Loyalty Academy Brasil', 14, h - 8);
      }

      doc.save('Plano_Estrategico_Loyalty_LAB.pdf');
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (err) {
      console.error('PDF error:', err);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    }
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
          Para gerar seu plano estratégico personalizado, complete primeiro o Formulário LAB.
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

  const currentSection = sections[activeSection];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Plano Estratégico de Loyalty</h1>
          <p className="mt-1 text-muted-foreground">Gerado por IA com base nos seus dados e no Framework LAB</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadPDF} variant="outline" className="gap-2" disabled={sections.length === 0}>
            <Download className="h-4 w-4" /> Baixar PDF
          </Button>
          <Button onClick={handleRegenerate} disabled={generating} variant="outline" className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Regenerar
          </Button>
        </div>
      </div>

      {/* Active section content */}
      {currentSection && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = sectionIcons[currentSection.id] || FileText;
                return <Icon className="h-6 w-6 text-primary" />;
              })()}
              <CardTitle className="text-xl">{currentSection.title}</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Seção {activeSection + 1} de {sections.length} — Navegue pelas seções no menu lateral
            </p>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-foreground [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h4]:text-foreground [&_strong]:text-foreground [&_table]:w-full [&_table]:text-sm [&_th]:border [&_th]:p-2 [&_th]:text-left [&_th]:bg-muted [&_th]:font-semibold [&_td]:border [&_td]:p-2 [&_li]:text-muted-foreground [&_li]:mb-1 [&_ul]:my-3 [&_p]:mb-3 [&_p]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(currentSection.content) }}
            />
          </CardContent>
        </Card>
      )}

      {/* Bottom navigation */}
      <div className="mt-4 flex justify-between">
        <Button variant="outline" disabled={activeSection === 0} onClick={() => setActiveSection(prev => prev - 1)} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        <Button variant="outline" disabled={activeSection >= sections.length - 1} onClick={() => setActiveSection(prev => prev + 1)} className="gap-1">
          Próximo <ChevronRight className="h-4 w-4" />
        </Button>
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

export default Resultado;
