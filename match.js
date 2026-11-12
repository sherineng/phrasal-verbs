/* Подбор: найдите пары «глагол — значение» как можно быстрее */
window.PV = window.PV || {};

(function (PV) {
  const U = PV.util;
  const Q = PV.q;
  const PAIRS = 6;
  let timerId = null;
  let G = null;

  function newGame(deck) {
    const cards = Q.sampleUnique(deck, PAIRS);
    const tiles = U.shuffle(
      cards.flatMap((c) => [
        { key: c.id + ':en', pair: c.id, text: c.en, lang: 'en' },
        { key: c.id + ':ru', pair: c.id, text: c.full, lang: 'ru' },
      ])
    );
    G = { cards, tiles, sel: null, done: new Set(), mistakes: 0, t0: 0, elapsed: 0, finished: false };
  }

  function render(root) {
    const deck = PV.deck();
    if (deck.length < 3) {
      root.innerHTML = PV.app.emptyHtml('Для игры нужно хотя бы 3 карточки в наборе.');
      return;
    }
    if (!G) newGame(deck);
    draw(root);
  }

  function draw(root) {
    const best = PV.store.best.match;
    if (G.finished) return drawFinish(root, best);
    root.innerHTML = `
      <section class="page match-page">
        <div class="toolbar">
          <div class="progress-text">Пар найдено: <b id="found">${G.done.size}</b> / ${G.cards.length}</div>
          <div class="timer" id="timer" aria-live="off">${G.t0 ? U.fmtTime(Date.now() - G.t0) : '0.0 с'}</div>
          <div class="toolbar-actions"><button class="btn ghost" id="restart" type="button">↺ Заново</button></div>
        </div>
        <p class="muted center">Нажмите на глагол и на его значение. ${best ? `Рекорд: <b>${U.fmtTime(best)}</b>` : ''}</p>
        <div class="tiles" id="tiles">
          ${G.tiles
            .map(
              (t) =>
                `<button type="button" class="tile ${t.lang}${G.done.has(t.pair) ? ' gone' : ''}" data-key="${U.esc(t.key)}" ${G.done.has(t.pair) ? 'disabled' : ''}>${U.esc(t.text)}</button>`
            )
            .join('')}
        </div>
      </section>`;
    U.$('#restart', root).addEventListener('click', () => {
      stopTimer();
      newGame(PV.deck());
      draw(root);
    });
    U.$('#tiles', root).addEventListener('click', (e) => {
      const b = e.target.closest('.tile');
      if (b) pick(root, b);
    });
  }

  function startTimer(root) {
    G.t0 = Date.now();
    stopTimer();
    timerId = setInterval(() => {
      const el = U.$('#timer', root);
      if (!el) return stopTimer();
      el.textContent = U.fmtTime(Date.now() - G.t0);
    }, 100);
  }
  function stopTimer() {
    clearInterval(timerId);
    timerId = null;
  }

  function pick(root, btn) {
    if (!G.t0) startTimer(root);
    const tile = G.tiles.find((t) => t.key === btn.dataset.key);
    if (!G.sel) {
      G.sel = { tile, btn };
      btn.classList.add('selected');
      return;
    }
    if (G.sel.btn === btn) {
      btn.classList.remove('selected');
      G.sel = null;
      return;
    }
    const first = G.sel;
    G.sel = null;
    first.btn.classList.remove('selected');
    if (first.tile.pair === tile.pair && first.tile.lang !== tile.lang) {
      G.done.add(tile.pair);
      PV.store.rec(tile.pair, true);
      [first.btn, btn].forEach((b) => {
        b.classList.add('right');
        setTimeout(() => {
          b.classList.add('gone');
          b.disabled = true;
        }, 350);
      });
      const f = U.$('#found', root);
      if (f) f.textContent = G.done.size;
      if (G.done.size === G.cards.length) {
        stopTimer();
        G.elapsed = Date.now() - G.t0 + G.mistakes * 1000;
        G.finished = true;
        setTimeout(() => draw(root), 600);
      }
    } else {
      G.mistakes++;
      PV.store.rec(first.tile.pair, false);
      [first.btn, btn].forEach((b) => {
        b.classList.add('wrong');
        setTimeout(() => b.classList.remove('wrong'), 450);
      });
    }
  }

  function drawFinish(root, best) {
    const isBest = !best || G.elapsed < best;
    if (isBest) PV.store.setBest('match', G.elapsed);
    root.innerHTML = `
      <section class="page summary">
        <div class="summary-card">
          ${PV.author.mascot(isBest ? 'super' : 'wink', isBest ? 'great' : 'good', 'mascot-center')}
          <h2>${U.fmtTime(G.elapsed)}</h2>
          <p class="muted">Ошибок: ${G.mistakes} (каждая добавляет 1 секунду). ${isBest ? 'Новый рекорд!' : `Рекорд: ${U.fmtTime(best)}`}</p>
          <ul class="pairs">${G.cards.map((c) => `<li><b>${U.esc(c.en)}</b> — ${U.esc(c.full)}</li>`).join('')}</ul>
          <div class="row-gap center"><button class="btn primary" id="again" type="button">Играть ещё</button></div>
        </div>
      </section>`;
    U.$('#again', root).addEventListener('click', () => {
      newGame(PV.deck());
      draw(root);
    });
  }

  PV.match = {
    render,
    destroy() {
      stopTimer();
    },
    reset() {
      stopTimer();
      G = null;
    },
  };
})(window.PV);
