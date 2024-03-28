import { queryClient } from '@/utils/query-client';
import { focusManager } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';

export function FocusManager() {
  const isFocused = useSyncExternalStore(
    focusManager.subscribe,
    () => focusManager.isFocused(),
    () => focusManager.isFocused(),
  );

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    queryClient.invalidateQueries();
  }, [isFocused]);

  return null;
}
