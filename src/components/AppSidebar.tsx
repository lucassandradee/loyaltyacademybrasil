import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Upload, SlidersHorizontal, BarChart3, User } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

const module1Items = [
  { title: 'Plano Estratégico', url: '/resultado', icon: FileText },
];

const module2Items = [
  { title: 'Upload RFV', url: '/rfv', icon: Upload },
  { title: 'Parametrização', url: '/rfv/parametros', icon: SlidersHorizontal },
  { title: 'Dashboard', url: '/rfv/dashboard', icon: BarChart3 },
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

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('nome, empresa, cargo')
          .eq('user_id', user.id)
          .single();
        if (data) setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const initials = profile?.nome
    ? profile.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Profile Section */}
        {profile && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className={`flex items-center gap-3 px-3 py-4 ${collapsed ? 'justify-center' : ''}`}>
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
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

        {/* Module 1 */}
        <SidebarGroup defaultOpen>
          <SidebarGroupLabel>Módulo 1 — Loyalty</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {module1Items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Module 2 */}
        <SidebarGroup defaultOpen>
          <SidebarGroupLabel>Módulo 2 — RFV</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {module2Items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
