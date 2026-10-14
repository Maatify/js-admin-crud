/** Self-contained loading overlay; one instance per page, call destroy() when done. */
export function createLoadingOverlay({ document: doc = document } = {}) {
  const el = doc.createElement('div');
  el.className = 'fixed inset-0 bg-black/40 z-[100] flex items-center justify-center hidden';
  el.innerHTML = `
<div class="flex flex-col items-center gap-3 text-white">
  <div class="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
  <span data-loading-label class="text-sm"></span>
</div>`;
  doc.body.appendChild(el);
  const label = el.querySelector('[data-loading-label]');

  return {
    element: el,
    show(text = '') {
      label.textContent = text;
      el.classList.remove('hidden');
    },
    hide() {
      el.classList.add('hidden');
    },
    destroy() {
      el.remove();
    },
  };
}
