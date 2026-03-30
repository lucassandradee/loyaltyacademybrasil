import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Clock, ShoppingCart, DollarSign } from 'lucide-react';
import { ClientData, RFVParams, defaultParams } from '@/lib/rfv-logic';
import { supabase } from '@/integrations/supabase/client';

const RFVParametros = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const stateData = (location.state as { clientData: ClientData[] })?.clientData;
  const [clientData, setClientData] = useState<ClientData[] | null>(stateData || null);
  const [params, setParams] = useState<RFVParams>(defaultParams);
  const [loading, setLoading] = useState(!stateData);

  useEffect(() => {
    if (stateData) return;
    const fetchFromDB = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) { navigate('/rfv'); return; }
      const { data } = await supabase
        .from('rfv_uploads')
        .select('client_data')
        .eq('user_id', session.session.user.id)
        .maybeSingle();
      if (data?.client_data) {
        setClientData(data.client_data as unknown as ClientData[]);
      } else {
        navigate('/rfv');
      }
      setLoading(false);
    };
    fetchFromDB();
  }, [stateData, navigate]);

  const update = (section: keyof RFVParams, field: string, value: number) => {
    setParams(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const handleSubmit = () => {
    navigate('/rfv/dashboard', { state: { clientData, params } });
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Carregando dados...</div>;
  }

  if (!clientData) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground">Parametrização RFV</h1>
        <p className="mt-2 text-muted-foreground">
          Defina os critérios de corte para os scores 1, 2 e 3 de cada variável.
          <br />
          <span className="text-xs">Você pode voltar e ajustar estes parâmetros a qualquer momento.</span>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Recência */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-primary" />
              Recência (Dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Score 3 (Top): Menos de</label>
              <div className="flex items-center gap-2">
                <Input type="number" value={params.recencia.top} onChange={e => update('recencia', 'top', Number(e.target.value))} className="h-9" />
                <span className="text-xs text-muted-foreground">dias</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Score 2 (Middle): Entre</label>
              <div className="flex items-center gap-2">
                <Input type="number" value={params.recencia.mid_min} onChange={e => update('recencia', 'mid_min', Number(e.target.value))} className="h-9" />
                <span className="text-xs">e</span>
                <Input type="number" value={params.recencia.mid_max} onChange={e => update('recencia', 'mid_max', Number(e.target.value))} className="h-9" />
                <span className="text-xs text-muted-foreground">dias</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Score 1 (Entry): Mais de</label>
              <div className="flex items-center gap-2">
                <Input type="number" value={params.recencia.entry} onChange={e => update('recencia', 'entry', Number(e.target.value))} className="h-9" />
                <span className="text-xs text-muted-foreground">dias</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Frequência */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Frequência (Compras)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Score 3 (Top): {'>='}</label>
              <div className="flex items-center gap-2">
                <Input type="number" value={params.frequencia.top} onChange={e => update('frequencia', 'top', Number(e.target.value))} className="h-9" />
                <span className="text-xs text-muted-foreground">vezes</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Score 2 (Middle): Entre</label>
              <div className="flex items-center gap-2">
                <Input type="number" value={params.frequencia.mid_min} onChange={e => update('frequencia', 'mid_min', Number(e.target.value))} className="h-9" />
                <span className="text-xs">e</span>
                <Input type="number" value={params.frequencia.mid_max} onChange={e => update('frequencia', 'mid_max', Number(e.target.value))} className="h-9" />
                <span className="text-xs text-muted-foreground">vezes</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Score 1 (Entry): Entre</label>
              <div className="flex items-center gap-2">
                <Input type="number" value={params.frequencia.entry_min} onChange={e => update('frequencia', 'entry_min', Number(e.target.value))} className="h-9" />
                <span className="text-xs">e</span>
                <Input type="number" value={params.frequencia.entry_max} onChange={e => update('frequencia', 'entry_max', Number(e.target.value))} className="h-9" />
                <span className="text-xs text-muted-foreground">vezes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valor */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5 text-primary" />
              Valor Monetário (R$)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Score 3 (Top): {'>='}</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">R$</span>
                <Input type="number" value={params.valor.top} onChange={e => update('valor', 'top', Number(e.target.value))} className="h-9" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Score 2 (Middle): Entre</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">R$</span>
                <Input type="number" value={params.valor.mid_min} onChange={e => update('valor', 'mid_min', Number(e.target.value))} className="h-9" />
                <span className="text-xs">e</span>
                <Input type="number" value={params.valor.mid_max} onChange={e => update('valor', 'mid_max', Number(e.target.value))} className="h-9" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Score 1 (Entry): Menos de</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">R$</span>
                <Input type="number" value={params.valor.entry} onChange={e => update('valor', 'entry', Number(e.target.value))} className="h-9" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/rfv')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button size="lg" onClick={handleSubmit}>
          Gerar Análise Completa
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default RFVParametros;
