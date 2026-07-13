import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { MainNavigation } from '../components/layout/MainNavigation';
import { TopBar } from '../components/layout/TopBar';
import { LibraryPage } from './pages/LibraryPage';
import { OverviewPage } from './pages/OverviewPage';
import { ReviewPage } from './pages/ReviewPage';

export function App() {
  return (
    <HashRouter>
      <AppLayout>
        <div className="flex min-h-screen">
          <MainNavigation />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-6">
              <Routes>
                <Route path="/" element={<Navigate to="/review" replace />} />
                <Route path="/review" element={<ReviewPage />} />
                <Route path="/decks" element={<Navigate to="/library" replace />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/overview" element={<OverviewPage />} />
              </Routes>
            </div>
          </div>
        </div>
      </AppLayout>
    </HashRouter>
  );
}
