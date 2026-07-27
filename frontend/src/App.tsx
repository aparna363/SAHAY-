import { useState } from 'react';
import { TopHeader } from './components/TopHeader';
import { LiveAlertTicker } from './components/LiveAlertTicker';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { WeatherPage } from './pages/WeatherPage';
import { AlertsPage } from './pages/AlertsPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { EmergencyPage } from './pages/EmergencyPage';
import { RiverStatusPage } from './pages/RiverStatusPage';
import { NewsPage } from './pages/NewsPage';
import { PreparednessPage } from './pages/PreparednessPage';
import { ContactsPage } from './pages/ContactsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CollectorDashboard } from './pages/CollectorDashboard';
import { RescueDashboard } from './pages/RescueDashboard';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { EmergencyContactsModal } from './components/EmergencyContactsModal';
import { Footer } from './components/Footer';
import type { Language } from './translations';

export function App() {
  const [currentLang, setCurrentLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState('home');
  const [registerRole, setRegisterRole] = useState<'citizen' | 'official'>('citizen');
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('sahay_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleOpenRegister = (role: 'citizen' | 'official') => {
    setRegisterRole(role);
    setActiveTab('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLogin = () => {
    setActiveTab('login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Role Redirect Handler on Successful Sign In
  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const role = (user?.role || 'citizen').toLowerCase();
    if (role === 'collector') {
      setActiveTab('collector_dashboard');
    } else if (role === 'rescue_team') {
      setActiveTab('rescue_dashboard');
    } else {
      // Citizen goes to Home page
      setActiveTab('home');
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('sahay_token');
    localStorage.removeItem('sahay_user');
    setActiveTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickAction = (actionId: string) => {
    if (actionId === 'report') {
      setActiveTab('emergency');
    } else if (actionId === 'shelter') {
      setActiveTab('live-map');
    } else if (actionId === 'river-status') {
      setActiveTab('river-status');
    } else if (actionId === 'bulletin') {
      setActiveTab('alerts');
    }
  };

  // Render current active page view
  const renderCurrentView = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomePage
            currentLang={currentLang}
            onOpenAlerts={() => setActiveTab('alerts')}
            onOpenContacts={() => setIsContactsOpen(true)}
            onSelectAction={handleQuickAction}
          />
        );
      case 'weather':
        return <WeatherPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'live-map':
        return <LiveMapPage />;
      case 'emergency':
        return <EmergencyPage />;
      case 'river-status':
        return <RiverStatusPage />;
      case 'news':
        return <NewsPage />;
      case 'preparedness':
        return <PreparednessPage />;
      case 'contacts':
        return <ContactsPage />;
      case 'profile_settings':
        return (
          <ProfileSettingsPage
            currentLang={currentLang}
            user={currentUser}
            onUpdateUser={(updatedUser) => {
              setCurrentUser(updatedUser);
              localStorage.setItem('sahay_user', JSON.stringify(updatedUser));
            }}
            onBack={() => {
              const role = (currentUser?.role || 'citizen').toLowerCase();
              if (role === 'collector') setActiveTab('collector_dashboard');
              else if (role === 'rescue_team') setActiveTab('rescue_dashboard');
              else setActiveTab('home');
            }}
          />
        );
      case 'collector_dashboard':
        return (
          <CollectorDashboard
            user={currentUser}
            onSignOut={handleSignOut}
          />
        );
      case 'rescue_dashboard':
        return (
          <RescueDashboard
            user={currentUser}
            onSignOut={handleSignOut}
          />
        );
      case 'login':
        return (
          <LoginPage
            currentLang={currentLang}
            onNavigateToRegister={handleOpenRegister}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case 'register':
        return (
          <RegisterPage
            currentLang={currentLang}
            initialRole={registerRole}
            onNavigateToLogin={handleOpenLogin}
          />
        );
      default:
        return (
          <HomePage
            currentLang={currentLang}
            onOpenAlerts={() => setActiveTab('alerts')}
            onOpenContacts={() => setIsContactsOpen(true)}
            onSelectAction={handleQuickAction}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans antialiased text-slate-900 selection:bg-emerald-200 selection:text-emerald-900">
      {/* 1. Government Banner Header with Language Selector */}
      <TopHeader
        currentLang={currentLang}
        onLanguageChange={(lang) => setCurrentLang(lang)}
        onOpenContacts={() => setIsContactsOpen(true)}
      />

      {/* 2. Red Alert Live Ticker */}
      <LiveAlertTicker
        currentLang={currentLang}
        onAlertClick={() => setActiveTab('alerts')}
      />

      {/* 3. Main Navbar with SAHAY logo, User Profile Icon & Settings Dropdown */}
      <Navbar
        currentLang={currentLang}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenLogin={handleOpenLogin}
        onOpenRegister={handleOpenRegister}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onOpenProfileSettings={() => {
          setActiveTab('profile_settings');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* 4. Main Dynamic Page View */}
      <main className="flex-1">
        {renderCurrentView()}
      </main>

      {/* 5. Footer */}
      <Footer
        currentLang={currentLang}
        onOpenContacts={() => setIsContactsOpen(true)}
        onOpenRegister={handleOpenRegister}
      />

      {/* Emergency Contacts Quick Modal */}
      <EmergencyContactsModal
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
      />
    </div>
  );
}

export default App;
