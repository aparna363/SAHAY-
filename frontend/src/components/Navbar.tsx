import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, ShieldCheck, LogIn, Menu, X, Settings, LogOut } from 'lucide-react';
import logoSahay from '../assets/logo_sahay.png';
import { translations } from '../translations';
import type { Language } from '../translations';

interface NavbarProps {
  currentLang: Language;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLogin: () => void;
  onOpenRegister: (role: 'citizen' | 'official') => void;
  currentUser?: any;
  onSignOut?: () => void;
  onOpenProfileSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  activeTab,
  setActiveTab,
  onOpenLogin,
  onOpenRegister,
  currentUser,
  onSignOut,
  onOpenProfileSettings,
}) => {
  const [isRegisterDropdownOpen, setIsRegisterDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const registerDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const t = translations[currentLang];

  const navItems = [
    { id: 'home', label: t.navHome },
    { id: 'weather', label: t.navWeather },
    { id: 'alerts', label: t.navAlerts },
    { id: 'live-map', label: t.navLiveMap },
    { id: 'emergency', label: t.navEmergency },
    { id: 'river-status', label: t.navRiverStatus },
    { id: 'news', label: t.navNews },
    { id: 'preparedness', label: t.navPreparedness },
    { id: 'contacts', label: t.navContacts },
  ];

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (registerDropdownRef.current && !registerDropdownRef.current.contains(event.target as Node)) {
        setIsRegisterDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRegisterClick = (role: 'citizen' | 'official') => {
    setIsRegisterDropdownOpen(false);
    setIsMobileMenuOpen(false);
    onOpenRegister(role);
  };

  return (
    <nav className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        
        {/* Left: SAHAY Brand & Logo */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {/* Circular Logo Wrapper */}
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-[#059669] p-0.5 flex items-center justify-center shadow-md overflow-hidden group-hover:scale-105 transition-transform flex-shrink-0">
            <img 
              src={logoSahay} 
              alt="SAHAY Site Logo" 
              className="w-full h-full object-cover rounded-full transform scale-110"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo_sahay.png';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-2xl tracking-tight text-[#059669]">
                SAHAY
              </span>
            </div>
            <p className="text-[11px] font-semibold text-emerald-700 tracking-tight leading-none mt-0.5">
              {currentLang === 'ml' ? 'ഒരുമിച്ച് ശക്തർ, എന്നേക്കും സുരക്ഷിതർ' : 'Stronger Together, Safer Forever'}
            </p>
          </div>
        </div>

        {/* Center: Navigation Pill Bar (Desktop) */}
        <div className="hidden lg:flex items-center bg-[#f0fdf4] border border-emerald-200/70 p-1.5 rounded-full shadow-inner">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#059669] text-white shadow-md font-bold'
                    : 'text-slate-700 hover:text-[#059669] hover:bg-emerald-100/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Right: User Profile Icon Dropdown or Guest Sign In & Register Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {currentUser ? (
            /* Logged-In User Profile Button with Dropdown */
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold border border-emerald-700 shadow-sm transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-amber-400 text-emerald-950 flex items-center justify-center font-black text-xs">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span>{currentUser.name || 'My Profile'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-amber-300 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-slide-down">
                  {/* Header Badge */}
                  <div className="p-4 bg-emerald-900 text-white border-b border-emerald-800">
                    <div className="font-extrabold text-sm text-white truncate">{currentUser.name || 'User'}</div>
                    <div className="text-[11px] text-emerald-200 font-semibold">{currentUser.phone || currentUser.email}</div>
                    <div className="mt-1.5 inline-block px-2 py-0.5 bg-amber-400 text-emerald-950 text-[10px] font-black rounded-md uppercase tracking-wider">
                      {currentUser.role || 'Citizen'}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="p-1.5 space-y-1">
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        if (onOpenProfileSettings) onOpenProfileSettings();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-[#059669] flex items-center gap-2 transition-all"
                    >
                      <Settings className="w-4 h-4 text-[#059669]" />
                      <span>Profile Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        if (onSignOut) onSignOut();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-all"
                    >
                      <LogOut className="w-4 h-4 text-red-600" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Guest View: Sign In & Register Buttons */
            <>
              {/* Login Button */}
              <button
                onClick={onOpenLogin}
                className={`btn-outline text-xs px-4 py-2 flex items-center gap-1.5 font-bold ${
                  activeTab === 'login' ? 'bg-emerald-100 border-[#059669] text-[#059669]' : ''
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t.login}</span>
              </button>

              {/* Register Button with Dropdown */}
              <div className="relative nav-dropdown" ref={registerDropdownRef}>
                <button
                  onClick={() => setIsRegisterDropdownOpen(!isRegisterDropdownOpen)}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 font-bold shadow-sm"
                  aria-haspopup="true"
                  aria-expanded={isRegisterDropdownOpen}
                >
                  <span>{t.register}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isRegisterDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isRegisterDropdownOpen && (
                  <div className="dropdown-menu animate-slide-down">
                    <div className="px-3 py-2 border-b border-slate-100 bg-emerald-50/50 rounded-t-xl">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        {currentLang === 'ml' ? 'രജിസ്ട്രേഷൻ മാതൃക തിരഞ്ഞെടുക്കുക' : 'Select Registration Type'}
                      </p>
                    </div>
                    
                    <div className="p-1">
                      {/* Option 1: Citizen Registration */}
                      <button
                        onClick={() => handleRegisterClick('citizen')}
                        className="dropdown-item group"
                      >
                        <div className="dropdown-item-icon">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm group-hover:text-emerald-700">
                            {t.citizenReg}
                          </div>
                          <div className="dropdown-desc">
                            {t.citizenRegDesc}
                          </div>
                        </div>
                      </button>

                      {/* Option 2: Official Registration */}
                      <button
                        onClick={() => handleRegisterClick('official')}
                        className="dropdown-item group"
                      >
                        <div className="dropdown-item-icon">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm group-hover:text-emerald-700">
                            {t.officialReg}
                          </div>
                          <div className="dropdown-desc">
                            {t.officialRegDesc}
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-3 animate-slide-down">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ${
                  activeTab === item.id
                    ? 'bg-[#059669] text-white font-bold'
                    : 'text-slate-700 bg-slate-50 hover:bg-emerald-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {currentUser ? (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onOpenProfileSettings) onOpenProfileSettings();
                  }}
                  className="w-full btn-primary text-xs justify-center py-2.5 font-bold flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Profile Settings</span>
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onSignOut) onSignOut();
                  }}
                  className="w-full btn-outline text-xs justify-center py-2 font-bold text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    onOpenLogin();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full btn-outline text-xs justify-center py-2.5 font-bold"
                >
                  {t.login}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleRegisterClick('citizen')}
                    className="w-full btn-primary text-xs justify-center py-2 font-bold"
                  >
                    {t.citizenReg}
                  </button>
                  <button
                    onClick={() => handleRegisterClick('official')}
                    className="w-full btn-primary text-xs justify-center py-2 font-bold bg-emerald-800 hover:bg-emerald-900"
                  >
                    {t.officialReg}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
