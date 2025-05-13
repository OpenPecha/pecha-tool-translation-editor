import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/use-auth-hook';

function MatomoTracker() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? 'user-123';
  useEffect(() => {
    if (window._paq) {
      window._paq.push(['setCustomUrl', window.location.href]);
      window._paq.push(['setDocumentTitle', document.title]);
      window._paq.push(['trackPageView']);
      window._paq.push(['setUserId', userId]);
    }
  }, [location, userId]);

  return null;
}

export default MatomoTracker;
