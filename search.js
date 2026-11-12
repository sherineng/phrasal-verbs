/* Раздел «Поиск глагола»: по-английски и по-русски, по глаголу, значению и примерам */
window.PV = window.PV || {};

(function (PV) {
  const U = PV.util;
  const PAGE = 30;

  const ui = { q: '', group: '', onlyStar: false, showRu: true, limit: PAGE };

  function search(q, group, onlyStar) {
    const nq = U.norm(q);
    const tokens = nq ? nq.split(' ') : [];
    const out = [];
    for (const v of PV.verbs) {
      if (group && v.group !== group) continue;
      if (onlyStar && !v.meanings.some((m) => PV.store.isStar(m.id))) continue;
      if (!tokens.length) {
        out.push({ v, score: 0, hits: new Set() });
        continue;
      }
      const name = U.norm([v.name, v.display].concat(v.alts).join(' '));
      let score = 0;
      const hits = new Set();
      if (v.forms.includes(nq) || name === nq) score = 100;
      else if (name.startsWith(nq)) score = 90;
      else if (name.includes(nq)) score = 80;
      else if (tokens.length > 1 && tokens.every((t) => name.includes(t))) score = 70;
      if (nq.length >= 2) {
        for (const m of v.meanings) {
          const ru = U.norm(m.ru);
          if (ru.includes(nq)) {
            score = Math.max(score, 60);
            hits.add(m.id);
          } else if (tokens.length > 1 && tokens.every((t) => ru.includes(t))) {
            score = Math.max(score, 50);
            hits.add(m.id);
          }
          for (const e of m.examples) {
            if (U.norm(e.en).includes(nq)) {
              score = Math.max(score, 35);
              hits.add(m.id);
            } else if (U.norm(e.ru).includes(nq)) {
              score = Math.max(score, 30);
              hits.add(m.id);
            }
          }
        }
      }
      if (score) out.push({ v, score, hits });
    }
    if (tokens.length) out.sort((a, b) => b.score - a.score || a.v.name.localeCompare(b.v.name));
    return { list: out, tokens };
  }

  function exampleHtml(e, tokens) {
    const tag = e.src === 'fipi' ? '<span class="tag tag-fipi">ФИПИ</span>' : '';
    return (
      `<li><div class="ex-en">${U.highlight(e.en, tokens)} ${tag}${U.speakBtn(e.en)}</div>` +
      `<div class="ex-ru">${U.highlight(e.ru, tokens)}</div></li>`
    );
  }

  function verbHtml(item, tokens, open) {
    const v = item.v;
    const meanings = v.meanings
      .map((m) => {
        const hit = item.hits.has(m.id) ? ' hit' : '';
        const star = PV.store.isStar(m.id);
        return (
          `<li class="meaning${hit}" data-mid="${m.id}">` +
          `<div class="m-row">` +
          `<button class="star${star ? ' on' : ''}" type="button" data-star="${m.id}" aria-label="В избранное" title="В избранное">${star ? '★' : '☆'}</button>` +
          `<div class="m-text">` +
          (m.pattern ? `<span class="m-pattern">${U.highlight(m.pattern, tokens)}</span> ` : '') +
          `<span class="m-ru">${U.highlight(m.ru, tokens)}</span>` +
          (m.en ? `<span class="m-def" lang="en">${U.esc(m.en)}</span>` : '') +
          `</div></div>` +
          `<ul class="ex-list">${m.examples.map((e) => exampleHtml(e, tokens)).join('')}</ul>` +
          `</li>`
        );
      })
      .join('');
    return (
      `<article class="verb${open ? ' open' : ''}" data-vid="${v.id}">` +
      `<header class="v-head" role="button" tabindex="0" aria-expanded="${open}">` +
      `<h3 class="v-name">${U.highlight(v.display, tokens)}</h3>` +
      `<span class="v-meta">${v.meanings.length} ${U.plural(v.meanings.length, 'значение', 'значения', 'значений')}</span>` +
      U.speakBtn(v.name) +
      `<span class="chev" aria-hidden="true">▾</span>` +
      `</header>` +
      `<ol class="meanings">${meanings}</ol>` +
      PV.q.dictLinks(v) +
      `</article>`
    );
  }

  function render(root) {
    const groupOptions =
      '<option value="">Все глаголы</option>' +
      PV.groups.map((g) => `<option value="${U.esc(g.name)}"${ui.group === g.name ? ' selected' : ''}>${U.esc(g.name)} (${g.count})</option>`).join('');

    root.innerHTML = `
      <section class="page search-page">
        ${PV.author.banner()}
        <div class="searchbox">
          <svg class="searchbox-icon" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>
          <input id="q" type="search" inputmode="search" autocomplete="off" autocapitalize="off" spellcheck="false"
                 placeholder="Поиск: break up, расстаться, на пути, took off…" value="${U.esc(ui.q)}" aria-label="Поиск фразового глагола">
          <button id="qClear" class="icon-btn sm" type="button" aria-label="Очистить" ${ui.q ? '' : 'hidden'}>✕</button>
        </div>
        <div class="filters">
          <label class="select-wrap"><span>Базовый глагол</span><select id="fGroup">${groupOptions}</select></label>
          <label class="check"><input type="checkbox" id="fStar" ${ui.onlyStar ? 'checked' : ''}> только ★ избранные</label>
          <label class="check"><input type="checkbox" id="fRu" ${ui.showRu ? 'checked' : ''}> показывать переводы примеров</label>
        </div>
        <div id="resultInfo" class="result-info" aria-live="polite"></div>
        <div id="results" class="results ${ui.showRu ? '' : 'hide-ru'}"></div>
        <div class="more-wrap"><button id="more" class="btn" type="button" hidden>Показать ещё</button></div>
      </section>`;

    const $q = U.$('#q', root);
    const $res = U.$('#results', root);
    const $info = U.$('#resultInfo', root);
    const $more = U.$('#more', root);
    const $clear = U.$('#qClear', root);

    function draw() {
      const { list, tokens } = search(ui.q, ui.group, ui.onlyStar);
      const shown = list.slice(0, ui.limit);
      const autoOpen = tokens.length > 0 && list.length <= 6;
      let html = '';
      if (!tokens.length) {
        // обзор: заголовки по базовым глаголам
        let last = '';
        for (const it of shown) {
          if (it.v.group !== last) {
            last = it.v.group;
            html += `<h2 class="group-title">${U.esc(last)}</h2>`;
          }
          html += verbHtml(it, tokens, false);
        }
      } else {
        html = shown.map((it) => verbHtml(it, tokens, autoOpen)).join('');
      }
      if (!list.length) {
        html = `<div class="empty"><div class="empty-emoji">🤷</div><p>Ничего не нашлось по запросу «${U.esc(ui.q)}».</p><p class="muted">Попробуйте часть слова: <b>брос</b>, <b>give</b>, <b>up to</b>.</p></div>`;
      }
      $res.innerHTML = html;
      const n = list.length;
      $info.textContent = tokens.length || ui.group || ui.onlyStar
        ? `Найдено: ${n} ${U.plural(n, 'глагол', 'глагола', 'глаголов')}`
        : `${PV.verbs.length} фразовых глаголов, ${PV.cards.length} значений. Нажмите на глагол, чтобы увидеть примеры.`;
      $more.hidden = list.length <= shown.length;
      $more.textContent = `Показать ещё (${list.length - shown.length})`;
      $clear.hidden = !ui.q;
    }

    let timer;
    $q.addEventListener('input', () => {
      ui.q = $q.value;
      ui.limit = PAGE;
      clearTimeout(timer);
      timer = setTimeout(draw, 80);
    });
    $clear.addEventListener('click', () => {
      ui.q = '';
      $q.value = '';
      ui.limit = PAGE;
      draw();
      $q.focus();
    });
    U.$('#fGroup', root).addEventListener('change', (e) => {
      ui.group = e.target.value;
      ui.limit = PAGE;
      draw();
    });
    U.$('#fStar', root).addEventListener('change', (e) => {
      ui.onlyStar = e.target.checked;
      ui.limit = PAGE;
      draw();
    });
    U.$('#fRu', root).addEventListener('change', (e) => {
      ui.showRu = e.target.checked;
      $res.classList.toggle('hide-ru', !ui.showRu);
    });
    $more.addEventListener('click', () => {
      ui.limit += PAGE;
      draw();
    });

    $res.addEventListener('click', (e) => {
      const star = e.target.closest('[data-star]');
      if (star) {
        const on = PV.store.toggleStar(star.dataset.star);
        star.classList.toggle('on', on);
        star.textContent = on ? '★' : '☆';
        PV.app && PV.app.refreshSetCount();
        return;
      }
      const head = e.target.closest('.v-head');
      if (head && !e.target.closest('[data-speak]')) {
        const art = head.parentElement;
        const open = art.classList.toggle('open');
        head.setAttribute('aria-expanded', open);
      }
    });
    $res.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('v-head')) {
        e.preventDefault();
        e.target.click();
      }
    });

    draw();
    if (matchMedia('(hover: hover)').matches) $q.focus();
  }

  PV.search = { render, destroy() {} };
})(window.PV);
