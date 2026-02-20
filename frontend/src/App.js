import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardsPage from './pages/DashboardsPage';
import BuilderPage from './pages/BuilderPage';
import DataExplorerPage from './pages/DataExplorerPage';
import ReportsPage from './pages/ReportsPage';
import ReportBuilderPage from './pages/ReportBuilderPage';
import SchemaViewerPage from './pages/SchemaViewerPage';
import SQLEditorPage from './pages/SQLEditorPage';
import ConnectionsPage from './pages/ConnectionsPage';
import UserGuidePage from './pages/UserGuidePage';
import ProfilePage from './pages/ProfilePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboards" replace />} />
            <Route path="dashboards" element={<DashboardsPage />} />
            <Route path="dashboards/:id" element={<BuilderPage />} />
            <Route path="explore" element={<DataExplorerPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/:id" element={<ReportBuilderPage />} />
            <Route path="sql" element={<SQLEditorPage />} />
            <Route path="connections" element={<ConnectionsPage />} />
            <Route path="schema" element={<SchemaViewerPage />} />
            <Route path="guide" element={<UserGuidePage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboards" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
