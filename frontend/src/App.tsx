// SAHAY Main Application Entry - Refreshed
import { useState, useEffect } from 'react';
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
import { OfficialLoginPage } from './pages/OfficialLoginPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { CollectorDashboard } from './pages/CollectorDashboard';
import { RescueDashboard } from './pages/RescueDashboard';
import { CitizenDashboard } from './pages/CitizenDashboard';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { EmergencyContactsModal } from './components/EmergencyContactsModal';
import { Footer } from './components/Footer';
import type { Language } from './translations';

import { getCurrentUserSession, getStoredUser, clearAuthSession } from './services/api';
import { LocationProvider } from './context/LocationContext';
import { LocationPermissionModal } from './components/LocationPermissionModal';

export function App() {
  const [currentLang, setCurrentLang] = useState<Language>('en');
  const [registerRole, setRegisterRole] = useState<'citizen' | 'official'>('citizen');
  const [isContactsOpen, setIsContactsOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(() => {
    return getStoredUser();
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || urlParams.get('resetToken');
    const pathname = window.location.pathname;

    if (token || pathname.includes('/reset-password') || pathname.includes('reset_password')) {
      return 'reset_password';
    }

    const savedUser = getStoredUser();
    const savedTab = sessionStorage.getItem('sahay_active_tab') || localStorage.getItem('sahay_active_tab');

    if (savedUser) {
      try {
        const role = (savedUser?.role || '').toLowerCase();

        if (savedTab && !['login', 'official_login', 'register', 'reset_password'].includes(savedTab)) {
          return savedTab;
        }

        if (role === 'collector') return 'collector_dashboard';
        if (role === 'admin' || role === 'super_admin') return 'super_admin_dashboard';
        if (role === 'station' || role === 'rescue_team' || role === 'station_admin') {
          const status = (savedUser?.status || '').toLowerCase();
          if (status !== 'approved' && status !== 'active') {
            return 'official_login';
          }
          return 'rescue_dashboard';
        }
      } catch (e) {
        console.error('Error parsing saved user:', e);
      }
    }

    return (savedTab && !['login', 'official_login', 'register', 'reset_password'].includes(savedTab)) ? savedTab : 'home';
  });

  useEffect(() => {
    // Validate session with backend /auth/me on mount
    getCurrentUserSession().then((verifiedUser) => {
      if (verifiedUser) {
        setCurrentUser(verifiedUser);
      } else {
        setCurrentUser(null);
      }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || urlParams.get('resetToken');
    const pathname = window.location.pathname;

    if (token || pathname.includes('/reset-password') || pathname.includes('reset_password')) {
      setActiveTab('reset_password');
    }
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    sessionStorage.setItem('sahay_active_tab', tab);
  };

  const handleOpenRegister = (role: 'citizen' | 'official') => {
    if (role === 'official') {
      handleTabChange('official_login');
    } else {
      setRegisterRole('citizen');
      handleTabChange('register');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLogin = () => {
    handleTabChange('login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenOfficialLogin = () => {
    handleTabChange('official_login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Role Redirect Handler on Successful Sign In
  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const role = (user?.role || 'citizen').toLowerCase();
    const status = (user?.status || 'approved').toLowerCase();
    let targetTab = 'home';

    if (role === 'super_admin' || role === 'admin') {
      targetTab = 'super_admin_dashboard';
    } else if (role === 'collector') {
      targetTab = 'collector_dashboard';
    } else if (role === 'rescue_team' || role === 'station' || role === 'station_admin') {
      if (status !== 'approved' && status !== 'active') {
        alert(`Your Station account is PENDING APPROVAL by the District Collector of ${user.district || 'your district'}. Station Dashboard access will be granted after Collector approval.`);
        targetTab = 'official_login';
      } else {
        targetTab = 'rescue_dashboard';
      }
    } else {
      // Citizen role goes to homepage first; user can click 'Citizen Dashboard' from navbar whenever desired
      targetTab = 'home';
    }
    handleTabChange(targetTab);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    clearAuthSession();
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
      case 'citizen_dashboard':
        return (
          <CitizenDashboard
            currentLang={currentLang}
            user={currentUser}
            onSignOut={handleSignOut}
            onNavigateToTab={(tab) => handleTabChange(tab)}
          />
        );
      case 'weather':
        return <WeatherPage />;
      case 'alerts':
        return <AlertsPage onNavigateToMap={() => handleTabChange('live-map')} />;
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
              if (role === 'super_admin' || role === 'admin') setActiveTab('super_admin_dashboard');
              else if (role === 'collector') setActiveTab('collector_dashboard');
              else if (role === 'rescue_team' || role === 'station' || role === 'station_admin') setActiveTab('rescue_dashboard');
              else setActiveTab('home');
            }}
          />
        );
      case 'super_admin_dashboard':
        return (
          <SuperAdminDashboard
            user={currentUser}
            onSignOut={handleSignOut}
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
        if (currentUser) {
          const role = (currentUser.role || '').toLowerCase();
          const status = (currentUser.status || '').toLowerCase();
          if ((role === 'station' || role === 'rescue_team' || role === 'station_admin') && status !== 'approved' && status !== 'active') {
            return (
              <OfficialLoginPage
                currentLang={currentLang}
                onLoginSuccess={handleLoginSuccess}
                onNavigateToCitizen={handleOpenLogin}
              />
            );
          }
        }
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
            onOpenOfficialLogin={handleOpenOfficialLogin}
          />
        );
      case 'register':
        return (
          <RegisterPage
            currentLang={currentLang}
            initialRole={registerRole}
            onNavigateToLogin={handleOpenLogin}
            onOpenOfficialLogin={handleOpenOfficialLogin}
          />
        );
      case 'official_login':
        return (
          <OfficialLoginPage
            currentLang={currentLang}
            onLoginSuccess={handleLoginSuccess}
            onNavigateToCitizen={handleOpenLogin}
          />
        );
      case 'reset_password':
        return (
          <ResetPasswordPage
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

  if (activeTab === 'citizen_dashboard') {
    return (
      <LocationProvider>
        <LocationPermissionModal currentLang={currentLang} />
        <CitizenDashboard
          currentLang={currentLang}
          user={currentUser}
          onSignOut={handleSignOut}
          onNavigateToTab={(tab) => handleTabChange(tab)}
        />
      </LocationProvider>
    );
  }

  return (
    <LocationProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 font-sans antialiased text-slate-900 selection:bg-emerald-200 selection:text-emerald-900">
        {/* App Location Permission Popup Window */}
        <LocationPermissionModal currentLang={currentLang} />

        {/* 1. Government Banner Header with Language Selector & Location Badge */}
        <TopHeader
          currentLang={currentLang}
          onLanguageChange={(lang) => setCurrentLang(lang)}
          onOpenContacts={() => setIsContactsOpen(true)}
          onOpenOfficialLogin={handleOpenOfficialLogin}
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
            handleTabChange(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenLogin={handleOpenLogin}
          onOpenRegister={handleOpenRegister}
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onOpenProfileSettings={() => {
            handleTabChange('profile_settings');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenOfficialLogin={handleOpenOfficialLogin}
        />

        {/* 4. Main Dynamic Page View */}
        <main className="flex-1">
          {renderCurrentView()}
        </main>

        {/* 5. Footer (Hidden on Official & Admin Dashboards) */}
        {!['super_admin_dashboard', 'collector_dashboard', 'rescue_dashboard'].includes(activeTab) && (
          <Footer
            currentLang={currentLang}
            onOpenContacts={() => setIsContactsOpen(true)}
            onOpenRegister={handleOpenRegister}
          />
        )}

        {/* Emergency Contacts Quick Modal */}
        <EmergencyContactsModal
          isOpen={isContactsOpen}
          onClose={() => setIsContactsOpen(false)}
        />
      </div>
    </LocationProvider>
  );
}

export default App;
