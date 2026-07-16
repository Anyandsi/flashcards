import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DeletionFeedbackProvider } from '../components/feedback/DeletionFeedback';
import { AppLayout } from '../components/layout/AppLayout';
import { MainNavigation } from '../components/layout/MainNavigation';
import { TopBar } from '../components/layout/TopBar';
import { ScrollArea } from '../components/ui/ScrollArea';
import { CardEditorPage } from './pages/library/CardEditorPage';
import { LibraryPage } from './pages/library/LibraryPage';
import { TopicPage } from './pages/library/TopicPage';
import { OverviewPage } from './pages/OverviewPage';
import { ReviewPage } from './pages/ReviewPage';
import { ReviewTopicPage } from './pages/ReviewTopicPage';
import { routePatterns, routes } from './routes';

export function App() {
  return (
    <HashRouter>
      <DeletionFeedbackProvider>
        <AppLayout>
          <div className="flex h-screen overflow-hidden">
            <MainNavigation />
            <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
              <TopBar />
              <ScrollArea className="min-h-0 flex-1">
                <div className="flex min-w-0 flex-col gap-5 p-6">
                  <Routes>
                    <Route path={routes.root} element={<Navigate to={routes.review} replace />} />
                    <Route path={routes.review} element={<ReviewPage />} />
                    <Route path={routePatterns.reviewTopic} element={<ReviewTopicPage />} />
                    <Route
                      path={routes.legacyDecks}
                      element={<Navigate to={routes.library} replace />}
                    />
                    <Route path={routes.library} element={<LibraryPage />} />
                    <Route path={routePatterns.topic} element={<TopicPage />} />
                    <Route path={routePatterns.addCard} element={<CardEditorPage />} />
                    <Route path={routePatterns.editCard} element={<CardEditorPage />} />
                    <Route path={routes.overview} element={<OverviewPage />} />
                  </Routes>
                </div>
              </ScrollArea>
            </div>
          </div>
        </AppLayout>
      </DeletionFeedbackProvider>
    </HashRouter>
  );
}
