/**
 * Automatically attaches data-label attributes to all <td> elements based on 
 * their corresponding <th> header text across every section of the application.
 * This powers the responsive mobile card transformation without needing 
 * hardcoded data-label attributes in every component.
 */
export const initMobileTableCards = () => {
  if (typeof window === 'undefined') return;

  const syncTableLabels = () => {
    try {
      const tables = document.querySelectorAll('table');
      tables.forEach((table) => {
        // Collect visible column headers
        const headerCells = Array.from(table.querySelectorAll('thead th'));
        if (headerCells.length === 0) return;
        const labels = headerCells.map((th) => th.textContent.trim());

        // Assign data-label to each row's cells
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach((row) => {
          const cells = row.querySelectorAll('td');
          cells.forEach((td, idx) => {
            // Skip colspan cells
            if (td.hasAttribute('colspan')) return;
            const label = labels[idx];
            if (label && td.getAttribute('data-label') !== label) {
              td.setAttribute('data-label', label);
            }
          });
        });
      });
    } catch (e) {
      // Safe guard against unexpected DOM errors
    }
  };

  // Immediate sync on load & resize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncTableLabels);
  } else {
    syncTableLabels();
  }
  window.addEventListener('resize', syncTableLabels);

  // Dynamic observer for React route transitions & async data rendering
  if (typeof MutationObserver !== 'undefined') {
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(syncTableLabels, 50);
    });

    const startObserving = () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
        syncTableLabels();
      }
    };

    if (document.body) {
      startObserving();
    } else {
      window.addEventListener('DOMContentLoaded', startObserving);
    }
  }
};
