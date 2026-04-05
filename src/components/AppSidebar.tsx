import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Upload, SlidersHorizontal, BarChart3, Flag, ClipboardList, Shield, Target, Lightbulb, Award, Calendar, ListChecks, DollarSign, Megaphone, Settings, Users } from 'lucide-react';
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

const planoFinalItems = [
  { title: 'Visão Consolidada', url: '/plano-final', icon: Flag },
];

// Plan section sub-items shown when on /resultado
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

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rfvUploaded, setRfvUploaded] = useState(() => localStorage.getItem('rfv_data_uploaded') === 'true');
  const [cxUploaded, setCxUploaded] = useState(() => localStorage.getItem('cx_data_uploaded') === 'true');
  const [planSectionsAvailable, setPlanSectionsAvailable] = useState(false);

  const isOnResultado = location.pathname === '/resultado';
  const activeHash = location.hash?.replace('#', '') || '';

  useEffect(() => {
    const handleStorage = () => {
      setRfvUploaded(localStorage.getItem('rfv_data_uploaded') === 'true');
      setCxUploaded(localStorage.getItem('cx_data_uploaded') === 'true');
      setPlanSectionsAvailable(localStorage.getItem('plan_sections_ready') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 1000);
    return () => { window.removeEventListener('storage', handleStorage); clearInterval(interval); };
  }, []);

  useEffect(() => {
    // Listen for custom event from Resultado page
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

  const renderMenuItems = (items: typeof step1Items, uploadedFlag: boolean) =>
    items.map((item) => {
      const enabled = 'alwaysEnabled' in item ? (item.alwaysEnabled || uploadedFlag) : true;
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
                <item.icon className="mr-2 h-4 w-4" />
                {!collapsed && <span>{item.title}</span>}
              </span>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  const renderSimpleItems = (items: typeof step4Items) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild>
          <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
            <item.icon className="mr-2 h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

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

        {/* Step 1 - RFV */}
        <SidebarGroup>
          <SidebarGroupLabel>Passo 1 — RFV</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(step1Items, rfvUploaded)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Step 2 - NBO */}
        <SidebarGroup>
          <SidebarGroupLabel>Passo 2 — Next Best Offer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(step2Items, rfvUploaded)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Step 3 - CX */}
        <SidebarGroup>
          <SidebarGroupLabel>Passo 3 — Customer Experience</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(step3Items, cxUploaded)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Step 4 - Plano Estratégico */}
        <SidebarGroup>
          <SidebarGroupLabel>Passo 4 — Plano Estratégico</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderSimpleItems(step4Items)}

              {/* Plan section sub-navigation when on /resultado */}
              {isOnResultado && planSectionsAvailable && !collapsed && (
                <>
                  {planSectionItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild>
                        <a
                          href={`#${item.id}`}
                          className={cn(
                            'flex items-center gap-2 pl-6 text-xs hover:bg-muted/50 rounded-md py-1.5 transition-colors',
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
                    </SidebarMenuItem>
                  ))}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Plano Final */}
        <SidebarGroup>
          <SidebarGroupLabel>Plano Final</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderSimpleItems(planoFinalItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
