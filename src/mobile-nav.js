// Adapted from canonical components/mobile-bottom-bar.html.
(() => {
    'use strict';

    function mountMobileBottomBar(root, options = {}) {
      if (!(root instanceof HTMLElement)) throw new TypeError('A mobile bottom bar root element is required.');

      const actionHandlers = options.actions || {};
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const mobileQuery = window.matchMedia?.('(max-width: 600px)') || null;
      const buttons = Array.from(root.querySelectorAll('.app-mobile-bottom-item'));
      const pageButtons = buttons.filter(button => button.dataset.mobilePageTarget);
      let observer = null;
      let currentPageKey = null;

      function buttonByKey(key) {
        return buttons.find(button => button.dataset.mobileKey === key) || null;
      }

      function pageEntryByKeyOrId(keyOrId) {
        const button = pageButtons.find(candidate =>
          candidate.dataset.mobileKey === keyOrId || candidate.dataset.mobilePageTarget === keyOrId
        ) || null;
        if (!button) return null;
        const page = document.getElementById(button.dataset.mobilePageTarget);
        return page ? { button, page } : null;
      }

      function setActive(key) {
        for (const button of buttons) {
          const active = button.dataset.mobileKey === key;
          button.classList.toggle('is-active', active);
          if (button.dataset.mobileTarget || button.dataset.mobilePageTarget) {
            if (active) button.setAttribute('aria-current', 'page');
            else button.removeAttribute('aria-current');
          }
        }
      }

      function setEnabled(key, enabled) {
        const button = buttonByKey(key);
        if (!button) return false;
        button.disabled = !enabled;
        return true;
      }

      function showPage(keyOrId, showOptions = {}) {
        const entry = pageEntryByKeyOrId(keyOrId);
        if (!entry) return false;

        const key = entry.button.dataset.mobileKey || entry.button.dataset.mobilePageTarget;
        for (const button of pageButtons) {
          const page = document.getElementById(button.dataset.mobilePageTarget);
          page?.classList.toggle('is-mobile-active', button === entry.button);
        }

        currentPageKey = key;
        setActive(key);

        if (mobileQuery?.matches && showOptions.scroll !== false) {
          const topTarget = document.getElementById(options.pageTopTarget || '') || entry.page;
          const top = Math.max(0, topTarget.getBoundingClientRect().top + window.scrollY - (options.pageTopOffset || 0));
          window.scrollTo({ top, behavior: showOptions.behavior || (reduceMotion ? 'auto' : 'smooth') });
        }

        if (typeof options.onPageChange === 'function') {
          options.onPageChange({ key, page: entry.page, button: entry.button });
        }
        return true;
      }

      function ensureInitialPage() {
        if (!pageButtons.length) return;
        const preferred = options.initialPage
          ? pageEntryByKeyOrId(options.initialPage)
          : null;
        const marked = pageButtons.find(button => button.classList.contains('is-active')) || pageButtons[0];
        const entry = preferred || pageEntryByKeyOrId(marked.dataset.mobileKey || marked.dataset.mobilePageTarget);
        if (entry) showPage(entry.button.dataset.mobileKey || entry.button.dataset.mobilePageTarget, { scroll: false });
      }

      async function clickHandler(event) {
        const button = event.target.closest('.app-mobile-bottom-item');
        if (!button || !root.contains(button) || button.disabled) return;

        const pageTargetId = button.dataset.mobilePageTarget;
        if (pageTargetId) {
          const key=button.dataset.mobileKey || pageTargetId;
          if (key===currentPageKey) return;
          // Recording may require an asynchronous confirmation before changing pages.
          if (options.beforePageChange && !await options.beforePageChange(key)) return;
          if (button.disabled) return;
          showPage(key);
        }

        const targetId = button.dataset.mobileTarget;
        if (targetId) {
          const target = document.getElementById(targetId);
          if (target) {
            target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            setActive(button.dataset.mobileKey || targetId);
          }
        }

        const actionName = button.dataset.mobileAction;
        const handler = actionName ? actionHandlers[actionName] : null;
        if (typeof handler === 'function') handler({ button, event });
      }

      root.addEventListener('click', clickHandler);
      ensureInitialPage();

      /* Section-scroll mode remains supported for older and action-heavy apps. */
      const targetButtons = buttons.filter(button => button.dataset.mobileTarget && !button.dataset.mobilePageTarget);
      if (options.observeSections !== false && !pageButtons.length && targetButtons.length && 'IntersectionObserver' in window) {
        const targets = targetButtons
          .map(button => ({ button, target: document.getElementById(button.dataset.mobileTarget) }))
          .filter(entry => entry.target);

        observer = new IntersectionObserver(entries => {
          const visible = entries
            .filter(entry => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (!visible) return;
          const match = targets.find(entry => entry.target === visible.target);
          if (match) setActive(match.button.dataset.mobileKey || match.button.dataset.mobileTarget);
        }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, .01, .25, .5] });

        for (const entry of targets) observer.observe(entry.target);
      }

      return Object.freeze({
        setActive,
        setEnabled,
        showPage,
        currentPage: () => currentPageKey,
        button: buttonByKey,
        destroy() {
          observer?.disconnect();
          root.removeEventListener('click', clickHandler);
        }
      });
    }

    window.AppMobileBottomBar = Object.freeze({ mount: mountMobileBottomBar });
  })();
