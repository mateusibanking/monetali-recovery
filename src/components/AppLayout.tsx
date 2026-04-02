import { Outlet } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import BottomNav from '@/components/BottomNav';

const AppLayout = () => (
  <div className="flex min-h-screen w-full bg-background">
    <AppSidebar />
    {/* Offset for fixed sidebar on md+ */}
    <main className="flex-1 p-4 sm:p-6 pb-20 md:pb-6 md:ml-60 overflow-auto">
      <Outlet />
    </main>
    <BottomNav />
  </div>
);

export default AppLayout;
