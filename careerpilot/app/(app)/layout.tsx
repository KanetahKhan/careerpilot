import { Sidebar } from "@/components/Sidebar";
import { AppHeader } from "@/components/AppHeader";
import AppAmbientBackground from "@/components/app/AppAmbientBackground";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="relative flex-1 flex flex-col min-w-0">
        <AppAmbientBackground />
        <div className="relative z-10 flex flex-col flex-1 min-w-0">
          <AppHeader />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
