import { Link, useLocation } from 'react-router-dom';
import espmLogo from '@/assets/espm-logo.jpg';

const Header = () => {
  const location = useLocation();
  const isModule1 = location.pathname === '/' || location.pathname === '/diagnostico' || location.pathname === '/resultado';
  const isModule2 = location.pathname.startsWith('/rfv');

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
        <div />
      </div>
    </header>
  );
};

export default Header;
