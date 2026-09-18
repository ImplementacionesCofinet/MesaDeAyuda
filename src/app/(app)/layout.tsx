import { TopNav } from "@/components/nav";
import { requireUser } from "@/lib/auth/guards";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <TopNav user={user} />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      <footer className="mx-auto max-w-7xl px-6 pb-10 text-xs text-humo">
        Cofinet · Datos y TI — canal único de requerimientos.
      </footer>
    </div>
  );
}
