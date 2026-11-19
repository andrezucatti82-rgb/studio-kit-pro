/* History for the standalone site. The embedded Page owns its own URL. */
(() => {
  if (window.ATLAS_PAGE_MODE) return;

  const $ = id => document.getElementById(id);
  const stateKey = 'atlasNavigation';
  const panelRoutes = {
    detailDialog: ['direcao', p => AtlasApp.detail(p.styleId)],
    sequenceDialog: ['quadro', p => AtlasShell.showFrame(p.styleId, Number(p.frame))],
    guidedDialog: ['guia', p => window.AtlasGuidedFlow?.openAt(Number(p.step))],
    fontDialog: ['tipografia', () => $('openFonts').click()],
    materialsDialog: ['materiais', () => $('openMaterials').click()],
    stylePicker: ['escopo', p => window.AtlasContributions?.open(p.styleId)],
    distevenChoice: ['escolha', () => AtlasDiSteven.showChoice()],
  };
  let ready = false;
  let restoring = false;
  let scheduled = false;
  let scrollTimer;
  let knownScroll = 0;
  let current;

  function snapshot() {
    return {
      shell: AtlasShell.getNavigationState(),
      discovery: AtlasDiSteven.getNavigationState(),
      library: AtlasApp.getBrowseState(),
      panels: AtlasInlinePanels.snapshot().filter(p => panelRoutes[p.id]),
      scroll: window.scrollY,
    };
  }

  function screen(route) {
    const { shell, panels, discovery, library } = route;
    if (panels.length) return [screen({ ...route, panels: [] }), panels];
    if (shell.view !== 'library') return [shell.view, shell.stage];
    return [
      'library', discovery.mode, discovery.goal, discovery.collection, discovery.similar,
      discovery.browseGroup, discovery.browseTopic, discovery.browseDetail, discovery.niche,
      library.family, library.familyGroup, library.presenterSector, Boolean(library.query.trim()),
      discovery.mobileMenu ? [discovery.menuGroup, discovery.menuTopic] : null,
    ];
  }

  function urlFor(route) {
    const url = new URL(location.href);
    const panel = route.panels.at(-1);
    const { shell, discovery, library } = route;
    if (panel) {
      const [name] = panelRoutes[panel.id];
      const parts = [panel.styleId, panel.frame ?? panel.step].filter(value => value !== undefined);
      url.hash = parts.length ? name + '=' + parts.map(encodeURIComponent).join('/') : name;
    } else if (shell.view === 'brief') {
      url.hash = shell.stage === 'review' ? 'revisao' : 'briefSection';
    } else if (shell.view === 'help') {
      url.hash = 'instalar';
    } else if (shell.view === 'project') {
      url.hash = 'projeto';
    } else if (library.query.trim()) {
      url.hash = 'busca';
    } else if (discovery.collection || discovery.browseGroup || discovery.similar || library.family || discovery.mode === 'catalogue') {
      const parts = [
        discovery.collection || discovery.browseGroup || discovery.similar || library.family,
        discovery.browseTopic, discovery.browseDetail, discovery.niche,
      ].filter(Boolean);
      url.hash = parts.length ? 'colecao=' + parts.map(encodeURIComponent).join('/') : 'biblioteca';
    } else {
      url.hash = '';
    }
    return url;
  }

  function write(route, push = false) {
    history[push ? 'pushState' : 'replaceState']({ ...history.state, [stateKey]: route }, '', urlFor(route));
    current = route;
    knownScroll = route.scroll;
  }

  function changed() {
    if (!ready || restoring || scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (restoring) return;
      const next = snapshot();
      const push = JSON.stringify(screen(current)) !== JSON.stringify(screen(next));
      if (push && knownScroll !== current.scroll) write({ ...current, scroll: knownScroll });
      if (push || JSON.stringify(current) !== JSON.stringify(next)) write(next, push);
    });
  }

  function restore(route, linked = false) {
    restoring = true;
    clearTimeout(scrollTimer);
    scrollTimer = undefined;
    AtlasInlinePanels.reset();
    AtlasShell.restoreNavigation(route.shell);
    AtlasDiSteven.restoreNavigation(route.discovery);
    AtlasApp.restoreBrowseState(route.library);
    for (const panel of route.panels) panelRoutes[panel.id]?.[1](panel);
    if (linked) openLinkedScreen();

    // Wait for styles and the visible panel to determine the document height.
    requestAnimationFrame(() => {
      if (!linked) window.scrollTo({ top: route.scroll, behavior: 'instant' });
      restoring = false;
      write(snapshot());
    });
  }

  function openLinkedScreen() {
    const [name, value = ''] = location.hash.slice(1).split('=');
    const [id, step] = value.split('/').map(part => {
      try { return decodeURIComponent(part); } catch { return ''; }
    });
    switch (name) {
      case 'briefSection':
      case 'revisao':
        if (AtlasCurrentChoice().selectedStyles.length) {
          AtlasShell.openBrief({ stage: name === 'revisao' ? 'review' : 'briefing' });
        } else window.AtlasGuidedFlow?.open();
        break;
      case 'instalar':
        AtlasShell.view('help');
        break;
      case 'projeto':
        AtlasShell.view('project');
        break;
      case 'direcao':
        if (id) AtlasApp.detail(id);
        break;
      case 'quadro':
        if (id) AtlasShell.showFrame(id, Number(step));
        break;
      case 'guia':
        window.AtlasGuidedFlow?.openAt(Number(id));
        break;
      case 'biblioteca':
        AtlasDiSteven.showCatalogue({ preserveFilter: Boolean(AtlasApp.getBrowseState().family) });
        break;
      case 'colecao':
        AtlasDiSteven.openLinkedCollection(value.split('/').map(part => {
          try { return decodeURIComponent(part); } catch { return ''; }
        }));
        break;
    }
  }

  window.AtlasHistory = { changed };
  window.addEventListener('atlas:ready', () => {
    // Guided flow and other panels also initialize during atlas:ready.
    queueMicrotask(() => {
      ready = true;
      history.scrollRestoration = 'manual';
      if (history.state?.[stateKey]) {
        current = history.state[stateKey];
        restore(current);
      } else {
        openLinkedScreen();
        write(snapshot());
      }
    });
  });

  window.addEventListener('popstate', event => {
    if (!ready) return;
    const route = event.state?.[stateKey];
    if (route) {
      current = route;
      restore(route);
    } else {
      restore({ ...current, panels: [] }, true);
    }
  });

  document.querySelector('.skip-link')?.addEventListener('click', event => {
    const target = $(event.currentTarget.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    target.focus({ preventScroll: true });
    target.scrollIntoView();
  });

  window.addEventListener('scroll', () => {
    if (!ready || restoring || scheduled) return;
    knownScroll = window.scrollY;
    if (scrollTimer) return;
    scrollTimer = setTimeout(() => {
      scrollTimer = undefined;
      if (!restoring && current.scroll !== knownScroll) {
        write({ ...current, scroll: knownScroll });
      }
    }, 350);
  }, { passive: true });
})();
