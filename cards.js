/* Карточки: переворот, звёздочки, «знаю / не знаю», ввод ответа на английском или русском */
window.PV = window.PV || {};

(function (PV) {
  const U = PV.util;
  const Q = PV.q;
  const ui = { typing: false };
  let S = null;
  let keyHandler = null;

  function start(list, shuffle) {
    const items = shuffle ? U.shuffle(list) : list.slice();
    S = {
      list: items,
      dirs: items.map(() => PV.pickDir()),
      i: 0,
      flipped: false,
      res: null,
      known: [],
      unknown: [],
      done: false,
    };
  }

  function commit() {
    if (!S.res || S.res.committed) return;
    const card = S.list[S.i];
    PV.store.rec(card.id, S.res.ok);
    (S.res.ok ? S.known : S.unknown).push(card);
    S.res.committed = true;
  }

  function render(root) {
    const deck = PV.deck();
    if (!deck.length) {
      root.innerHTML = PV.app.emptyHtml('В выбранном наборе нет карточек.');
      return;
    }
    if (!S || S.list.some((c) => !PV.cardById[c.id]) || !sameSet(S.list, deck)) start(deck, false);
    draw(root);

    keyHandler = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const inField = e.target.matches('input, textarea, select');
      if (inField) return;
      if (S.done) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        S.flipped = !S.flipped;
        U.$('#fc', root)?.classList.toggle('flipped', S.flipped);
      } else if (e.key === 'ArrowRight') {
        go(root, 1);
      } else if (e.key === 'ArrowLeft') {
        go(root, -1);
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    const ids = new Set(b.map((c) => c.id));
    return a.every((c) => ids.has(c.id));
  }

  function go(root, step) {
    if (step > 0) {
      commit();
      if (S.i + 1 >= S.list.length) {
        S.done = true;
        draw(root);
        return;
      }
      S.i++;
    } else {
      if (S.i === 0) return;
      S.i--;
    }
    S.flipped = false;
    S.res = null;
    draw(root);
  }

  function draw(root) {
    if (S.done) return drawSummary(root);
    const card = S.list[S.i];
    const dir = S.dirs[S.i];
    const n = S.list.length;
    const star = PV.store.isStar(card.id);
    const placeholder = dir === 'en' ? 'Введите значение по-русски' : 'Введите фразовый глагол по-английски';

    root.innerHTML = `
      <section class="page flash-page">
        <div class="toolbar">
          <div class="progress-text"><b>${S.i + 1}</b> / ${n}</div>
          <div class="seg" role="group" aria-label="Направление перевода">
            ${[['en', 'EN → RU'], ['ru', 'RU → EN'], ['mix', 'Вперемешку']]
              .map(([v, t]) => `<button type="button" class="seg-btn${PV.store.settings.dir === v ? ' on' : ''}" data-dir="${v}" aria-pressed="${PV.store.settings.dir === v}">${t}</button>`)
              .join('')}
          </div>
          <div class="toolbar-actions">
            <label class="switch"><input type="checkbox" id="typing" ${ui.typing ? 'checked' : ''}><span class="switch-ui"></span><span>Вводить ответ</span></label>
            <button class="btn ghost" id="shuffle" type="button">Перемешать</button>
          </div>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${((S.i) / n) * 100}%"></div></div>

        <div class="fc-tools">
          <button class="star${star ? ' on' : ''}" id="star" type="button" aria-label="В избранное" title="В избранное">${star ? '★' : '☆'}</button>
          ${U.speakBtn(card.verb.name)}
        </div>
        <div class="flashcard${S.flipped ? ' flipped' : ''}" id="fc" tabindex="0" role="button" aria-label="Карточка. Нажмите, чтобы перевернуть">
          <div class="face front">
            <div class="face-label">${dir === 'en' ? 'English' : 'Русский'}</div>
            <div class="face-body">${Q.termHtml(card, dir)}</div>
            <div class="face-hint">нажмите или Пробел — перевернуть</div>
          </div>
          <div class="face back">
            <div class="face-label">${dir === 'en' ? 'Русский' : 'English'}</div>
            <div class="face-body">${Q.backHtml(card, dir)}</div>
          </div>
        </div>

        ${
          ui.typing
            ? `<form class="answer" id="ansForm" autocomplete="off">
                 <input id="ans" type="text" placeholder="${placeholder}" autocapitalize="off" spellcheck="false" ${S.res ? 'disabled' : ''} aria-label="Ваш ответ">
                 <button class="btn primary" type="submit" ${S.res ? 'hidden' : ''}>Проверить</button>
                 <button class="btn ghost" type="button" id="hint" ${S.res ? 'hidden' : ''}>Подсказка</button>
               </form>
               <div class="result" id="result" aria-live="polite"></div>`
            : ''
        }

        <div class="fc-controls">
          <button class="btn bad-btn" id="no" type="button"><span aria-hidden="true">✗</span> Не знаю</button>
          <button class="icon-btn lg" id="prev" type="button" aria-label="Назад" ${S.i === 0 ? 'disabled' : ''}>←</button>
          <button class="icon-btn lg" id="next" type="button" aria-label="Дальше">→</button>
          <button class="btn ok-btn" id="yes" type="button"><span aria-hidden="true">✓</span> Знаю</button>
        </div>
        <p class="muted center small">Клавиши: Пробел — перевернуть, ← → — листать</p>
      </section>`;

    bind(root, card, dir);
    if (S.res) showResult(root, card, dir);
    else if (ui.typing && matchMedia('(hover: hover)').matches) U.$('#ans', root)?.focus();
  }

  function bind(root, card, dir) {
    const fc = U.$('#fc', root);
    fc.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      S.flipped = !S.flipped;
      fc.classList.toggle('flipped', S.flipped);
    });
    U.$('#star', root).addEventListener('click', (e) => {
      const on = PV.store.toggleStar(card.id);
      e.currentTarget.classList.toggle('on', on);
      e.currentTarget.textContent = on ? '★' : '☆';
      PV.app.refreshSetCount();
    });
    U.$('#typing', root).addEventListener('change', (e) => {
      ui.typing = e.target.checked;
      S.res = null;
      draw(root);
    });
    U.$$('.seg-btn', root).forEach((b) =>
      b.addEventListener('click', () => {
        if (PV.store.settings.dir === b.dataset.dir) return;
        PV.store.set('dir', b.dataset.dir);
        for (let k = S.i; k < S.list.length; k++) S.dirs[k] = PV.pickDir();
        S.flipped = false;
        S.res = null;
        draw(root);
        U.toast({ en: 'Английский → русский', ru: 'Русский → английский', mix: 'Направление вперемешку' }[b.dataset.dir]);
      })
    );
    U.$('#shuffle', root).addEventListener('click', () => {
      start(PV.deck(), true);
      draw(root);
      U.toast('Карточки перемешаны');
    });
    U.$('#prev', root).addEventListener('click', () => go(root, -1));
    U.$('#next', root).addEventListener('click', () => go(root, 1));
    U.$('#yes', root).addEventListener('click', () => mark(root, true));
    U.$('#no', root).addEventListener('click', () => mark(root, false));

    const form = U.$('#ansForm', root);
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (S.res) return go(root, 1);
        const val = U.$('#ans', root).value;
        const r = Q.check(card, dir, val);
        if (r.empty) return U.$('#ans', root).focus();
        S.res = { ok: r.ok, typo: r.typo, note: r.note, close: r.close, typed: val.trim(), committed: false };
        S.flipped = true;
        draw(root);
      });
      U.$('#hint', root).addEventListener('click', () => {
        U.toast('Подсказка: ' + Q.hint(card, dir));
      });
    }
  }

  function showResult(root, card, dir) {
    const box = U.$('#result', root);
    if (!box || !S.res) return;
    const r = S.res;
    const correct = Q.answerText(card, dir);
    if (r.ok) {
      box.innerHTML = `<div class="res ok">✓ Верно!${r.typo ? ` Небольшая опечатка — правильно: <b>${U.esc(correct)}</b>` : ''}${r.note ? `<div class="small">${U.esc(r.note)}</div>` : ''}</div>
        <button class="btn primary" id="after" type="button">Дальше →</button>`;
    } else if (r.close) {
      box.innerHTML = `<div class="res close">🤔 Похоже, но не совпадает дословно. Вы ввели: <b>${U.esc(r.typed)}</b><div>В карточке: <b>${U.esc(correct)}</b></div><div class="small">Если смысл тот же — засчитайте себе ответ.</div></div>
        <div class="row-gap"><button class="btn ok-btn" id="override" type="button">✓ Засчитать</button>
        <button class="btn primary" id="after" type="button">Дальше →</button></div>`;
      U.$('#override', root).addEventListener('click', () => {
        S.res.ok = true;
        S.res.close = false;
        showResult(root, card, dir);
        U.toast('Засчитано');
      });
    } else {
      box.innerHTML = `<div class="res bad">✗ Вы ввели: <b>${U.esc(r.typed)}</b><div>Правильный ответ: <b>${U.esc(correct)}</b></div></div>
        <div class="row-gap"><button class="btn ghost" id="override" type="button">Мой ответ тоже верный</button>
        <button class="btn primary" id="after" type="button">Дальше →</button></div>`;
      U.$('#override', root).addEventListener('click', () => {
        S.res.ok = true;
        showResult(root, card, dir);
        U.toast('Засчитано');
      });
    }
    U.$('#after', root).addEventListener('click', () => go(root, 1));
    U.$('#after', root).focus();
  }

  function mark(root, ok) {
    if (S.res && !S.res.committed) {
      // после письменного ответа кнопки лишь подтверждают итог
      S.res.ok = ok;
    } else {
      S.res = { ok, committed: false };
    }
    go(root, 1);
  }

  function drawSummary(root) {
    const total = S.known.length + S.unknown.length;
    const pct = total ? Math.round((S.known.length / total) * 100) : 0;
    root.innerHTML = `
      <section class="page summary">
        <div class="summary-card">
          <div class="big-emoji">${pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
          <h2>Колода пройдена</h2>
          <div class="stats-row">
            <div class="stat ok"><b>${S.known.length}</b><span>знаю</span></div>
            <div class="stat bad"><b>${S.unknown.length}</b><span>учить</span></div>
            <div class="stat"><b>${pct}%</b><span>результат</span></div>
          </div>
          <div class="row-gap center">
            ${S.unknown.length ? `<button class="btn primary" id="again-unknown">Повторить незнакомые (${S.unknown.length})</button>` : ''}
            <button class="btn" id="again-all">Пройти заново</button>
            <button class="btn ghost" id="go-learn">Перейти к заучиванию</button>
          </div>
          ${
            S.unknown.length
              ? `<details class="unknown-list"><summary>Что стоит повторить</summary><ul>${S.unknown
                  .map((c) => `<li><b>${U.esc(c.en)}</b> — ${U.esc(c.full)}</li>`)
                  .join('')}</ul></details>`
              : ''
          }
        </div>
      </section>`;
    U.$('#again-unknown', root)?.addEventListener('click', () => {
      start(S.unknown, true);
      draw(root);
    });
    U.$('#again-all', root).addEventListener('click', () => {
      start(PV.deck(), true);
      draw(root);
    });
    U.$('#go-learn', root).addEventListener('click', () => (location.hash = '#learn'));
  }

  function destroy() {
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }

  PV.flash = {
    render,
    destroy,
    reset() {
      S = null;
    },
  };
})(window.PV);
