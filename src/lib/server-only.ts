if (typeof window !== 'undefined' && !import.meta.env.SSR) {
  throw new Error('This file should only be imported on the server');
}
