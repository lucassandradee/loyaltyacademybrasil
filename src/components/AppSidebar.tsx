import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Upload, SlidersHorizontal, BarChart3, Flag, ClipboardList, Shield, Target, Lightbulb, Award, Calendar, ListChecks, DollarSign, Megaphone, Settings, Users, ChevronDown, CheckCircle2, Lock } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const step1Items = [
  { title: 'Upload Base de Dados', url: '/rfv', icon: Upload, alwaysEnabled: true },
  { title: 'Parametrização', url: '/rfv/parametros', icon: SlidersHorizontal, alwaysEnabled: false },
  { title: 'Análise RFV', url: '/rfv/dashboard', icon: BarChart3, alwaysEnabled: false },
];

const step2Items = [
  { title: 'Análise NBO', url: '/nbo/dashboard', icon: BarChart3, alwaysEnabled: false },
];

const step3Items = [
  { title: 'Upload Base de Chamados', url: '/cx', icon: Upload, alwaysEnabled: true },
  { title: 'Análise CX', url: '/cx/dashboard', icon: BarChart3, alwaysEnabled: false },
];

const step4Items = [
  { title: 'Formulário LAB', url: '/lab-framework', icon: ClipboardList },
  { title: 'Plano Estratégico', url: '/resultado', icon: FileText },
];

const homeItem = [
  { title: 'Loyalty Management', url: '/plano-final', icon: Flag },
];

const planSectionItems = [
  { id: 'sumario', title: 'Sumário Executivo', icon: FileText },
  { id: 'maturidade', title: 'Diagnóstico de Maturidade', icon: Shield },
  { id: 'objetivos', title: 'Objetivos do Programa', icon: Target },
  { id: 'estrutura', title: 'Estrutura do Programa', icon: Lightbulb },
  { id: 'estrategia', title: 'Estratégia', icon: Award },
  { id: 'beneficios', title: 'Benefícios', icon: Award },
  { id: 'segmentacao', title: 'Segmentação e Tierização', icon: Users },
  { id: 'canais', title: 'Canais de Comunicação', icon: Megaphone },
  { id: 'operacoes', title: 'Operações', icon: Settings },
  { id: 'custos', title: 'Custo do Programa', icon: DollarSign },
  { id: 'cronograma', title: 'Cronograma', icon: Calendar },
  { id: 'plano5w2h', title: 'Plano 5W2H', icon: ListChecks },
];

interface Profile {
  nome: string;
  empresa: string;
  cargo: string;
}

interface StepCompletion {
  rfv: boolean;
  nbo: boolean;
  cx: boolean;
  lab: boolean;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completion, setCompletion] = useState<StepCompletion>({ rfv: false, nbo: false, cx: false, lab: false });
  const [planSectionsAvailable, setPlanSectionsAvailable] = useState(false);
  const [planSubOpen, setPlanSubOpen] = useState(true);

  const isOnResultado = location.pathname === '/resultado';
  const activeHash = location.hash?.replace('#', '') || '';

  // Fetch real completion from DB
  useEffect(() => {
    const fetchCompletion = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [rfvRes, cxRes, diagRes] = await Promise.all([
        supabase.from('rfv_uploads').select('id').eq('user_id', user.id).limit(1).maybeSingle(),
        supabase.from('cx_uploads').select('id').eq('user_id', user.id).limit(1).maybeSingle(),
        supabase.from('diagnostic_responses').select('id, answers').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      // LAB is only complete if diagnostic_responses has answers.lab key
      const diagAnswers = diagRes.data?.answers as Record<string, any> | null;
      const labDone = !!(diagAnswers?.lab && typeof diagAnswers.lab === 'object' && Object.keys(diagAnswers.lab).length > 0);

      setCompletion({
        rfv: !!rfvRes.data,
        nbo: !!rfvRes.data, // NBO uses same data as RFV
        cx: !!cxRes.data,
        lab: labDone,
      });
    };
    fetchCompletion();
  }, [location.pathname]);

  // Also poll localStorage for plan sections
  useEffect(() => {
    const handleStorage = () => {
      setPlanSectionsAvailable(localStorage.getItem('plan_sections_ready') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 1000);
    return () => { window.removeEventListener('storage', handleStorage); clearInterval(interval); };
  }, []);

  useEffect(() => {
    const handler = () => setPlanSectionsAvailable(true);
    window.addEventListener('plan-sections-ready', handler);
    return () => window.removeEventListener('plan-sections-ready', handler);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('nome, empresa, cargo').eq('user_id', user.id).single();
        if (data) setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const initials = profile?.nome
    ? profile.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  // Step gating: each step requires the previous one
  const step1Enabled = true; // Always enabled
  const step2Enabled = completion.rfv;
  const step3Enabled = completion.rfv; // NBO uses RFV data, so after RFV you can do CX
  const step4Enabled = completion.rfv && completion.cx;

  const renderMenuItems = (items: typeof step1Items, stepEnabled: boolean, stepDone: boolean) =>
    items.map((item) => {
      const enabled = stepEnabled && ('alwaysEnabled' in item ? (item.alwaysEnabled || stepDone) : true);
      return (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild disabled={!enabled}>
            {enabled ? (
              <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                <item.icon className="mr-2 h-4 w-4" />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            ) : (
              <span className="flex items-center opacity-40 cursor-not-allowed">
                {stepEnabled ? <item.icon className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                {!collapsed && <span>{item.title}</span>}
              </span>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  const renderSimpleItems = (items: typeof step4Items, enabled = true) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild disabled={!enabled}>
          {enabled ? (
            <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
              <item.icon className="mr-2 h-4 w-4" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          ) : (
            <span className="flex items-center opacity-40 cursor-not-allowed">
              <Lock className="mr-2 h-4 w-4" />
              {!collapsed && <span>{item.title}</span>}
            </span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  const StepLabel = ({ label, done }: { label: string; done: boolean }) => (
    <span className="flex items-center gap-1.5">
      {done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
      {label}
    </span>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Profile */}
        {profile && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className={`flex items-center gap-3 px-3 py-4 ${collapsed ? 'justify-center' : ''}`}>
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{profile.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">{profile.cargo} · {profile.empresa}</p>
                  </div>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Home */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{renderSimpleItems(homeItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Step 1 — RFV */}
        <SidebarGroup>
          <SidebarGroupLabel><StepLabel label="Passo 1 — RFV" done={completion.rfv} /></SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(step1Items, step1Enabled, completion.rfv)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Step 2 — NBO */}
        <SidebarGroup>
          <SidebarGroupLabel><StepLabel label="Passo 2 — Next Best Offer" done={completion.nbo} /></SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(step2Items, step2Enabled, completion.nbo)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Step 3 — CX */}
        <SidebarGroup>
          <SidebarGroupLabel><StepLabel label="Passo 3 — Customer Experience" done={completion.cx} /></SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(step3Items, step3Enabled, completion.cx)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Step 4 — Plano Estratégico */}
        <SidebarGroup>
          <SidebarGroupLabel><StepLabel label="Passo 4 — Plano Estratégico" done={completion.lab} /></SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderSimpleItems(step4Items, step4Enabled)}

              {isOnResultado && planSectionsAvailable && !collapsed && (
                <SidebarMenuItem>
                  <button
                    onClick={() => setPlanSubOpen(!planSubOpen)}
                    className="flex w-full items-center justify-between pl-6 pr-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>Seções do Plano</span>
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', planSubOpen && 'rotate-180')} />
                  </button>
                  {planSubOpen && (
                    <div className="mt-1 space-y-0.5">
                      {planSectionItems.map((item) => (
                        <SidebarMenuButton key={item.id} asChild>
                          <a
                            href={`#${item.id}`}
                            className={cn(
                              'flex items-center gap-2 pl-8 text-xs hover:bg-muted/50 rounded-md py-1.5 transition-colors',
                              activeHash === item.id
                                ? 'bg-muted text-primary font-medium'
                                : 'text-muted-foreground'
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              window.dispatchEvent(new CustomEvent('plan-navigate', { detail: item.id }));
                              window.location.hash = item.id;
                            }}
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      ))}
                    </div>
                  )}
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>
    </Sidebar>
  );
}
