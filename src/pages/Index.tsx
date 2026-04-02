import { useState } from 'react';
import { Client } from '@/data/mockData';
import Header from '@/components/Header';
import KpiCards from '@/components/KpiCards';
import ClientTable from '@/components/ClientTable';
import ClientDetail from '@/components/ClientDetail';

const Index = () => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
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
      </main>
    </div>
  );
};

export default Index;
