import { BookOpen, ChartNoAxesColumnIncreasing, SquareLibrary } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navigationItems = [
  {
    label: 'Review',
    description: 'Practice due cards',
    icon: BookOpen,
    to: '/review',
  },
  {
    label: 'Library',
    description: 'Manage topics',
    icon: SquareLibrary,
    to: '/library',
  },
  {
    label: 'Overview',
    description: 'Session history',
    icon: ChartNoAxesColumnIncreasing,
    to: '/overview',
  },
];

export function MainNavigation() {
  return (
    <aside className="flex min-h-screen w-72 shrink-0 flex-col border-r border-border bg-card text-card-foreground">
      <div className="flex h-16 flex-col justify-center border-b border-border px-5">
        <p className="text-lg font-semibold">Flashcards</p>
        <p className="mt-1 text-sm text-muted-foreground">Study workspace</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition ${
                  isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                }`
              }
              key={item.label}
              to={item.to}
            >
              <Icon size={18} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block truncate text-xs opacity-80">{item.description}</span>
              </span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
