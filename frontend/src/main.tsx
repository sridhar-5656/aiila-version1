
import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet
} from 'react-router-dom';

import './index.css';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AlertInbox from './pages/AlertInbox';
import EntityProfile from './pages/EntityProfile';
import EntitiesPage from './pages/EntitiesPage';
import KeywordManager from './pages/KeywordManager';
import SourceMonitor from './pages/SourceMonitor';
import InvestigationPage from './pages/Investigation';
import ReportsPage from './pages/ReportsPage';


// Search Page Component
import SearchPage from './components/SearchBar'; // Component is named IntelligenceRegistrySearch
// Components
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';

// Store
import { useAuthStore } from './store';

/* ─────────────────────────────────────────
   Protected Layout
───────────────────────────────────────── */
const ProtectedLayout: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        <TopNav
          title="ILA Intelligence"
          subtitle="Security operations dashboard"
        />

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   App Render
───────────────────────────────────────── */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>

      <Routes>

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/reports" element={<ReportsPage />} />
<Route path="/investigation"    element={<InvestigationPage />} />
<Route path="/investigation/:id" element={<InvestigationPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedLayout />}>

          {/* Dashboard */}
          <Route path="/" element={<Dashboard />} />

          {/* Alerts */}
          <Route path="/alerts" element={<AlertInbox />} />

          {/* Entities */}
          <Route path="/entities" element={<EntitiesPage />} />
          <Route path="/entities/:id" element={<EntityProfile />} />

          {/* Investigation */}
          <Route path="/investigations" element={<InvestigationPage />} />

          {/* Sources */}
          <Route path="/sources" element={<SourceMonitor />} />

          {/* Keywords */}
          <Route path="/keywords" element={<KeywordManager />} />

          {/* Search Page */}
          <Route path="/search" element={<SearchPage />} />

        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>

    </BrowserRouter>
  </React.StrictMode>
);