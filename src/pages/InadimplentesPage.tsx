import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Client } from '@/data/mockData';
import ClientTable from '@/components/ClientTable';
import ClientDetail from '@/components/ClientDetail';
import { useClientes } from '@/hooks/useClientes';

const InadimplentesPage = () => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { getById } = useClientes();

  // Deeplink da Agenda: /inadimplentes?cliente=ID#pagamento-PID
  useEffect(() => {
    const cid = searchParams.get('cliente');
    if (!cid || (selectedClient && selectedClient.id === cid)) return;
    let cancelled = false;
    (async () => {
      const c = await getById(cid);
      if (!cancelled && c) setSelectedClient(c);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleBack = () => {
    setSelectedClient(null);
    if (searchParams.get('cliente')) {
      const sp = new URLSearchParams(searchParams);
      sp.delete('cliente');
      setSearchParams(sp);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Inadimplentes</h2>
      {selectedClient ? (
        <ClientDetail client={selectedClient} onBack={handleBack} />
      ) : (
        <ClientTable onSelectClient={setSelectedClient} />
      )}
    </div>
  );
};

export default InadimplentesPage;
