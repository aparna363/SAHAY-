import React, { useState, useEffect } from 'react';
import { ReliefLandingView } from './ReliefLandingView';
import { ReliefApplicationForm } from './ReliefApplicationForm';
import { ReliefClaimDetailView } from './ReliefClaimDetailView';
import { ReliefHowItWorksModal } from './ReliefHowItWorksModal';
import { ReliefAcknowledgementModal } from './ReliefAcknowledgementModal';
import type { ReliefClaim } from '../../services/api';

interface ReliefModuleProps {
  user: any;
  initialView?: 'landing' | 'apply' | 'detail';
  initialClaimId?: string;
  onNavigateToTab?: (tab: string) => void;
}

function parseRouteFromLocation(): { view: 'landing' | 'apply' | 'detail'; claimId: string; draftId: string | null } {
  const hash = window.location.hash || '';
  const pathname = window.location.pathname || '';
  const search = window.location.search || '';

  if (hash.includes('/apply') || pathname.includes('/apply')) {
    const draftMatch = hash.match(/draft=([^&]+)/) || search.match(/draft=([^&]+)/);
    return {
      view: 'apply',
      claimId: '',
      draftId: draftMatch ? decodeURIComponent(draftMatch[1]) : null
    };
  }

  // Matches /relief-fund/SAH-RLF-2026-000004 or /relief-fund/:id
  const claimMatch = hash.match(/relief-fund\/([A-Za-z0-9\-_]+)/) || pathname.match(/relief-fund\/([A-Za-z0-9\-_]+)/);
  if (claimMatch && claimMatch[1] && claimMatch[1] !== 'apply') {
    return {
      view: 'detail',
      claimId: decodeURIComponent(claimMatch[1]),
      draftId: null
    };
  }

  return {
    view: 'landing',
    claimId: '',
    draftId: null
  };
}

export const ReliefModule: React.FC<ReliefModuleProps> = ({
  user,
  initialView,
  initialClaimId,
  onNavigateToTab: _onNavigateToTab
}) => {
  const initialRoute = parseRouteFromLocation();
  const [currentView, setCurrentView] = useState<'landing' | 'apply' | 'detail'>(() => {
    if (initialClaimId) return 'detail';
    if (initialView) return initialView;
    return initialRoute.view;
  });
  const [selectedClaimId, setSelectedClaimId] = useState<string>(() => {
    return initialClaimId || initialRoute.claimId;
  });
  const [draftClaimId, setDraftClaimId] = useState<string | null>(() => {
    return initialRoute.draftId;
  });
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [acknowledgedClaim, setAcknowledgedClaim] = useState<ReliefClaim | null>(null);
  const [isAckModalOpen, setIsAckModalOpen] = useState(false);

  // Sync with browser URL / history (both hashchange and popstate)
  useEffect(() => {
    const handleUrlChange = () => {
      const route = parseRouteFromLocation();
      setCurrentView(route.view);
      if (route.claimId) {
        setSelectedClaimId(route.claimId);
      }
      if (route.draftId !== undefined) {
        setDraftClaimId(route.draftId);
      }
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const handleApplyClick = () => {
    setDraftClaimId(null);
    setCurrentView('apply');
    window.location.hash = '/citizen/relief-fund/apply';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContinueDraft = (draftId: string) => {
    setDraftClaimId(draftId);
    setCurrentView('apply');
    window.location.hash = `/citizen/relief-fund/apply?draft=${draftId}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewClaim = (claimId: string) => {
    setSelectedClaimId(claimId);
    setCurrentView('detail');
    window.location.hash = `/citizen/relief-fund/${claimId}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitSuccess = (submittedClaim: ReliefClaim) => {
    setAcknowledgedClaim(submittedClaim);
    setIsAckModalOpen(true);
    setSelectedClaimId(submittedClaim.claim_id);
    setCurrentView('detail');
    window.location.hash = `/citizen/relief-fund/${submittedClaim.claim_id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full">
      {currentView === 'landing' && (
        <ReliefLandingView
          user={user}
          onApplyClick={handleApplyClick}
          onViewClaim={handleViewClaim}
          onContinueDraft={handleContinueDraft}
          onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
          onViewHistory={() => setCurrentView('landing')}
        />
      )}

      {currentView === 'apply' && (
        <ReliefApplicationForm
          user={user}
          initialDraftId={draftClaimId}
          onBackToLanding={() => {
            setCurrentView('landing');
            window.location.hash = '/citizen/relief-fund';
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSubmitSuccess={handleSubmitSuccess}
        />
      )}

      {currentView === 'detail' && (
        <ReliefClaimDetailView
          claimId={selectedClaimId}
          user={user}
          onBack={() => {
            setCurrentView('landing');
            window.location.hash = '/citizen/relief-fund';
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onResubmit={(_oldClaim) => {
            setDraftClaimId(null);
            setCurrentView('apply');
            window.location.hash = '/citizen/relief-fund/apply';
          }}
        />
      )}

      {/* How It Works Guidance Modal */}
      <ReliefHowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        onApplyClick={handleApplyClick}
      />

      {/* Digital Acknowledgement Modal */}
      <ReliefAcknowledgementModal
        isOpen={isAckModalOpen}
        claim={acknowledgedClaim}
        onClose={() => setIsAckModalOpen(false)}
      />
    </div>
  );
};
