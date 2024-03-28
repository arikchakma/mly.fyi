import { queryClient } from '@/utils/query-client';
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';

export function OnlineManager() {
  const isOnline = useSyncExternalStore(
    onlineManager.subscribe,
    () => onlineManager.isOnline(),
    () => onlineManager.isOnline(),
  );

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    queryClient.invalidateQueries();
  }, [isOnline]);

  return null;
}
