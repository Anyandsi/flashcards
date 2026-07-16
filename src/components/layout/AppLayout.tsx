import type { ReactNode } from 'react';

type AppLayoutProps = {
  children?: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <main className="h-screen overflow-hidden bg-background text-foreground">
      <div className="h-full">{children}</div>
    </main>
  );
}
