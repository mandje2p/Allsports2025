
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { Welcome } from './pages/Welcome';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Onboarding } from './pages/Onboarding';
import { Subscription } from './pages/Subscription';
import { Home } from './pages/Home';
import { Disciplines } from './pages/Disciplines';
import { Competitions } from './pages/Competitions';
import { Generator } from './pages/Generator';
import { MatchCalendar } from './pages/MatchCalendar';
import { Gallery } from './pages/Gallery';
import { Profile } from './pages/Profile';
import { Badges } from './pages/Badges';
import { BackgroundSelection } from './pages/BackgroundSelection';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <HashRouter>
          <Layout>
            <Routes>
              {/* Redirect root to Login as requested */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* Public routes - redirect if authenticated */}
              <Route path="/welcome" element={<PublicRoute><Welcome /></PublicRoute>} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
              
              {/* Protected routes - require authentication */}
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/disciplines" element={<ProtectedRoute><Disciplines /></ProtectedRoute>} />
              
              {/* Flux de navigation : Competitions -> Calendrier -> Generateur -> Galerie */}
              <Route path="/competitions/:sportId" element={<ProtectedRoute><Competitions /></ProtectedRoute>} />
              <Route path="/calendar/:leagueId" element={<ProtectedRoute><MatchCalendar /></ProtectedRoute>} />
              <Route path="/generator" element={<ProtectedRoute><Generator /></ProtectedRoute>} />
              <Route path="/backgrounds" element={<ProtectedRoute><BackgroundSelection /></ProtectedRoute>} />
              <Route path="/gallery" element={<ProtectedRoute><Gallery /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/badges" element={<ProtectedRoute><Badges /></ProtectedRoute>} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </HashRouter>
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;