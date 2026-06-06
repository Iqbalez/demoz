'use client';

import { useState, useEffect, useCallback } from 'react';

export function useUnsavedChanges(isDirty: boolean) {
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  // Handle hard reloads and closing tabs
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Intercept Next.js soft navigation via click events on anchor tags
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      if (!isDirty) return;
      
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      
      const href = target.getAttribute('href');
      // Skip if it's an external link or a hash link
      if (href && !href.startsWith('#') && !target.hasAttribute('target') && !href.startsWith('http')) {
        e.preventDefault();
        e.stopPropagation();
        setPendingUrl(href);
        setShowUnsavedModal(true);
      }
    };

    // Use capture phase to intercept before Next.js Link handles it
    document.addEventListener('click', handleAnchorClick, { capture: true });
    return () => document.removeEventListener('click', handleAnchorClick, { capture: true });
  }, [isDirty]);

  const confirmNavigation = useCallback(() => {
    if (pendingUrl) {
      setShowUnsavedModal(false);
      setPendingUrl(null);
      
      // Need a slight delay to allow state to flush, otherwise React complains
      setTimeout(() => {
        // Fallback to hard navigation to ensure clean state after abandoning changes
        window.location.href = pendingUrl;
      }, 10);
    }
  }, [pendingUrl]);

  const cancelNavigation = useCallback(() => {
    setShowUnsavedModal(false);
    setPendingUrl(null);
  }, []);

  return {
    showUnsavedModal,
    confirmNavigation,
    cancelNavigation
  };
}
