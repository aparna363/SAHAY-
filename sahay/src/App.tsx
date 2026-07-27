import { useState } from 'react';
import { TopHeader } from './components/TopHeader';
import { LiveAlertTicker } from './components/LiveAlertTicker';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { EmergencyQuickBar } from './components/EmergencyQuickBar';
import { LiveWeatherGrid } from './components/LiveWeatherGrid';
import { RiverDamStatus } from './components/RiverDamStatus';
import { PreparednessGuide } from './components/PreparednessGuide';
import { RegistrationModal } from './components/RegistrationModal';
import { LoginModal } from './components/LoginModal';
import { EmergencyContactsModal } from './components/EmergencyContactsModal';
import { Footer } from './components/Footer';

export function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerRole, setRegisterRole] = useState<'citizen' | 'official'>('citizen');
  const [isContactsOpen, setIsContactsOpen] = useState(false);

  const handleOpenRegister = (role: 'citizen' | 'official') => {
    setRegisterRole(role);
    setIsRegisterOpen(true);
  };

  const handleQuickAction = (actionId: string) => {
    if (actionId === 'report') {
      handleOpenRegister('citizen');
    } else if (actionId === 'shelter') {
      setActiveTab('live-map');
    } else if (actionId === 'river-status') {
      setActiveTab('river-status');
    } else if (actionId === 'bulletin') {
      setActiveTab('alerts');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans antialiased text-slate-900 selection:bg-emerald-200 selection:text-emerald-900">
      {/* 1. Government Banner Header */}
      <TopHeader onOpenContacts={() => setIsContactsOpen(true)} />

      {/* 2. Red Alert Live Ticker */}
      <LiveAlertTicker onAlertClick={() => setIsContactsOpen(true)} />

      {/* 3. Main Navbar with SAHAY logo & Register dropdown */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenRegister={handleOpenRegister}
      />

      {/* Main Page Body */}
      <main className="flex-1">
        {/* Hero Section with cyclone.png background & weather overlay */}
        <HeroSection
          onOpenAlerts={() => setIsContactsOpen(true)}
          onOpenContacts={() => setIsContactsOpen(true)}
        />

        {/* Emergency Quick Action Bar & Live Telemetry Counters */}
        <EmergencyQuickBar
          onSelectAction={handleQuickAction}
          onOpenContacts={() => setIsContactsOpen(true)}
        />

        {/* Live Weather & District Alerts Grid */}
        <div id="weather">
          <LiveWeatherGrid />
        </div>

        {/* River Water Telemetry & Dam Reservoir Status */}
        <div id="river">
          <RiverDamStatus />
        </div>

        {/* Citizen Safety & Preparedness Guidelines */}
        <div id="preparedness">
          <PreparednessGuide />
        </div>
      </main>

      {/* Footer */}
      <Footer
        onOpenContacts={() => setIsContactsOpen(true)}
        onOpenRegister={handleOpenRegister}
      />

      {/* Modals */}
      <RegistrationModal
        isOpen={isRegisterOpen}
        initialRole={registerRole}
        onClose={() => setIsRegisterOpen(false)}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />

      <EmergencyContactsModal
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
      />
    </div>
  );
}

export default App;
