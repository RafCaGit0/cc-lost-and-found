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
import { MapPin, Mail, Lock, ShieldCheck, AlertTriangle } from 'lucide-react';

const formFields = {
  signIn: {
    username: {
      label: 'Email',
      placeholder: 'your.name@nycu.edu.tw',
      type: 'email',
      isRequired: true,
    },
  },
  signUp: {
    email: {
      label: 'University Email',
      placeholder: 'your.name@nycu.edu.tw',
      type: 'email',
      order: 1,
      isRequired: true,
    },
    password: {
      label: 'Password',
      placeholder: 'Create a strong password',
      order: 2,
      isRequired: true,
    },
    confirm_password: {
      label: 'Confirm Password',
      placeholder: 'Repeat your password',
      order: 3,
      isRequired: true,
    },
  },
  confirmSignUp: {
    confirmation_code: {
      label: 'Verification Code',
      placeholder: 'Enter the 6-digit code',
      isRequired: true,
    },
  },
};

const components = {
  Header() {
    return (
      <div className="auth-header">
        <div className="auth-logo">
          <MapPin size={36} color="var(--color-accent)" strokeWidth={2.5} />
        </div>
        <h1>NYCU Lost &amp; Found</h1>
        <p>Campus Item Recovery Platform</p>
      </div>
    );
  },

  SignUp: {
    Header() {
      return (
        <div className="auth-info-box">
          <Mail size={16} />
          <span>Please use your <strong>@nycu.edu.tw</strong> university email to register.</span>
        </div>
      );
    },
    Footer() {
      return null;
    },
  },

  ConfirmSignUp: {
    Header() {
      return (
        <div className="auth-confirm-header">
          <div className="auth-info-box" style={{ background: '#fffbeb', borderColor: '#fbbf24', color: '#92400e' }}>
            <AlertTriangle size={16} />
            <span>Check your <strong>spam / junk folder</strong> if you don't see the verification email within a few minutes.</span>
          </div>
        </div>
      );
    },
  },
};

const services = {
  async validateCustomSignUp(formData) {
    const errors = {};
    const pw = formData.password || '';
    const email = formData.email || '';

    // Email domain check
    if (email && !email.toLowerCase().endsWith('@nycu.edu.tw')) {
      errors.email = 'Please use your @nycu.edu.tw university email';
    }

    // Password checks
    const checks = [
      [pw.length >= 8, 'At least 8 characters'],
      [/[A-Z]/.test(pw), 'An uppercase letter (A–Z)'],
      [/[a-z]/.test(pw), 'A lowercase letter (a–z)'],
      [/[0-9]/.test(pw), 'A number (0–9)'],
      [/[^A-Za-z0-9]/.test(pw), 'A special character (!@#$%^&*)'],
    ];

    const failed = checks.filter(([pass]) => !pass);
    if (failed.length > 0) {
      errors.password = 'Missing requirements:\n' + failed.map(([, label]) => `  \u2022 ${label}`).join('\n');
    }

    if (formData.confirm_password && pw !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) return errors;
  },
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
    <Authenticator formFields={formFields} components={components} services={services} loginMechanisms={['email']} hideSignUp={false}>
      {() => <AppContent />}
    </Authenticator>
  );
}
