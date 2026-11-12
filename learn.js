/* Заучивание: раунды по 7 карточек, сначала выбор ответа, затем письменный ответ */
window.PV = window.PV || {};

(function (PV) {
  const U = PV.util;
  const Q = PV.q;
  const ROUND = 7;
  let L = null;
  let keyHandler = null;

  const deckKey = (deck) => deck.map((c) => c.id).join(',');

  function start(deck) {
    L = {
      key: deckKey(deck),
      remaining: U.shuffle(deck).map((c) => ({ c, step: 0, wrongs: 0 })),
      queue: [],
      roundNo: 0,
      total: deck.length,
      mastered: 0,
      roundMastered: [],
      cur: null,
      view: 'question', // question | round | done
      troubled: new Map(),
    };
    nextRound();
  }

  function nextRound() {
    if (!L.remaining.length) {
      L.view = 'done';
      return;
    }
    L.roundNo++;
    L.queue = L.remaining.splice(0, ROUND);
    L.queue.forEach((it) => (it.step = 0));
    L.roundMastered = [];
    L.view = 'question';
    pickNext();
  }

  function pickNext() {
    const it = L.queue[0];
    L.cur = { it, dir: PV.pickDir(), mc: null, res: null, answered: false };
    if (it.step === 0) L.cur.mc = Q.mc(it.c, L.cur.dir, 4);
  }

  /** Применить результат текущего вопроса и перейти дальше. */
  function advance() {
    const { it, res } = L.cur;
    const ok = !!(res && res.ok);
    PV.store.rec(it.c.id, ok);
    L.queue.shift();
    if (ok) {
      if (it.step === 0) {
        it.step = 1;
        L.queue.push(it);
      } else {
        L.mastered++;
        L.roundMastered.push(it.c);
      }
    } else {
      it.step = 0;
      it.wrongs++;
      L.troubled.set(it.c.id, it.c);
      L.queue.splice(Math.min(2, L.queue.length), 0, it);
    }
    if (!L.queue.length) {
      L.view = L.remaining.length ? 'round' : 'done';
    } else {
      pickNext();
    }
  }

  function render(root) {
    const deck = PV.deck();
    if (!deck.length) {
      root.innerHTML = PV.app.emptyHtml('В выбранном наборе нет карточек.');
      return;
    }
    if (!L || L.key !== deckKey(deck)) start(deck);
    draw(root);
    keyHandler = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !L || L.view !== 'question' || !L.cur) return;
      const inField = e.target.matches('input, textarea, select');
      if (!inField && /^[1-4]$/.test(e.key) && L.cur.mc && !L.cur.answered) {
        const btn = U.$$('.opt', root)[Number(e.key) - 1];
        if (btn) btn.click();
      } else if (e.key === 'Enter' && L.cur.answered && !inField) {
        e.preventDefault();
        U.$('#after', root)?.click();
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  function header() {
    const pct = L.total ? (L.mastered / L.total) * 100 : 0;
    return `
      <div class="toolbar">
        <div class="progress-text">Раунд <b>${L.roundNo}</b> · освоено <b>${L.mastered}</b> из ${L.total}</div>
        <div class="toolbar-actions"><button class="btn ghost" id="restart" type="button">↺ Начать заново</button></div>
      </div>
      <div class="bar"><div class="bar-fill ok" style="width:${pct}%"></div></div>`;
  }

  function draw(root) {
    if (L.view === 'done') return drawDone(root);
    if (L.view === 'round') return drawRound(root);
    const { it, dir, mc } = L.cur;
    const card = it.c;
    const typed = it.step === 1;
    const label = typed
      ? dir === 'en' ? 'Введите значение по-русски' : 'Введите фразовый глагол по-английски'
      : dir === 'en' ? 'Выберите правильное значение' : 'Выберите фразовый глагол';

    root.innerHTML = `
      <section class="page learn-page">
        ${header()}
        <div class="q-card">
          <div class="q-top"><span class="q-label">${label}</span><span class="q-step">${typed ? 'шаг 2 из 2 · письменно' : 'шаг 1 из 2 · выбор'}</span></div>
          <div class="q-term">${Q.termHtml(card, dir)}${dir === 'en' ? U.speakBtn(card.verb.name) : ''}</div>
          ${dir === 'en' && card.m.en ? `<p class="q-def" lang="en">${U.esc(card.m.en)}</p>` : ''}
          ${
            typed
              ? `<form class="answer" id="ansForm" autocomplete="off">
                   <input id="ans" type="text" autocapitalize="off" spellcheck="false" placeholder="Ваш ответ" aria-label="Ваш ответ" ${L.cur.answered ? 'disabled' : ''}>
                   <button class="btn primary" type="submit" ${L.cur.answered ? 'hidden' : ''}>Проверить</button>
                   <button class="btn ghost" type="button" id="hint" ${L.cur.answered ? 'hidden' : ''}>Подсказка</button>
                   <button class="btn ghost" type="button" id="dunno" ${L.cur.answered ? 'hidden' : ''}>Не знаю</button>
                 </form>`
              : `<div class="opts">${mc
                  .map((o, i) => `<button class="opt" type="button" data-i="${i}"><kbd>${i + 1}</kbd><span>${U.esc(o.text)}</span></button>`)
                  .join('')}</div>
                 <div class="row-gap"><button class="btn ghost" id="dunno" type="button">Не знаю</button></div>`
          }
          <div class="feedback" id="feedback" aria-live="polite"></div>
        </div>
      </section>`;

    U.$('#restart', root).addEventListener('click', () => {
      start(PV.deck());
      draw(root);
    });
    if (typed) bindTyped(root, card, dir);
    else bindMc(root, card, dir);
    U.$('#dunno', root)?.addEventListener('click', () => answer(root, card, dir, { ok: false, skipped: true }));
    if (L.cur.answered) showFeedback(root, card, dir);
  }

  function bindMc(root, card, dir) {
    U.$$('.opt', root).forEach((btn) =>
      btn.addEventListener('click', () => {
        if (L.cur.answered) return;
        const o = L.cur.mc[Number(btn.dataset.i)];
        L.cur.picked = Number(btn.dataset.i);
        answer(root, card, dir, { ok: o.ok });
      })
    );
    if (L.cur.answered) paintOptions(root);
  }

  function paintOptions(root) {
    U.$$('.opt', root).forEach((b, i) => {
      b.disabled = true;
      if (L.cur.mc[i].ok) b.classList.add('right');
      else if (i === L.cur.picked) b.classList.add('wrong');
    });
  }

  function bindTyped(root, card, dir) {
    const form = U.$('#ansForm', root);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (L.cur.answered) return;
      const val = U.$('#ans', root).value;
      const r = Q.check(card, dir, val);
      if (r.empty) return;
      answer(root, card, dir, Object.assign({ typed: val.trim() }, r));
    });
    U.$('#hint', root)?.addEventListener('click', () => U.toast('Подсказка: ' + Q.hint(card, dir)));
    if (!L.cur.answered && matchMedia('(hover: hover)').matches) U.$('#ans', root).focus();
  }

  function answer(root, card, dir, res) {
    L.cur.answered = true;
    L.cur.res = res;
    if (L.cur.mc) paintOptions(root);
    else {
      const inp = U.$('#ans', root);
      if (inp) inp.disabled = true;
      U.$$('#ansForm button', root).forEach((b) => (b.hidden = true));
    }
    U.$$('#dunno', root).forEach((b) => (b.hidden = true));
    showFeedback(root, card, dir);
  }

  function showFeedback(root, card, dir) {
    const r = L.cur.res;
    const box = U.$('#feedback', root);
    const correct = Q.answerText(card, dir);
    const typed = L.cur.it.step === 1;
    let html;
    if (r.ok) {
      html = `<div class="res ok">✓ ${typed ? 'Верно!' : 'Правильно!'}${r.typo ? ` Небольшая опечатка: <b>${U.esc(correct)}</b>` : ''}${r.note ? `<div class="small">${U.esc(r.note)}</div>` : ''}</div>`;
    } else {
      html = `<div class="res bad">✗ ${r.skipped ? 'Ничего страшного.' : 'Неверно.'}${r.typed ? ` Вы ввели: <b>${U.esc(r.typed)}</b>.` : ''}<div>Правильный ответ: <b>${U.esc(correct)}</b></div></div>`;
    }
    html += Q.examplesHtml(card, 2);
    html += `<div class="row-gap">${!r.ok && typed && !r.skipped ? '<button class="btn ghost" id="override" type="button">Мой ответ тоже верный</button>' : ''}<button class="btn primary" id="after" type="button">Дальше →</button></div>`;
    box.innerHTML = html;
    U.$('#override', root)?.addEventListener('click', () => {
      L.cur.res = { ok: true };
      showFeedback(root, card, dir);
      U.toast('Засчитано');
    });
    U.$('#after', root).addEventListener('click', () => {
      advance();
      draw(root);
    });
    U.$('#after', root).focus();
  }

  function drawRound(root) {
    const got = L.roundMastered;
    root.innerHTML = `
      <section class="page summary">
        ${header()}
        <div class="summary-card">
          ${PV.author.mascot('wink', 'good', 'mascot-center')}
          <h2>Раунд ${L.roundNo} завершён</h2>
          <p class="muted">Освоено в этом раунде: ${got.length}. Всего: ${L.mastered} из ${L.total}.</p>
          <ul class="chips">${got.map((c) => `<li>${U.esc(c.en)}</li>`).join('')}</ul>
          <div class="row-gap center"><button class="btn primary" id="cont" type="button">Следующий раунд →</button></div>
        </div>
      </section>`;
    U.$('#restart', root).addEventListener('click', () => {
      start(PV.deck());
      draw(root);
    });
    U.$('#cont', root).addEventListener('click', () => {
      nextRound();
      draw(root);
    });
  }

  function drawDone(root) {
    const trouble = Array.from(L.troubled.values());
    root.innerHTML = `
      <section class="page summary">
        <div class="summary-card">
          ${PV.author.mascot('super', 'great', 'mascot-center')}
          <h2>Набор выучен!</h2>
          <p class="muted">Освоено карточек: ${L.mastered}. Раундов: ${L.roundNo}.</p>
          ${
            trouble.length
              ? `<h3>Были трудности (${trouble.length})</h3><ul class="chips">${trouble.map((c) => `<li>${U.esc(c.en)}</li>`).join('')}</ul>`
              : '<p>Ни одной ошибки — отличный результат!</p>'
          }
          <div class="row-gap center">
            <button class="btn primary" id="again" type="button">Учить заново</button>
            <a class="btn" href="#test">Пройти тест</a>
          </div>
          ${PV.author.courseNudge()}
        </div>
      </section>`;
    U.$('#again', root).addEventListener('click', () => {
      start(PV.deck());
      draw(root);
    });
  }

  function destroy() {
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }

  PV.learn = {
    render,
    destroy,
    reset() {
      L = null;
    },
  };
})(window.PV);
