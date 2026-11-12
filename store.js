/* Хранение прогресса и настроек в localStorage (с запасным вариантом в памяти) */
window.PV = window.PV || {};

(function (PV) {
  const KEY = 'pv.progress.v1';

  const defaults = () => ({
    settings: {
      dir: 'en', // что показываем как термин: en | ru | mix
      scope: 'all', // all | starred | unlearned | mistakes
      groups: [], // пусто = все базовые глаголы
      theme: 'auto',
      showTranslations: true,
    },
    stars: {}, // id значения -> true
    stats: {}, // id значения -> {ok, bad, streak, last}
    best: { match: null, gravity: 0 },
  });

  let state = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const d = defaults();
      state = {
        settings: Object.assign(d.settings, saved.settings || {}),
        stars: saved.stars || {},
        stats: saved.stats || {},
        best: Object.assign(d.best, saved.best || {}),
      };
    }
  } catch (e) {
    /* хранилище недоступно — работаем без сохранения */
  }

  let timer;
  const flush = () => {
    clearTimeout(timer);
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* игнорируем */
    }
  };
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(flush, 150);
  };
  // не терять последние изменения при закрытии вкладки
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });

  PV.store = {
    get settings() {
      return state.settings;
    },
    get best() {
      return state.best;
    },
    set(key, value) {
      state.settings[key] = value;
      save();
    },
    setBest(key, value) {
      state.best[key] = value;
      save();
    },
    isStar: (id) => !!state.stars[id],
    toggleStar(id) {
      if (state.stars[id]) delete state.stars[id];
      else state.stars[id] = true;
      save();
      return !!state.stars[id];
    },
    starCount: () => Object.keys(state.stars).length,
    stat: (id) => state.stats[id] || { ok: 0, bad: 0, streak: 0, last: 0 },
    /** Записать результат ответа по карточке. */
    rec(id, ok) {
      const s = state.stats[id] || { ok: 0, bad: 0, streak: 0, last: 0 };
      if (ok) {
        s.ok++;
        s.streak++;
      } else {
        s.bad++;
        s.streak = 0;
      }
      s.last = Date.now();
      state.stats[id] = s;
      save();
    },
    /** Серия верных ответов подряд (нужна, чтобы отменить ошибку при самозачёте). */
    streakOf: (id) => (state.stats[id] ? state.stats[id].streak : 0),
    /** Ученик засчитал себе ответ: убираем записанную ошибку, ставим верный. */
    amend(id, prevStreak) {
      const s = state.stats[id];
      if (!s) return;
      s.bad = Math.max(0, s.bad - 1);
      s.ok++;
      s.streak = prevStreak + 1;
      save();
    },
    isLearned: (id) => (state.stats[id] ? state.stats[id].streak >= 2 : false),
    hasMistakes: (id) => (state.stats[id] ? state.stats[id].bad > 0 && state.stats[id].streak < 2 : false),
    learnedCount: () => Object.values(state.stats).filter((s) => s.streak >= 2).length,
    resetProgress() {
      state.stats = {};
      save();
    },
  };
})(window.PV);
