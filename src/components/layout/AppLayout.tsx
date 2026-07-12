import type { ReactNode } from 'react';

type AppLayoutProps = {
  children?: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen">{children}</div>
    </main>
  );
}
