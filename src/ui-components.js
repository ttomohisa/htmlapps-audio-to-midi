// Native dialogs need an explicit page lock on touch browsers. Share ownership so
// one dialog cannot unlock the page while another is still open.
const AppDialog = (() => {
  const active = new Set();
  let saved = null;
  function capture(style, names) {
    return names.map(name => [name, style.getPropertyValue(name), style.getPropertyPriority(name)]);
  }
  function restore(style, values) {
    for (const [name, value, priority] of values) {
      if (value) style.setProperty(name, value, priority);
      else style.removeProperty(name);
    }
  }
  function lock(dialog) {
    if (active.has(dialog)) return;
    if (!active.size) {
      const body = document.body, root = document.documentElement;
      const gap = Math.max(0, window.innerWidth - root.clientWidth);
      const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
      saved = { x: window.scrollX, y: window.scrollY,
        body: capture(body.style, ['position', 'top', 'left', 'width', 'overflow', 'padding-right']),
        root: capture(root.style, ['overflow', 'scroll-behavior']) };
      root.style.setProperty('overflow', 'hidden');
      root.style.setProperty('scroll-behavior', 'auto');
      for (const [name, value] of Object.entries({position:'fixed', top:`-${saved.y}px`, left:`-${saved.x}px`, width:'100%', overflow:'hidden', 'padding-right':`${padding + gap}px`})) body.style.setProperty(name, value);
    }
    active.add(dialog);
  }
  function unlock(dialog) {
    if (!active.delete(dialog) || active.size || !saved) return;
    const previous = saved; saved = null;
    restore(document.body.style, previous.body);
    restore(document.documentElement.style, previous.root);
    // Avoid the template's smooth scrolling while restoring the exact position.
    window.scrollTo({left:previous.x, top:previous.y, behavior:'instant'});
  }
  function open(dialog) {
    if (dialog.open) return;
    lock(dialog);
    try { dialog.showModal(); } catch (error) { unlock(dialog); throw error; }
  }
  function close(dialog) { dialog.close(); unlock(dialog); }
  function watch(dialog) {
    // Native Escape/close() also release the lock. Ignore delayed close events
    // from a dialog that has already been reopened.
    dialog.addEventListener('close', () => { if (!dialog.open) unlock(dialog); });
  }
  return Object.freeze({open, close, watch});
})();

      // Reusable Promise-based confirmation API. Canonical source: components/confirm-dialog.html.
      const AppConfirm = (() => {
        const dialog = $('#appConfirmDialog');
        AppDialog.watch(dialog);
        const title = $('#appConfirmTitle');
        const message = $('#appConfirmMessage');
        const closeButton = $('#appConfirmClose');
        const cancelButton = $('#appConfirmCancel');
        const okButton = $('#appConfirmOk');
        let resolver = null;
        let restoreFocus = null;

        function finish(result) {
          if (!dialog.open) return;
          const currentResolver = resolver;
          resolver = null;
          AppDialog.close(dialog);
          if (restoreFocus instanceof HTMLElement && restoreFocus.isConnected) restoreFocus.focus({ preventScroll: true });
          restoreFocus = null;
          if (currentResolver) currentResolver(result);
        }

        function ask({ title: heading, message: body, confirmLabel, cancelLabel, tone = 'default' } = {}) {
          if (dialog.open) finish(false);
          title.textContent = heading || translate('confirmTitle');
          message.textContent = body || '';
          cancelButton.textContent = cancelLabel || translate('cancel');
          okButton.textContent = confirmLabel || translate('confirmAction');
          okButton.classList.toggle('danger', tone === 'danger');
          okButton.classList.toggle('primary', tone !== 'danger');
          restoreFocus = document.activeElement;
          return new Promise(resolve => {
            resolver = resolve;
            AppDialog.open(dialog);
            requestAnimationFrame(() => cancelButton.focus({ preventScroll: true }));
          });
        }

        closeButton.addEventListener('click', () => finish(false));
        cancelButton.addEventListener('click', () => finish(false));
        okButton.addEventListener('click', () => finish(true));
        dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
        dialog.addEventListener('click', event => {
          const rect = dialog.getBoundingClientRect();
          const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
          if (outside) finish(false);
        });

        return Object.freeze({ ask });
      })();
      window.AppConfirm = AppConfirm;

      // Reusable toast / Undo API. Canonical source: components/toast.html.
      const AppToast = (() => {
        const root = $('#appToast');
        const message = $('#appToastMessage');
        const action = $('#appToastAction');
        let timer = 0;
        let actionHandler = null;
        function dismiss() {
          clearTimeout(timer);
          timer = 0;
          root.classList.remove('show');
          actionHandler = null;
        }
        function show({ message: text = '', actionLabel = '', onAction = null, duration = 3200, tone = 'default' } = {}) {
          clearTimeout(timer);
          message.textContent = String(text);
          root.dataset.tone = tone;
          actionHandler = typeof onAction === 'function' ? onAction : null;
          action.textContent = actionLabel || '';
          action.hidden = !actionHandler || !actionLabel;
          root.classList.add('show');
          if (duration > 0) timer = window.setTimeout(dismiss, duration);
          return Object.freeze({ dismiss });
        }
        action.addEventListener('click', () => {
          const handler = actionHandler;
          dismiss();
          if (handler) handler();
        });
        return Object.freeze({ show, dismiss });
      })();
      window.AppToast = AppToast;
      function showToast(messageKey, options = {}) { $('#appToastMessage').dataset.messageKey=messageKey;AppToast.show({ message:translate(messageKey), ...options }); }
