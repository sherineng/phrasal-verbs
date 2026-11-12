/* Утилиты общего назначения */
window.PV = window.PV || {};

(function (PV) {
  const U = (PV.util = {});

  U.esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Нормализация для сравнения: нижний регистр, ё→е, без пунктуации. */
  U.norm = (s) =>
    String(s)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  U.lev = (a, b) => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  };

  U.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  U.pick = (arr, n) => U.shuffle(arr).slice(0, n);

  U.$ = (sel, root = document) => root.querySelector(sel);
  U.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Подсветка слов запроса в тексте (безопасно для HTML, е/ё считаются одной буквой). */
  U.highlight = (text, tokens) => {
    const toks = (tokens || []).filter(Boolean);
    if (!toks.length) return U.esc(text);
    const pat = toks
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[её]/gi, '[её]'))
      .sort((a, b) => b.length - a.length)
      .join('|');
    const re = new RegExp('(' + pat + ')', 'gi');
    return String(text)
      .split(re)
      .map((part, i) => (i % 2 ? '<mark>' + U.esc(part) + '</mark>' : U.esc(part)))
      .join('');
  };

  /** Озвучка английского текста средствами браузера. */
  U.speak = (text) => {
    try {
      if (!('speechSynthesis' in window)) return U.toast('Озвучка не поддерживается в этом браузере');
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/\(.*?\)/g, ' ').replace(/\bsmb\/smth\b|\bsmb\b|\bsmth\b/g, 'something'));
      u.lang = 'en-GB';
      u.rate = 0.92;
      window.speechSynthesis.speak(u);
    } catch (e) {
      /* озвучка необязательна */
    }
  };

  let toastTimer;
  U.toast = (msg) => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  };

  U.plural = (n, one, few, many) => {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  };

  U.fmtTime = (ms) => {
    const s = ms / 1000;
    return s < 60 ? s.toFixed(1) + ' с' : Math.floor(s / 60) + ' мин ' + Math.round(s % 60) + ' с';
  };

  /** Озвучка через синтезатор браузера. Выключена: голос звучит неестественно. true — вернуть кнопки 🔊. */
  U.SPEECH = false;

  U.speakBtn = (text) =>
    !U.SPEECH
      ? ''
      : `<button class="icon-btn sm" type="button" data-speak="${U.esc(text)}" title="Озвучить" aria-label="Озвучить">🔊</button>`;

  /** Делегирование клика по [data-speak] для любого контейнера. */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-speak]');
    if (b) {
      e.preventDefault();
      e.stopPropagation();
      U.speak(b.getAttribute('data-speak'));
    }
  });
})(window.PV);
