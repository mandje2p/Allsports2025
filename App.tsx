
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Welcome } from './pages/Welcome';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Onboarding } from './pages/Onboarding';
import { Home } from './pages/Home';
import { Disciplines } from './pages/Disciplines';
import { Competitions } from './pages/Competitions';
import { Generator } from './pages/Generator';
import { MatchCalendar } from './pages/MatchCalendar';
import { Gallery } from './pages/Gallery';
import { Profile } from './pages/Profile';
import { BackgroundSelection } from './pages/BackgroundSelection';
import { LanguageProvider } from './contexts/LanguageContext';

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/onboarding" element={<Onboarding />} />
            
            <Route path="/home" element={<Home />} />
            <Route path="/disciplines" element={<Disciplines />} />
            
            {/* Flux de navigation : Competitions -> Calendrier -> Generateur -> Galerie */}
            <Route path="/competitions/:sportId" element={<Competitions />} />
            <Route path="/calendar/:leagueId" element={<MatchCalendar />} />
            <Route path="/generator" element={<Generator />} />
            <Route path="/backgrounds" element={<BackgroundSelection />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/profile" element={<Profile />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </LanguageProvider>
  );
};

export default App;
