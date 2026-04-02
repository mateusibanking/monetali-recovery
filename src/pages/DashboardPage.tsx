import { useState } from 'react';
import { Client } from '@/data/mockData';
import KpiCards from '@/components/KpiCards';
import ClientTable from '@/components/ClientTable';
import ClientDetail from '@/components/ClientDetail';

const DashboardPage = () => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  return (
    <div className="space-y-6">
      {selectedClient ? (
        <ClientDetail client={selectedClient} onBack={() => setSelectedClient(null)} />
      ) : (
        <>
          <KpiCards />
          <div>
            <h2 className="text-lg font-semibold mb-3">Clientes Inadimplentes</h2>
            <ClientTable onSelectClient={setSelectedClient} />
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
