import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, User, FileText, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import espmLogo from '@/assets/espm-logo.jpg';

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [initials, setInitials] = useState('?');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchInitials(session.user.id);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchInitials(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchInitials = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('nome').eq('user_id', userId).single();
    if (data?.nome) {
      setInitials(data.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase());
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <img src={espmLogo} alt="ESPM" className="h-10 w-auto object-contain" />
          <div className="hidden sm:block">
            <span className="text-sm font-semibold text-foreground">Loyalty & RFV</span>
            <span className="ml-2 text-xs text-muted-foreground">Plataforma Educacional</span>
          </div>
        </Link>
        <div>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/perfil')} className="gap-2 cursor-pointer">
                  <User className="h-4 w-4" /> Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/resultado')} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" /> Plano de Loyalty
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/rfv')} className="gap-2 cursor-pointer">
                  <BarChart3 className="h-4 w-4" /> Análise de Clientes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-destructive">
                  <LogOut className="h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/login')} className="gap-2">
              <LogIn className="h-4 w-4" /> Entrar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
