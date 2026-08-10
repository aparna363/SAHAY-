import React, { useEffect, useRef, useState } from 'react';
import { googleAuthUser } from '../services/api';

const GOOGLE_CLIENT_ID = '156371610960-2immj7ahj44uk41idhsga56tnsmuitd7.apps.googleusercontent.com';

interface GoogleAuthButtonProps {
  label?: string;
  mode?: 'login' | 'register';
  onSuccess: (user: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

// Helper to decode JWT Payload from Google Credential response
function parseJwtPayload(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch (err) {
      return null;
    }
  }
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  label,
  mode = 'login',
  onSuccess,
  onError,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const defaultLabel = mode === 'register' ? 'Sign up with Google' : 'Sign in with Google';
  const buttonText = label || defaultLabel;

  const handleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) {
      if (onError) onError('Google authentication response was empty.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = parseJwtPayload(response.credential);
      const email = payload?.email || '';
      const name = payload?.name || payload?.given_name || 'Google User';
      const picture = payload?.picture || '';
      const googleId = payload?.sub || '';

      if (!email) {
        throw new Error('Unable to retrieve email from Google Account.');
      }

      const res = await googleAuthUser({
        email,
        name,
        picture,
        googleId,
        googleToken: response.credential,
      });

      onSuccess(res.user);
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      if (onError) onError(err.message || 'Google Auth failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initGoogleGsi = () => {
      if (window.google?.accounts?.id) {
        setIsScriptReady(true);
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (googleBtnRef.current) {
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: mode === 'register' ? 'signup_with' : 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
            });
          }
        } catch (e) {
          console.warn('Google GSI init note:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogleGsi();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogleGsi();
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [mode]);

  const handleCustomButtonClick = () => {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // If one-tap prompt isn't shown, trigger click on rendered button
            const iframe = googleBtnRef.current?.querySelector('iframe');
            if (iframe) {
              iframe.click();
            }
          }
        });
      } catch (e) {
        console.error('Google prompt trigger error:', e);
      }
    } else {
      if (onError) {
        onError('Google Sign-In is initializing. Please try again in a moment.');
      }
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Offscreen / Rendered Google Official Button */}
      <div
        ref={googleBtnRef}
        className="w-full flex justify-center overflow-hidden rounded-xl my-1"
        style={{ minHeight: '44px' }}
      />

      {/* Backup styled fallback button if official iframe fails to render */}
      {!isScriptReady && (
        <button
          type="button"
          onClick={handleCustomButtonClick}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer group active:scale-[0.99]"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-emerald-600 rounded-full animate-spin"></div>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{buttonText}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
