// src/hooks/useRefreshShortcut.ts
import { useEffect } from 'react';

export const useRefreshShortcut = (onRefresh: () => void) => {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+R or Cmd+R or F5
      if ((event.ctrlKey && event.key === 'r') || (event.metaKey && event.key === 'r') || event.key === 'F5') {
        event.preventDefault();
        onRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onRefresh]);
};
