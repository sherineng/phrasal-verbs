/* Карточки (одно значение = одна карточка), выбор набора, вопросы и проверка ответов */
window.PV = window.PV || {};

(function (PV) {
  const U = PV.util;
  const verbs = window.PV_DATA || [];
  PV.verbs = verbs;

  /* ---------- подготовка данных ---------- */

  const cleanRu = (ru) =>
    ru
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,;.!?])/g, '$1')
      .trim();

  /** Список «синонимов» из русского значения: «выбрать, выделить; найти» → 3 варианта. */
  const variantsOf = (ru) => {
    const v = cleanRu(ru)
      .replace(/([!?])\s+/g, '$1;')
      .split(/[;,]/)
      .map((s) => s.replace(/[!?.…]+$/, '').trim())
      .filter(Boolean);
    return v.length ? v : [ru.replace(/[()]/g, '').trim()];
  };

  /** Английская форма без «smb/smth/doing» и скобок — то, что вводит ученик. */
  const stripEn = (s) => U.norm(s.replace(/\([^)]*\)/g, ' ').replace(/\b(smb|smth|doing|something|somebody)\b/gi, ' '));

  const cards = [];
  const byId = {};
  verbs.forEach((v) => {
    v.forms = Array.from(new Set([stripEn(v.name), stripEn(v.display)].concat(v.alts.map(stripEn)))).filter(Boolean);
    v.meanings.forEach((m, idx) => {
      const variants = variantsOf(m.ru);
      const card = {
        id: m.id,
        verb: v,
        m,
        idx,
        en: v.display,
        variants,
        vnorm: variants.map(U.norm),
        short: variants.slice(0, 3).join(', '),
        // перевод целиком, как в исходном файле: с пояснениями в скобках («(с гордостью) показать»)
        full: m.ru,
        ex: m.examples.find((e) => e.src !== 'extra') || m.examples[0],
      };
      cards.push(card);
      byId[card.id] = card;
    });
  });
  PV.cards = cards;
  PV.cardById = byId;

  /** Базовые глаголы (back, break, come…) и число значений в каждом. */
  PV.groups = Object.entries(
    cards.reduce((acc, c) => {
      acc[c.verb.group] = (acc[c.verb.group] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  /* ---------- набор для изучения ---------- */

  PV.deck = () => {
    const s = PV.store.settings;
    let list = cards;
    if (s.groups.length) list = list.filter((c) => s.groups.includes(c.verb.group));
    if (s.scope === 'starred') list = list.filter((c) => PV.store.isStar(c.id));
    else if (s.scope === 'unlearned') list = list.filter((c) => !PV.store.isLearned(c.id));
    else if (s.scope === 'mistakes') list = list.filter((c) => PV.store.hasMistakes(c.id));
    return list;
  };

  /** Язык термина для очередного вопроса: 'en' (показываем англ.) или 'ru'. */
  PV.pickDir = () => {
    const d = PV.store.settings.dir;
    return d === 'mix' ? (Math.random() < 0.5 ? 'en' : 'ru') : d;
  };

  /* ---------- вопросы ---------- */

  const sharesMeaning = (a, b) => a.vnorm.some((x) => b.vnorm.includes(x));

  const Q = (PV.q = {});

  /** HTML термина (того, что спрашиваем). */
  Q.termHtml = (card, dir) => {
    if (dir === 'en') {
      const total = card.verb.meanings.length;
      return (
        `<div class="term-main">${U.esc(card.en)}</div>` +
        (card.m.pattern ? `<div class="term-sub">${U.esc(card.m.pattern)}</div>` : '') +
        (total > 1 ? `<div class="term-note">значение ${card.idx + 1} из ${total}</div>` : '')
      );
    }
    return `<div class="term-main ru">${U.esc(card.m.ru)}</div>`;
  };

  /** HTML обратной стороны (ответ + примеры). */
  Q.backHtml = (card, dir, maxEx = 3) => {
    const main =
      dir === 'en'
        ? `<div class="term-main ru">${U.esc(card.m.ru)}</div>`
        : `<div class="term-main">${U.esc(card.en)}</div>` +
          (card.m.pattern ? `<div class="term-sub">${U.esc(card.m.pattern)}</div>` : '');
    return main + Q.defHtml(card.m) + Q.examplesHtml(card, maxEx) + Q.dictLinks(card.verb);
  };

  /** Английская дефиниция значения (своя формулировка в стиле learner's dictionary). */
  Q.defHtml = (m) =>
    m.en ? `<p class="def"><span class="def-label" lang="en">in English</span><span class="def-text" lang="en">${U.esc(m.en)}</span></p>` : '';

  /** Ссылки на словарные статьи Cambridge и Oxford Learner's. */
  Q.dictLinks = (verb) => {
    const q = encodeURIComponent(verb.name).replace(/%20/g, '+');
    // в Cambridge у некоторых глаголов нет отдельной статьи — ведём на основную
    const camb = ({ 'run out of': 'run out' }[verb.name] || verb.name).toLowerCase().replace(/[^a-z]+/g, '-');
    return (
      `<div class="dict-links"><span>Словари:</span>` +
      `<a href="https://dictionary.cambridge.org/dictionary/english/${camb}" target="_blank" rel="noopener">Cambridge ↗</a>` +
      `<a href="https://www.oxfordlearnersdictionaries.com/search/english/?q=${q}" target="_blank" rel="noopener">Oxford ↗</a></div>`
    );
  };

  Q.examplesHtml = (card, max = 3) =>
    '<ul class="ex-list">' +
    card.m.examples
      .slice(0, max)
      .map(
        (e) =>
          `<li><span class="ex-en">${U.esc(e.en)}</span><span class="ex-ru">${U.esc(e.ru)}</span></li>`
      )
      .join('') +
    '</ul>';

  /** Текст правильного ответа. */
  Q.answerText = (card, dir) => (dir === 'en' ? card.full : card.en);

  /** Варианты для теста с выбором: 1 верный + n-1 неверных. */
  Q.mc = (card, dir, n = 4) => {
    const correctText = Q.answerText(card, dir);
    const textOf = (c) => Q.answerText(c, dir);
    const pool = cards.filter(
      (c) => c.verb.id !== card.verb.id && !sharesMeaning(c, card) && textOf(c) !== correctText
    );
    const same = U.shuffle(pool.filter((c) => c.verb.group === card.verb.group));
    const other = U.shuffle(pool);
    const picked = [];
    const used = new Set([correctText]);
    const take = (list, limit) => {
      for (const c of list) {
        if (picked.length >= limit) break;
        const t = textOf(c);
        if (used.has(t)) continue;
        used.add(t);
        picked.push(c);
      }
    };
    take(same, Math.min(2, n - 1));
    take(other, n - 1);
    const options = U.shuffle([{ text: correctText, ok: true }].concat(picked.map((c) => ({ text: textOf(c), ok: false }))));
    return options;
  };

  const ruMatch = (n, cand) => {
    if (!n || !cand) return false;
    if (n === cand) return true;
    const minLen = Math.min(n.length, cand.length);
    if (minLen >= 5 && U.lev(n, cand) <= (cand.length >= 10 ? 2 : 1)) return true;
    const nw = n.split(' ');
    const cw = cand.split(' ');
    if (n.length >= 4 && nw.every((w) => cw.includes(w)) && (cw.length === nw.length || !cand.startsWith('не '))) return true;
    let p = 0;
    while (p < n.length && p < cand.length && n[p] === cand[p]) p++;
    // общий корень: «расстались» ≈ «расстаться» (разные формы одного глагола)
    // (только при одинаковом числе слов, иначе «отказываться бегать» засчитывалось бы)
    return nw.length === cw.length && minLen >= 5 && p >= Math.max(5, minLen - 4);
  };

  /* ---------- проверка «по смыслу» для русского ответа ---------- */

  const RU_STOP = new Set(
    ('от с со к ко в во на о об обо по за из у и или а но да же ли бы то это как так чтобы что чем ' +
      'кто кого кому кем ком чего чему что-то кого-то чего-то кому-то чему-то чем-то кем-то ком-то ' +
      'то-то нибудь либо себя себе собой свой свою свои своё свое быть очень более менее уже еще ещё снова ' +
      'smb smth или-то например т д тп').split(' ')
  );
  const RU_END = /(иться|аться|яться|еться|уться|ться|тись|ется|ится|ются|ятся|утся|атся|ешься|ишься|лся|лась|лись|лось|ешь|ишь|ете|ите|ем|им|ет|ит|ут|ют|ат|ят|ть|ти|ла|ли|ло|ал|ял|ил|ел|л|сь|ся|ыми|ими|ого|его|ому|ему|ая|яя|ое|ее|ые|ие|ый|ий|ой|ую|юю|ами|ями|ах|ях|ов|ев|ей|ам|ям|ом|а|я|о|е|ы|и|у|ю|ь)$/;

  const stemRu = (w) => {
    let st = w;
    for (let k = 0; k < 2 && st.length > 4; k++) {
      const next = st.replace(RU_END, '');
      if (next === st || next.length < 3) break;
      st = next;
    }
    return st;
  };
  const contentStems = (text) =>
    U.norm(text.replace(/[()]/g, ' '))
      .split(' ')
      .filter((w) => w && !RU_STOP.has(w) && !/^(кого|чего|кому|чему|чем|кем|ком)то$/.test(w))
      .map(stemRu);
  const stemEq = (a, b) => {
    if (a === b) return true;
    const min = Math.min(a.length, b.length);
    if (min >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
    return min >= 5 && U.lev(a, b) <= 1;
  };

  /** Слова значения: из «основных» вариантов и из пояснений в скобках. */
  const meaningStems = (card) => {
    if (!card._stems) {
      card._stems = {
        main: new Set(card.variants.flatMap(contentStems)),
        all: new Set(contentStems(card.m.ru)),
      };
    }
    return card._stems;
  };

  /**
   * Сравнение по смыслу: ответ своими словами.
   * full — все значимые слова ответа есть в значении (хотя бы одно — в основной части, не в скобках);
   * close — совпала только часть слов.
   */
  const ruByMeaning = (card, input) => {
    const ans = contentStems(input);
    if (!ans.length) return { full: false, close: false };
    const { main, all } = meaningStems(card);
    const inMain = (w) => [...main].some((m) => stemEq(w, m));
    const inAll = (w) => inMain(w) || [...all].some((m) => stemEq(w, m));
    const mainHits = ans.filter(inMain).length;
    const allHits = ans.filter(inAll).length;
    const negAns = /(^|\s)не\s/.test(' ' + U.norm(input) + ' ');
    const negMean = /(^|\s)не\s/.test(' ' + U.norm(card.m.ru) + ' ');
    if (negAns !== negMean) return { full: false, close: mainHits > 0 };
    return { full: mainHits > 0 && allHits === ans.length, close: mainHits > 0 };
  };

  /* ---------- формы английского глагола: took off ≈ take off ---------- */

  const IRREG = {
    be: 'is are am was were been being',
    blow: 'blew blown',
    break: 'broke broken',
    bring: 'brought',
    catch: 'caught',
    come: 'came',
    fall: 'fell fallen',
    find: 'found',
    get: 'got gotten',
    give: 'gave given',
    go: 'went gone goes',
    grow: 'grew grown',
    hang: 'hung',
    hold: 'held',
    keep: 'kept',
    make: 'made',
    run: 'ran',
    show: 'showed shown',
    sit: 'sat',
    stand: 'stood',
    stick: 'stuck',
    take: 'took taken',
    throw: 'threw thrown',
    wake: 'woke woken',
    wind: 'wound',
    write: 'wrote written',
    burst: 'burst',
    cut: 'cut',
    let: 'let',
    put: 'put',
    set: 'set',
    shut: 'shut',
    spread: 'spread',
    hit: 'hit',
    lie: 'lay lain',
  };
  const verbForms = (base) => {
    const f = new Set([base]);
    const irregular = IRREG[base];
    const cy = /[^aeiou]y$/.test(base);
    const dbl = /^[^aeiou]*[aeiou][bdgmnprt]$/.test(base); // drop → dropped, stop → stopping
    // 3-е лицо
    if (/(s|x|z|ch|sh|o)$/.test(base)) f.add(base + 'es');
    else if (cy) f.add(base.slice(0, -1) + 'ies');
    else f.add(base + 's');
    // -ing
    if (irregular && /ing\b/.test(irregular)) {
      /* форма на -ing уже в списке (being) */
    } else if (/ie$/.test(base)) f.add(base.slice(0, -2) + 'ying');
    else if (/[^e]e$/.test(base)) f.add(base.slice(0, -1) + 'ing');
    else if (dbl) f.add(base + base.slice(-1) + 'ing');
    else f.add(base + 'ing');
    // прошедшее / причастие
    if (irregular) irregular.split(' ').forEach((x) => f.add(x));
    else if (base.endsWith('e')) f.add(base + 'd');
    else if (cy) f.add(base.slice(0, -1) + 'ied');
    else if (dbl) f.add(base + base.slice(-1) + 'ed');
    else f.add(base + 'ed');
    return f;
  };


  /**
   * Английский ответ в другой форме: took off, is taking off, turn the light off.
   * Возвращает форму из карточки, которой соответствует ответ, или null.
   */
  const enByForm = (forms, n) => {
    let words = n.split(' ').filter((w) => !/^(to|will|has|have|had|is|are|am|was|were|be|been|i|you|he|she|it|we|they|did|do|does)$/.test(w) || n.split(' ').length <= 2);
    if (!words.length) return null;
    for (const f of forms) {
      const fw = f.split(' ');
      if (fw.length < 2) continue;
      const head = fw[0];
      const rest = fw.slice(1);
      const vf = verbForms(head);
      const i = words.findIndex((w) => vf.has(w));
      if (i < 0) continue;
      const tail = words.slice(i + 1);
      if (tail.join(' ') === rest.join(' ')) return f;
      // разделяемый глагол: turn the light off / turn it off
      const last = tail.slice(-rest.length).join(' ');
      if (last === rest.join(' ') && tail.length - rest.length <= 3) return f;
    }
    return null;
  };

  /**
   * Проверка письменного ответа.
   * dir 'en' — спрашивали английский термин, ответ по-русски; 'ru' — наоборот.
   * Возвращает {ok, typo?, note?, close?}. close — «похоже, решите сами».
   */
  Q.check = (card, dir, input) => {
    const raw = String(input || '').trim();
    if (!raw) return { ok: false, empty: true };

    if (dir === 'ru') {
      const n = U.norm(raw).replace(/^to\s+/, '');
      const own = card.verb.forms;
      if (own.includes(n)) return { ok: true };
      if (own.some((f) => f.length >= 6 && U.lev(n, f) <= 1)) return { ok: true, typo: true };
      const formHit = enByForm(own, n);
      if (formHit) return { ok: true, note: `Засчитано. Начальная форма: ${card.verb.display}` };
      // другой глагол с тем же русским значением тоже считаем верным
      const syn = cards.find(
        (c) => c.verb.id !== card.verb.id && sharesMeaning(c, card) && (c.verb.forms.includes(n) || enByForm(c.verb.forms, n))
      );
      if (syn) return { ok: true, note: `Тоже подходит: ${syn.verb.display}. В карточке был: ${card.verb.display}` };
      // почти: две опечатки (частица другая — это уже другой глагол, не «почти»)
      if (own.some((f) => f.length >= 6 && U.lev(n, f) <= 2 && f.split(' ').slice(1).join(' ') === n.split(' ').slice(1).join(' ')))
        return { ok: false, close: true };
      return { ok: false };
    }

    const parts = raw.split(/[;,]/).map(U.norm).filter(Boolean);
    const test = (c) => parts.some((p) => c.vnorm.some((cand) => ruMatch(p, cand)));
    if (test(card)) return { ok: true };
    const sem = ruByMeaning(card, raw);
    if (sem.full) return { ok: true, note: `Засчитано по смыслу. В карточке: ${card.full}` };
    // другое значение того же глагола
    const sibling = card.verb.meanings.length > 1 ? cards.find((c) => c.verb.id === card.verb.id && c.id !== card.id && (test(c) || ruByMeaning(c, raw).full)) : null;
    if (sibling) return { ok: true, note: `Это другое значение ${card.verb.name}. В карточке: ${card.full}` };
    return { ok: false, close: sem.close };
  };

  /** Подсказка: «b___ a___» для английского, «рас…» для русского. */
  Q.hint = (card, dir) => {
    if (dir === 'ru') {
      return card.verb.name
        .split(' ')
        .map((w) => w[0] + '_'.repeat(Math.max(w.length - 1, 0)))
        .join(' ');
    }
    const t = card.variants[0];
    return t.slice(0, Math.min(3, Math.ceil(t.length / 3))) + '…';
  };

  /** Случайные карточки без повторов одинаковых глаголов (для игр «подбор» и «гравитация»). */
  Q.verbForms = verbForms;

  Q.sampleUnique = (list, n) => {
    const seen = new Set();
    const out = [];
    for (const c of U.shuffle(list)) {
      if (seen.has(c.verb.id) || seen.has(c.short)) continue;
      seen.add(c.verb.id);
      seen.add(c.short);
      out.push(c);
      if (out.length >= n) break;
    }
    return out;
  };
})(window.PV);
