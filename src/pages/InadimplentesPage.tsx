import { useState } from 'react';
import { Client, clients as allClients } from '@/data/mockData';
import ClientTable from '@/components/ClientTable';
import ClientDetail from '@/components/ClientDetail';

const InadimplentesPage = () => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Inadimplentes</h2>
      {selectedClient ? (
        <ClientDetail client={selectedClient} onBack={() => setSelectedClient(null)} />
      ) : (
        <ClientTable onSelectClient={setSelectedClient} />
      )}
    </div>
  );
};

export default InadimplentesPage;
