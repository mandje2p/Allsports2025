
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { SubscriptionRequiredRoute } from './components/SubscriptionRequiredRoute';
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
              
              {/* Public routes - redirect to home if already authenticated */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
              
              {/* Routes that require authentication but not subscription */}
              <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              
              {/* Routes that require both authentication AND subscription */}
              <Route path="/home" element={<SubscriptionRequiredRoute><Home /></SubscriptionRequiredRoute>} />
              <Route path="/disciplines" element={<SubscriptionRequiredRoute><Disciplines /></SubscriptionRequiredRoute>} />
              
              {/* Flux de navigation : Competitions -> Calendrier -> Generateur -> Galerie */}
              <Route path="/competitions/:sportId" element={<SubscriptionRequiredRoute><Competitions /></SubscriptionRequiredRoute>} />
              <Route path="/calendar/:leagueId" element={<SubscriptionRequiredRoute><MatchCalendar /></SubscriptionRequiredRoute>} />
              <Route path="/generator" element={<SubscriptionRequiredRoute><Generator /></SubscriptionRequiredRoute>} />
              <Route path="/backgrounds" element={<SubscriptionRequiredRoute><BackgroundSelection /></SubscriptionRequiredRoute>} />
              <Route path="/gallery" element={<SubscriptionRequiredRoute><Gallery /></SubscriptionRequiredRoute>} />
              <Route path="/badges" element={<SubscriptionRequiredRoute><Badges /></SubscriptionRequiredRoute>} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </HashRouter>
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;