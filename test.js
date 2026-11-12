/* Тест: выбор ответа, верно/неверно, письменный ответ, сопоставление */
window.PV = window.PV || {};

(function (PV) {
  const U = PV.util;
  const Q = PV.q;
  const cfg = { count: 20, types: { mc: true, tf: true, written: true, match: true } };
  let T = null; // {questions, submitted}

  const TYPE_NAMES = { mc: 'Выбор ответа', tf: 'Верно / неверно', written: 'Письменный ответ', match: 'Сопоставление' };

  function build(deck) {
    const enabled = Object.keys(cfg.types).filter((k) => cfg.types[k]);
    const pool = U.shuffle(deck).slice(0, Math.min(cfg.count, deck.length));
    const questions = [];
    let rest = pool.slice();

    if (enabled.includes('match') && rest.length >= 4) {
      // один блок сопоставления: до 6 пар с разными значениями
      const group = Q.sampleUnique(rest, Math.min(6, rest.length));
      if (group.length >= 4) {
        const ids = new Set(group.map((c) => c.id));
        rest = rest.filter((c) => !ids.has(c.id));
        questions.push({ type: 'match', cards: group, opts: U.shuffle(group.map((c) => c.full)) });
      }
    }
    const others = enabled.filter((t) => t !== 'match');
    const types = others.length ? others : ['mc'];
    rest.forEach((card, i) => {
      const type = types[i % types.length];
      const dir = PV.pickDir();
      if (type === 'mc') questions.push({ type, card, dir, opts: Q.mc(card, dir, 4) });
      else if (type === 'tf') {
        const truth = Math.random() < 0.5;
        let shown = Q.answerText(card, dir);
        if (!truth) {
          const wrong = Q.mc(card, dir, 2).find((o) => !o.ok);
          if (wrong) shown = wrong.text;
        }
        questions.push({ type, card, dir, shown, truth });
      } else questions.push({ type, card, dir });
    });
    T = { questions: U.shuffle(questions), submitted: false };
  }

  function qHtml(q, i) {
    const head = `<div class="tq-head"><span class="tq-num">${i + 1}</span><span class="tq-type">${TYPE_NAMES[q.type]}</span></div>`;
    if (q.type === 'match') {
      return `<article class="tq" data-i="${i}">${head}
        <p class="tq-ask">Сопоставьте фразовые глаголы со значениями</p>
        <div class="match-rows">${q.cards
          .map(
            (c, k) => `<div class="match-row"><span class="mr-term">${U.esc(c.en)}</span>
              <select data-k="${k}" aria-label="Значение для ${U.esc(c.en)}"><option value="">— выберите —</option>${q.opts
                .map((o) => `<option value="${U.esc(o)}">${U.esc(o)}</option>`)
                .join('')}</select></div>`
          )
          .join('')}</div></article>`;
    }
    const term = `<div class="q-term">${Q.termHtml(q.card, q.dir)}</div>`;
    if (q.type === 'mc') {
      return `<article class="tq" data-i="${i}">${head}
        <p class="tq-ask">${q.dir === 'en' ? 'Выберите значение' : 'Выберите фразовый глагол'}</p>${term}
        <div class="opts">${q.opts
          .map((o, k) => `<label class="opt radio"><input type="radio" name="q${i}" value="${k}"><span>${U.esc(o.text)}</span></label>`)
          .join('')}</div></article>`;
    }
    if (q.type === 'tf') {
      return `<article class="tq" data-i="${i}">${head}
        <p class="tq-ask">Верно ли соответствие?</p>${term}
        <div class="tf-answer"><span class="tf-arrow">=</span><span class="tf-shown">${U.esc(q.shown)}</span></div>
        <div class="opts two">
          <label class="opt radio"><input type="radio" name="q${i}" value="1"><span>Верно</span></label>
          <label class="opt radio"><input type="radio" name="q${i}" value="0"><span>Неверно</span></label>
        </div></article>`;
    }
    return `<article class="tq" data-i="${i}">${head}
      <p class="tq-ask">${q.dir === 'en' ? 'Введите значение по-русски' : 'Введите фразовый глагол по-английски'}</p>${term}
      <input class="written" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ваш ответ" aria-label="Ваш ответ"></article>`;
  }

  function renderConfig(root, deck) {
    const max = deck.length;
    const count = Math.min(cfg.count, max);
    root.innerHTML = `
      <section class="page">
        <div class="panel">
          <h2>Тест</h2>
          <p class="muted">В наборе ${max} ${U.plural(max, 'карточка', 'карточки', 'карточек')}. Тест собирается случайно из выбранного набора.</p>
          <label class="field"><span>Количество вопросов: <b id="cntLabel">${count}</b></span>
            <input type="range" id="cnt" min="${Math.min(4, max)}" max="${Math.max(max, 4)}" value="${count}" ${max < 5 ? 'disabled' : ''}></label>
          <fieldset class="field"><legend>Типы вопросов</legend>
            ${Object.keys(TYPE_NAMES)
              .map((k) => `<label class="check"><input type="checkbox" data-type="${k}" ${cfg.types[k] ? 'checked' : ''}> ${TYPE_NAMES[k]}</label>`)
              .join('')}
          </fieldset>
          <p class="muted small">Язык вопроса (английский, русский или оба) выбирается в настройках набора — кнопка «Набор» вверху.</p>
          <button class="btn primary lg" id="go" type="button">Начать тест</button>
        </div>
      </section>`;
    const cnt = U.$('#cnt', root);
    cnt.addEventListener('input', () => {
      cfg.count = Number(cnt.value);
      U.$('#cntLabel', root).textContent = cnt.value;
    });
    U.$$('[data-type]', root).forEach((cb) =>
      cb.addEventListener('change', () => {
        cfg.types[cb.dataset.type] = cb.checked;
        if (!Object.values(cfg.types).some(Boolean)) {
          cfg.types.mc = true;
          cb.checked = cb.dataset.type === 'mc';
          U.$('[data-type="mc"]', root).checked = true;
        }
      })
    );
    U.$('#go', root).addEventListener('click', () => {
      cfg.count = Number(cnt.value);
      build(deck);
      renderTest(root);
    });
  }

  function renderTest(root) {
    root.innerHTML = `
      <section class="page test-page">
        <div class="toolbar"><div class="progress-text">Вопросов: <b>${T.questions.length}</b></div>
          <div class="toolbar-actions"><button class="btn ghost" id="cancel" type="button">Выйти</button></div></div>
        <form id="testForm" autocomplete="off">
          ${T.questions.map(qHtml).join('')}
          <div class="submit-wrap"><button class="btn primary lg" type="submit">Проверить ответы</button></div>
        </form>
      </section>`;
    U.$('#cancel', root).addEventListener('click', () => {
      T = null;
      render(root);
    });
    U.$('#testForm', root).addEventListener('submit', (e) => {
      e.preventDefault();
      grade(root);
    });
    window.scrollTo({ top: 0 });
  }

  function grade(root) {
    const results = [];
    T.questions.forEach((q, i) => {
      const el = U.$(`.tq[data-i="${i}"]`, root);
      if (q.type === 'match') {
        const sels = U.$$('select', el);
        let good = 0;
        const detail = q.cards.map((c, k) => {
          const val = sels[k].value;
          const ok = val === c.full;
          if (ok) good++;
          PV.store.rec(c.id, ok);
          return { c, val, ok };
        });
        results.push({ i, ok: good === q.cards.length, part: [good, q.cards.length], detail });
        return;
      }
      let ok = false;
      let given = '';
      let chk = null;
      const prevStreak = PV.store.streakOf(q.card.id);
      if (q.type === 'mc') {
        const r = U.$(`input[name="q${i}"]:checked`, el);
        given = r ? q.opts[Number(r.value)].text : '';
        ok = !!r && q.opts[Number(r.value)].ok;
      } else if (q.type === 'tf') {
        const r = U.$(`input[name="q${i}"]:checked`, el);
        given = r ? (r.value === '1' ? 'Верно' : 'Неверно') : '';
        ok = !!r && (r.value === '1') === q.truth;
      } else {
        given = U.$('.written', el).value.trim();
        chk = Q.check(q.card, q.dir, given);
        ok = chk.ok;
      }
      PV.store.rec(q.card.id, ok);
      results.push({ i, ok, given, close: !!(chk && chk.close), note: chk && chk.note, written: q.type === 'written', prevStreak });
    });
    T.submitted = true;
    T.results = results;
    renderResults(root);
  }

  function renderResults(root) {
    let score = 0;
    let max = 0;
    T.results.forEach((r) => {
      if (r.part) {
        score += r.part[0];
        max += r.part[1];
      } else {
        score += r.ok ? 1 : 0;
        max += 1;
      }
    });
    const pct = max ? Math.round((score / max) * 100) : 0;
    const wrongCards = [];
    const items = T.results
      .map((r) => {
        const q = T.questions[r.i];
        let body;
        if (q.type === 'match') {
          body = `<div class="match-rows">${r.detail
            .map(
              (d) => `<div class="match-row ${d.ok ? 'ok' : 'bad'}"><span class="mr-term">${U.esc(d.c.en)}</span>
              <span>${d.ok ? '✓ ' + U.esc(d.c.full) : `✗ ${U.esc(d.val || '—')} <small>→ ${U.esc(d.c.full)}</small>`}</span></div>`
            )
            .join('')}</div>`;
          r.detail.filter((d) => !d.ok).forEach((d) => wrongCards.push(d.c));
        } else {
          const correct = q.type === 'tf' ? (q.truth ? 'Верно' : 'Неверно') : Q.answerText(q.card, q.dir);
          body = `<div class="q-term">${Q.termHtml(q.card, q.dir)}</div>
            ${q.type === 'tf' ? `<div class="tf-answer"><span class="tf-arrow">=</span><span class="tf-shown">${U.esc(q.shown)}</span></div>` : ''}
            <div class="res ${r.ok ? 'ok' : r.close ? 'close' : 'bad'}">${r.ok ? '✓' : r.close ? '🤔' : '✗'} Ваш ответ: <b>${U.esc(r.given || '—')}</b>${
              r.credited ? ' <span class="small">(засчитано вами)</span>' : ''
            }${r.ok && r.note ? `<div class="small">${U.esc(r.note)}</div>` : ''}${
            r.ok ? '' : `<div>Правильно: <b>${U.esc(correct)}</b>${q.type === 'tf' ? ` (${U.esc(Q.answerText(q.card, q.dir))})` : ''}</div>`
          }${r.close && !r.ok ? '<div class="small">Похоже, но не совпадает дословно. Если смысл тот же — засчитайте себе ответ.</div>' : ''}</div>
            ${
              !r.ok && r.written && r.given
                ? `<div class="row-gap"><button class="btn ${r.close ? 'ok-btn' : 'ghost'} sm" type="button" data-credit="${r.i}">${r.close ? '✓ Засчитать' : 'Мой ответ тоже верный'}</button></div>`
                : ''
            }`;
          if (!r.ok) wrongCards.push(q.card);
        }
        return `<article class="tq ${r.ok ? 'is-ok' : 'is-bad'}"><div class="tq-head"><span class="tq-num">${r.i + 1}</span><span class="tq-type">${TYPE_NAMES[q.type]}</span></div>${body}</article>`;
      })
      .join('');
    T.wrongCards = wrongCards;
    root.innerHTML = `
      <section class="page test-page">
        <div class="summary-card">
          ${PV.author.byScore(pct)}
          <h2>Результат: ${score} из ${max} (${pct}%)</h2>
          <div class="row-gap center">
            ${wrongCards.length ? '<button class="btn primary" id="retryWrong" type="button">Повторить ошибки</button>' : ''}
            <button class="btn" id="newTest" type="button">Новый тест</button>
          </div>
          ${PV.author.courseNudge()}
        </div>
        <div class="review">${items}</div>
      </section>`;
    U.$('#retryWrong', root)?.addEventListener('click', () => {
      const uniq = Array.from(new Map(T.wrongCards.map((c) => [c.id, c])).values());
      build(uniq);
      renderTest(root);
    });
    U.$$('[data-credit]', root).forEach((b) =>
      b.addEventListener('click', () => {
        const r = T.results.find((x) => x.i === Number(b.dataset.credit));
        if (!r || r.ok) return;
        r.ok = true;
        r.close = false;
        r.credited = true;
        PV.store.amend(T.questions[r.i].card.id, r.prevStreak);
        const y = window.scrollY;
        renderResults(root);
        window.scrollTo({ top: y });
        U.toast('Засчитано');
      })
    );
    U.$('#newTest', root).addEventListener('click', () => {
      T = null;
      render(root);
    });
    window.scrollTo({ top: 0 });
  }

  function render(root) {
    const deck = PV.deck();
    if (!deck.length) {
      root.innerHTML = PV.app.emptyHtml('В выбранном наборе нет карточек.');
      return;
    }
    if (T && !T.submitted) return renderTest(root);
    if (T && T.submitted) return renderResults(root);
    renderConfig(root, deck);
  }

  PV.test = {
    render,
    destroy() {},
    reset() {
      T = null;
    },
  };
})(window.PV);
