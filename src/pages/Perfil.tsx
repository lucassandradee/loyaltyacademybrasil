import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

const Perfil = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [cargo, setCargo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');
      const { data } = await supabase.from('profiles').select('nome, empresa, cargo').eq('user_id', user.id).single();
      if (data) {
        setNome(data.nome);
        setEmpresa(data.empresa);
        setCargo(data.cargo);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ nome, empresa, cargo }).eq('user_id', user.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Perfil atualizado com sucesso!' });
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Meu Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Input value={empresa} onChange={e => setEmpresa(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Input value={cargo} onChange={e => setCargo(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Perfil;
