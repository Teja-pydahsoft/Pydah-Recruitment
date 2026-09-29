import { lazy } from 'react';

/**
 * Enhanced React.lazy with automatic retries for chunk loading failures
 * (useful for flaky network, mobile network shifts, or fresh deployments)
 */
export function lazyWithRetry(componentImport, retriesLeft = 2, interval = 1000) {
  let factory = componentImport;
  let loadedPromise = null;

  const load = () => {
    if (!loadedPromise) {
      loadedPromise = new Promise((resolve, reject) => {
        const tryImport = (remaining) => {
          factory()
            .then(resolve)
            .catch((error) => {
              if (remaining > 0) {
                setTimeout(() => {
                  tryImport(remaining - 1);
                }, interval);
              } else {
                const key = `chunk_retry_${window.location.pathname}`;
                const hasRefreshed = sessionStorage.getItem(key);
                if (!hasRefreshed) {
                  sessionStorage.setItem(key, 'true');
                  window.location.reload();
                  return;
                }
                sessionStorage.removeItem(key);
                reject(error);
              }
            });
        };

        tryImport(retriesLeft);
      });
    }
    return loadedPromise;
  };

  const Component = lazy(load);
  Component.preload = load;
  return Component;
}

export default lazyWithRetry;
