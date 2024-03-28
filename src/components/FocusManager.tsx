import { useEffect, useSyncExternalStore } from 'react';
import { focusManager } from '@tanstack/react-query';
import { queryClient } from '@/utils/query-client';

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
