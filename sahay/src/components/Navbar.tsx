import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, ShieldCheck, LogIn, Menu, X } from 'lucide-react';
import logoSahay from '../assets/logo_sahay.png';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLogin: () => void;
  onOpenRegister: (role: 'citizen' | 'official') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenLogin,
  onOpenRegister,
}) => {
  const [isRegisterDropdownOpen, setIsRegisterDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'weather', label: 'Weather' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'live-map', label: 'Live Map' },
    { id: 'emergency', label: 'Emergency' },
    { id: 'river-status', label: 'River Status' },
    { id: 'news', label: 'News' },
    { id: 'preparedness', label: 'Preparedness' },
    { id: 'contacts', label: 'Contacts' },
  ];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRegisterDropdownOpen(false);
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
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200/80 p-1 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
            <img 
              src={logoSahay} 
              alt="SAHAY Site Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback if image fails
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
              Stronger Together, Safer Forever
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

        {/* Right: Login & Register Dropdown Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Login Button */}
          <button
            onClick={onOpenLogin}
            className="btn-outline text-xs px-4 py-2 flex items-center gap-1.5 font-bold"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login</span>
          </button>

          {/* Register Button with Dropdown */}
          <div className="relative nav-dropdown" ref={dropdownRef}>
            <button
              onClick={() => setIsRegisterDropdownOpen(!isRegisterDropdownOpen)}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 font-bold shadow-sm"
              aria-haspopup="true"
              aria-expanded={isRegisterDropdownOpen}
            >
              <span>Register</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isRegisterDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isRegisterDropdownOpen && (
              <div className="dropdown-menu animate-slide-down">
                <div className="px-3 py-2 border-b border-slate-100 bg-emerald-50/50 rounded-t-xl">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Select Registration Type
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
                        Citizen Registration
                      </div>
                      <div className="dropdown-desc">
                        For general public, residents & volunteers
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
                        Official Registration
                      </div>
                      <div className="dropdown-desc">
                        For government officials & response teams
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
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
            <button
              onClick={() => {
                onOpenLogin();
                setIsMobileMenuOpen(false);
              }}
              className="w-full btn-outline text-xs justify-center py-2.5 font-bold"
            >
              Login to Account
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleRegisterClick('citizen')}
                className="w-full btn-primary text-xs justify-center py-2 font-bold"
              >
                Citizen Reg
              </button>
              <button
                onClick={() => handleRegisterClick('official')}
                className="w-full btn-primary text-xs justify-center py-2 font-bold bg-emerald-800 hover:bg-emerald-900"
              >
                Official Reg
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
