/* Каркас приложения: маршрутизация, тема, окно «Что учить» */
window.PV = window.PV || {};

(function (PV) {
  const U = PV.util;
  const routes = {
    search: PV.search,
    cards: PV.flash,
    learn: PV.learn,
    context: PV.context,
    test: PV.test,
    match: PV.match,
    about: PV.author.about,
  };
  let current = null;
  let currentId = '';

  /* ---------- тема ---------- */
  function applyTheme() {
    const t = PV.store.settings.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  /* ---------- маршрутизация ---------- */
  function route() {
    const hash = (location.hash || '#search').slice(1).split('?')[0];
    const id = routes[hash] ? hash : 'search';
    if (current && current.destroy) current.destroy();
    current = routes[id];
    currentId = id;
    U.$$('#tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === id));
    U.$('#setBtn').hidden = id === 'search' || id === 'about';
    const view = U.$('#view');
    view.innerHTML = '';
    view.classList.add('enter');
    setTimeout(() => view.classList.remove('enter'), 300);
    current.render(view);
    window.scrollTo(0, 0);
    refreshSetCount();
  }

  function refreshSetCount() {
    const n = PV.deck().length;
    U.$('#setCount').textContent = n;
    U.$('#setWord').textContent = U.plural(n, 'карточка', 'карточки', 'карточек');
  }

  function resetSessions() {
    ['flash', 'learn', 'test', 'match', 'context'].forEach((k) => PV[k] && PV[k].reset && PV[k].reset());
  }

  /* ---------- окно «Что учить» ---------- */
  function openSetModal() {
    const root = U.$('#modalRoot');
    const s = PV.store.settings;
    const cnt = {
      all: PV.cards.length,
      starred: PV.cards.filter((c) => PV.store.isStar(c.id)).length,
      unlearned: PV.cards.filter((c) => !PV.store.isLearned(c.id)).length,
      mistakes: PV.cards.filter((c) => PV.store.hasMistakes(c.id)).length,
    };
    const radio = (name, val, label, extra = '') =>
      `<label class="radio-line"><input type="radio" name="${name}" value="${val}" ${String(s[name === 'scope' ? 'scope' : 'dir']) === val ? 'checked' : ''}><span>${label}</span>${extra}</label>`;

    root.innerHTML = `
      <div class="modal-backdrop" id="backdrop">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle">
          <div class="modal-head"><h2 id="mTitle">Что учить</h2><button class="icon-btn" id="mClose" type="button" aria-label="Закрыть">✕</button></div>
          <div class="modal-body">
            <h3>Язык вопроса</h3>
            <div class="radio-group">
              ${radio('dir', 'en', 'Показывать английский — отвечать по-русски')}
              ${radio('dir', 'ru', 'Показывать русский — отвечать по-английски')}
              ${radio('dir', 'mix', 'Вперемешку')}
            </div>
            <h3>Набор карточек</h3>
            <div class="radio-group">
              ${radio('scope', 'all', 'Все значения', `<small>${cnt.all}</small>`)}
              ${radio('scope', 'starred', '★ Избранные', `<small>${cnt.starred}</small>`)}
              ${radio('scope', 'unlearned', 'Ещё не выученные', `<small>${cnt.unlearned}</small>`)}
              ${radio('scope', 'mistakes', 'С ошибками', `<small>${cnt.mistakes}</small>`)}
            </div>
            <h3>Базовые глаголы <small class="muted">(не выбрано = все)</small></h3>
            <div class="row-gap"><button class="btn ghost sm" id="gAll" type="button">Выбрать все</button><button class="btn ghost sm" id="gNone" type="button">Сбросить</button></div>
            <div class="group-chips" id="groupChips">
              ${PV.groups
                .map(
                  (g) =>
                    `<button type="button" class="gchip${s.groups.includes(g.name) ? ' on' : ''}" data-g="${U.esc(g.name)}">${U.esc(g.name)} <small>${g.count}</small></button>`
                )
                .join('')}
            </div>
            <div class="modal-progress">Выучено: <b>${PV.store.learnedCount()}</b> из ${PV.cards.length}
              <button class="link-btn" id="resetProg" type="button">сбросить прогресс</button></div>
          </div>
          <div class="modal-foot"><span id="mCount" class="muted"></span><button class="btn primary" id="mDone" type="button">Готово</button></div>
        </div>
      </div>`;

    const upd = () => {
      const n = PV.deck().length;
      U.$('#mCount').textContent = `В наборе: ${n} ${U.plural(n, 'карточка', 'карточки', 'карточек')}`;
      refreshSetCount();
    };
    upd();

    U.$$('input[name="dir"]', root).forEach((r) => r.addEventListener('change', () => { PV.store.set('dir', r.value); upd(); }));
    U.$$('input[name="scope"]', root).forEach((r) => r.addEventListener('change', () => { PV.store.set('scope', r.value); upd(); }));
    U.$('#groupChips', root).addEventListener('click', (e) => {
      const b = e.target.closest('.gchip');
      if (!b) return;
      const cur = PV.store.settings.groups.slice();
      const i = cur.indexOf(b.dataset.g);
      if (i >= 0) cur.splice(i, 1);
      else cur.push(b.dataset.g);
      PV.store.set('groups', cur);
      b.classList.toggle('on', i < 0);
      upd();
    });
    U.$('#gAll', root).addEventListener('click', () => {
      PV.store.set('groups', PV.groups.map((g) => g.name));
      U.$$('.gchip', root).forEach((b) => b.classList.add('on'));
      upd();
    });
    U.$('#gNone', root).addEventListener('click', () => {
      PV.store.set('groups', []);
      U.$$('.gchip', root).forEach((b) => b.classList.remove('on'));
      upd();
    });
    U.$('#resetProg', root).addEventListener('click', () => {
      if (confirm('Сбросить прогресс заучивания? Избранные карточки сохранятся.')) {
        PV.store.resetProgress();
        closeModal(true);
        openSetModal();
      }
    });

    const close = () => closeModal(true);
    U.$('#mDone', root).addEventListener('click', close);
    U.$('#mClose', root).addEventListener('click', close);
    U.$('#backdrop', root).addEventListener('mousedown', (e) => {
      if (e.target.id === 'backdrop') close();
    });
    document.addEventListener('keydown', escHandler);
    U.$('#mDone', root).focus();
  }

  function escHandler(e) {
    if (e.key === 'Escape') closeModal(true);
  }

  function closeModal(rerender) {
    document.removeEventListener('keydown', escHandler);
    const root = U.$('#modalRoot');
    if (!root.firstChild) return;
    root.innerHTML = '';
    if (rerender) {
      resetSessions();
      route();
    }
  }

  /* ---------- общее ---------- */
  PV.app = {
    refreshSetCount,
    openSetModal,
    emptyHtml: (msg) => `
      <section class="page"><div class="empty">
        <div class="empty-emoji">📭</div>
        <p>${U.esc(msg)}</p>
        <button class="btn primary" type="button" data-open-set>Выбрать набор</button>
      </div></section>`,
  };

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-set]')) openSetModal();
  });

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    U.$('#footerRoot').innerHTML = PV.author.footer();
    U.$('#setBtn').addEventListener('click', openSetModal);
    U.$('#themeBtn').addEventListener('click', () => {
      const order = ['auto', 'dark', 'light'];
      const next = order[(order.indexOf(PV.store.settings.theme) + 1) % order.length];
      PV.store.set('theme', next);
      applyTheme();
      U.toast({ auto: 'Тема: как в системе', dark: 'Тема: тёмная', light: 'Тема: светлая' }[next]);
    });
    window.addEventListener('hashchange', route);
    route();
  });
})(window.PV);
