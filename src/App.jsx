import React from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SearchProvider } from './contexts/SearchContext';
import { ItemsProvider } from './contexts/ItemsContext';
import Navbar from './components/Navbar';
import MapView from './pages/MapView';
import Feed from './pages/Feed';
import CreatePost from './pages/CreatePost';
import EditPost from './pages/EditPost';
import ItemDetails from './pages/ItemDetails';
import AdminPanel from './pages/AdminPanel';

const components = {
  Header() {
    return (
      <div className="auth-header">
        <h1>NYCU Lost & Found</h1>
        <p>Campus Item Recovery Platform</p>
      </div>
    );
  }
};

const AppContent = () => {
  const location = useLocation();
  const isMapRoute = location.pathname === '/';

  return (
    <ItemsProvider>
    <SearchProvider>
      <div className="app-layout">
        <Navbar />
        <main className="main-content" style={isMapRoute ? { padding: 0, maxWidth: '100%' } : {}}>
          <Routes>
            <Route path="/" element={<MapView />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/item/:id" element={<ItemDetails />} />
            <Route path="/edit/:id" element={<EditPost />} />
            <Route path="/admin" element={<AdminPanel />} />
            
            {/* Redirects for backwards compatibility */}
            <Route path="/map" element={<Navigate to="/" replace />} />
            <Route path="/lost" element={<Navigate to="/feed" replace />} />
            <Route path="/found" element={<Navigate to="/feed" replace />} />
          </Routes>
        </main>
      </div>
    </SearchProvider>
    </ItemsProvider>
  );
};

export default function App() {
  return (
    <Authenticator components={components} hideSignUp={false}>
      {() => <AppContent />}
    </Authenticator>
  );
}
