/* В контексте: предложение с пропуском — вписать фразовый глагол в нужной грамматической форме */
window.PV = window.PV || {};

(function (PV) {
  const U = PV.util;
  const Q = PV.q;
  const ROUND = 10;
  const ui = { showBase: true, showRu: true };
  let S = null;

  /* ---------- поиск фразового глагола в предложении ---------- */

  const AUX = new Set(
    ('am is are was were be been being has have had will would shall do does did not ' +
      "isn't aren't wasn't weren't hasn't haven't hadn't won't wouldn't don't doesn't didn't shan't")
      .split(' ')
  );

  const tokenize = (s) => {
    const out = [];
    const re = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
    let m;
    while ((m = re.exec(s))) out.push({ w: m[0].toLowerCase().replace(/’/g, "'"), start: m.index, end: m.index + m[0].length });
    return out;
  };

  /**
   * Находит фразовый глагол карточки в примере.
   * Возвращает список «пропусков» [{start, end, text}] (1 — подряд, 2 — разделённый: turn the light off)
   * или null, если глагол не найден.
   */
  function findGaps(card, sentence) {
    const toks = tokenize(sentence);
    for (const form of card.verb.forms) {
      const fw = form.split(' ');
      if (fw.length < 2) continue;
      const vf = Q.verbForms(fw[0]);
      const rest = fw.slice(1);
      for (let i = 0; i < toks.length; i++) {
        if (!vf.has(toks[i].w)) continue;
        const at = (k) => rest.every((r, n) => toks[k + n] && toks[k + n].w === r);
        let split = -1;
        if (!at(i + 1)) {
          for (let gap = 1; gap <= 3; gap++) {
            if (at(i + 1 + gap) && !toks.slice(i + 1, i + 1 + gap).some((t) => vf.has(t.w))) {
              split = i + 1 + gap;
              break;
            }
          }
          if (split < 0) continue;
        }
        // вспомогательные глаголы перед основным тоже часть грамматической формы
        let a = i;
        while (a > 0 && i - a < 3 && AUX.has(toks[a - 1].w) && toks[a - 1].end + 2 >= toks[a].start) a--;
        const first = toks[a];
        if (split < 0) {
          const last = toks[i + rest.length];
          return [{ start: first.start, end: last.end, text: sentence.slice(first.start, last.end) }];
        }
        const pFirst = toks[split];
        const pLast = toks[split + rest.length - 1];
        return [
          { start: first.start, end: toks[i].end, text: sentence.slice(first.start, toks[i].end) },
          { start: pFirst.start, end: pLast.end, text: sentence.slice(pFirst.start, pLast.end) },
        ];
      }
    }
    return null;
  }

  /** Все предложения с пропуском для карточки. */
  const itemsFor = (card) =>
    card.m.examples
      .map((e) => ({ e, gaps: findGaps(card, e.en) }))
      .filter((x) => x.gaps)
      .map((x) => ({ card, ...x }));

  /* ---------- проверка ---------- */

  const expand = (s) =>
    ' ' +
    U.norm(
      String(s)
        .toLowerCase()
        .replace(/’/g, "'")
        .replace(/\b(do|does|did|is|are|was|were|has|have|had|would|could|should)nt\b/g, '$1 not')
        .replace(/\bwont\b/g, 'will not')
        .replace(/\bcant\b/g, 'can not')
        .replace(/\bwon't\b/g, 'will not')
        .replace(/\bshan't\b/g, 'shall not')
        .replace(/\bcan't\b/g, 'can not')
        .replace(/n't\b/g, ' not')
        .replace(/'ll\b/g, ' will')
        .replace(/'re\b/g, ' are')
        .replace(/'ve\b/g, ' have')
        .replace(/'m\b/g, ' am')
        .replace(/'/g, '')
    ) +
    ' ';

  /**
   * ok — точное совпадение (или 1 опечатка); form — глагол тот же, но форма другая.
   */
  function checkItem(item, values) {
    const expected = item.gaps.map((g) => expand(g.text));
    const given = values.map(expand);
    if (given.every((g) => !g.trim())) return { empty: true };
    if (given.every((g, k) => g === expected[k])) return { ok: true };
    const joinedE = expected.join('').replace(/\s+/g, ' ').trim();
    const joinedG = given.join('').replace(/\s+/g, ' ').trim();
    if (joinedG === joinedE) return { ok: true };
    // опечатка — только если ученик не написал другую настоящую форму глагола (run into вместо ran into)
    const head = item.card.verb.name.split(' ')[0];
    const vf = Q.verbForms(head);
    const gw = joinedG.split(' ');
    const ew = joinedE.split(' ');
    const otherForm = gw.some((w) => vf.has(w) && !ew.includes(w)) || gw.length !== ew.length;
    if (!otherForm && joinedE.length >= 6 && U.lev(joinedG, joinedE) <= 2 && gw.every((w, k) => U.lev(w, ew[k]) <= 1))
      return { ok: true, typo: true };
    // тот же фразовый глагол в другой форме?
    if (Q.check(item.card, 'ru', joinedG).ok) return { ok: false, form: true };
    return { ok: false };
  }

  /* ---------- сессия ---------- */

  function start(deck) {
    const pool = U.shuffle(deck)
      .map((c) => {
        const its = itemsFor(c);
        return its.length ? its[Math.floor(Math.random() * its.length)] : null;
      })
      .filter(Boolean);
    S = { all: pool, list: pool.slice(0, ROUND), i: 0, res: [], cur: null, done: false, offset: 0 };
  }

  function nextBatch() {
    S.offset += ROUND;
    if (S.offset >= S.all.length) {
      S.all = U.shuffle(S.all);
      S.offset = 0;
    }
    S.list = S.all.slice(S.offset, S.offset + ROUND);
    S.i = 0;
    S.res = [];
    S.cur = null;
    S.done = false;
  }

  /* ---------- отрисовка ---------- */

  function sentenceHtml(item, answered, values) {
    const s = item.e.en;
    let html = '';
    let pos = 0;
    item.gaps.forEach((g, k) => {
      html += U.esc(s.slice(pos, g.start));
      const w = Math.max(6, g.text.length + 2);
      html += answered
        ? `<span class="ctx-filled ${answered.ok ? 'ok' : 'bad'}">${U.esc(g.text)}</span>`
        : `<input class="ctx-gap" data-k="${k}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" style="width:${w}ch" aria-label="Пропуск ${k + 1}" value="${U.esc(values[k] || '')}">`;
      pos = g.end;
    });
    html += U.esc(s.slice(pos));
    const base = item.card.verb.display;
    return `<p class="ctx-sentence">${html}${ui.showBase ? ` <span class="ctx-base">(${U.esc(base)})</span>` : ''}</p>`;
  }

  function header() {
    const n = S.list.length;
    const good = S.res.filter((r) => r.ok).length;
    return `
      <div class="toolbar">
        <div class="progress-text"><b>${Math.min(S.i + 1, n)}</b> / ${n} · верно: <b>${good}</b></div>
        <div class="toolbar-actions">
          <label class="switch"><input type="checkbox" id="optBase" ${ui.showBase ? 'checked' : ''}><span class="switch-ui"></span><span>Показывать глагол</span></label>
          <label class="switch"><input type="checkbox" id="optRu" ${ui.showRu ? 'checked' : ''}><span class="switch-ui"></span><span>Перевод</span></label>
        </div>
      </div>
      <div class="bar"><div class="bar-fill" style="width:${(S.i / n) * 100}%"></div></div>`;
  }

  function render(root) {
    const deck = PV.deck();
    if (!deck.length) {
      root.innerHTML = PV.app.emptyHtml('В выбранном наборе нет карточек.');
      return;
    }
    if (!S || !S.list.length) start(deck);
    if (!S.list.length) {
      root.innerHTML = PV.app.emptyHtml('Для этих карточек не нашлось предложений. Выберите другой набор.');
      return;
    }
    draw(root);
  }

  function draw(root) {
    if (S.done) return drawSummary(root);
    const item = S.list[S.i];
    const cur = S.cur || (S.cur = { values: item.gaps.map(() => ''), res: null, hint: 0 });
    const r = cur.res;

    let fb = '';
    if (r) {
      const correct = item.gaps.map((g) => g.text).join(' … ');
      if (r.ok) {
        fb = `<div class="res ok">✓ Верно!${r.typo ? ` Небольшая опечатка — правильно: <b>${U.esc(correct)}</b>` : ''}${r.credited ? ' <span class="small">(засчитано вами)</span>' : ''}</div>`;
      } else if (r.form) {
        fb = `<div class="res close">🤔 Глагол верный, но форма другая. Вы ввели: <b>${U.esc(cur.values.filter((v) => v.trim()).join(' … '))}</b><div>Нужно: <b>${U.esc(correct)}</b></div><div class="small">Посмотрите на время и подлежащее в предложении.</div></div>`;
      } else {
        fb = `<div class="res bad">✗ ${r.skipped ? 'Ничего страшного.' : `Вы ввели: <b>${U.esc(cur.values.filter((v) => v.trim()).join(' … ') || '—')}</b>`}<div>Правильно: <b>${U.esc(correct)}</b> <span class="muted small">(${U.esc(item.card.verb.display)} — ${U.esc(item.card.full)})</span></div></div>`;
      }
    }

    root.innerHTML = `
      <section class="page ctx-page">
        ${header()}
        <div class="q-card">
          <div class="q-top"><span class="q-label">Вставьте фразовый глагол в нужной форме</span>${U.speakBtn(item.e.en)}</div>
          <form id="ctxForm" autocomplete="off">
            ${sentenceHtml(item, r, cur.values)}
            ${ui.showRu || r ? `<p class="ctx-ru">${U.esc(item.e.ru)}</p>` : ''}
            ${cur.hint && !r ? `<p class="ctx-hint">Подсказка: <b>${U.esc(hintText(item, cur.hint))}</b></p>` : ''}
            <div class="result">${fb}</div>
            <div class="row-gap">
              ${
                r
                  ? `${!r.ok && !r.skipped ? `<button class="btn ghost" id="credit" type="button">${r.form ? 'Моя форма тоже подходит' : 'Мой ответ тоже верный'}</button>` : ''}
                     <button class="btn primary" id="next" type="submit">Дальше →</button>`
                  : `<button class="btn primary" type="submit">Проверить</button>
                     <button class="btn ghost" id="hint" type="button">Подсказка</button>
                     <button class="btn ghost" id="skip" type="button">Не знаю</button>`
              }
            </div>
          </form>
          ${r ? `<div class="ctx-more"><h3>Значение</h3><p><b>${U.esc(item.card.verb.display)}</b> — ${U.esc(item.card.m.ru)}</p></div>` : ''}
        </div>
      </section>`;

    bind(root, item, cur);
  }

  function hintText(item, level) {
    // 1 — начальная форма; 2 — первые буквы нужной формы
    if (level === 1) return item.card.verb.display;
    return item.gaps.map((g) => g.text.split(' ').map((w) => w.slice(0, 2) + '…').join(' ')).join(' … ');
  }

  function bind(root, item, cur) {
    const inputs = U.$$('.ctx-gap', root);
    inputs.forEach((inp) => inp.addEventListener('input', () => (cur.values[Number(inp.dataset.k)] = inp.value)));
    if (inputs[0] && matchMedia('(hover: hover)').matches) inputs[0].focus();

    U.$('#optBase', root).addEventListener('change', (e) => {
      ui.showBase = e.target.checked;
      draw(root);
    });
    U.$('#optRu', root).addEventListener('change', (e) => {
      ui.showRu = e.target.checked;
      draw(root);
    });

    U.$('#ctxForm', root).addEventListener('submit', (e) => {
      e.preventDefault();
      if (cur.res) return advance(root);
      const r = checkItem(item, cur.values);
      if (r.empty) return inputs[0]?.focus();
      answer(root, item, cur, r);
    });
    U.$('#hint', root)?.addEventListener('click', () => {
      cur.hint = Math.min(2, cur.hint + 1);
      draw(root);
    });
    U.$('#skip', root)?.addEventListener('click', () => answer(root, item, cur, { ok: false, skipped: true }));
    U.$('#credit', root)?.addEventListener('click', () => {
      cur.res = { ok: true, credited: true };
      PV.store.amend(item.card.id, cur.prevStreak);
      S.res[S.res.length - 1] = { item, ok: true };
      draw(root);
      U.toast('Засчитано');
    });
    U.$('#next', root)?.focus();
  }

  function answer(root, item, cur, r) {
    cur.prevStreak = PV.store.streakOf(item.card.id);
    cur.res = r;
    PV.store.rec(item.card.id, r.ok);
    S.res.push({ item, ok: r.ok });
    draw(root);
  }

  function advance(root) {
    S.i++;
    S.cur = null;
    if (S.i >= S.list.length) S.done = true;
    draw(root);
  }

  function drawSummary(root) {
    const n = S.res.length;
    const good = S.res.filter((r) => r.ok).length;
    const pct = n ? Math.round((good / n) * 100) : 0;
    const wrong = S.res.filter((r) => !r.ok);
    root.innerHTML = `
      <section class="page summary">
        <div class="summary-card">
          ${PV.author.byScore(pct)}
          <h2>Верно ${good} из ${n} (${pct}%)</h2>
          ${
            wrong.length
              ? `<h3>Стоит повторить</h3><ul class="pairs">${wrong
                  .map((r) => `<li><b>${U.esc(r.item.gaps.map((g) => g.text).join(' … '))}</b> — ${U.esc(r.item.card.verb.display)}</li>`)
                  .join('')}</ul>`
              : ''
          }
          <div class="row-gap center">
            ${wrong.length ? '<button class="btn primary" id="retry" type="button">Повторить ошибки</button>' : ''}
            <button class="btn ${wrong.length ? '' : 'primary'}" id="more" type="button">Ещё 10 предложений</button>
          </div>
          ${PV.author.courseNudge()}
        </div>
      </section>`;
    U.$('#retry', root)?.addEventListener('click', () => {
      S.list = U.shuffle(wrong.map((r) => r.item));
      S.i = 0;
      S.res = [];
      S.cur = null;
      S.done = false;
      draw(root);
    });
    U.$('#more', root).addEventListener('click', () => {
      nextBatch();
      draw(root);
    });
  }

  PV.context = {
    render,
    destroy() {},
    reset() {
      S = null;
    },
    // для проверки покрытия
    _findGaps: findGaps,
    _check: checkItem,
    _itemsFor: itemsFor,
  };
})(window.PV);
