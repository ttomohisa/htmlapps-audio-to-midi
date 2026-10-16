      // Reusable Promise-based confirmation API. Canonical source: components/confirm-dialog.html.
      const AppConfirm = (() => {
        const dialog = $('#appConfirmDialog');
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
          dialog.close();
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
            dialog.showModal();
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
