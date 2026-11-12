/* Автор, ссылки, маскот с мотивирующими фразами, раздел «Автор и курс» */
window.PV = window.PV || {};

(function (PV) {
  const U = PV.util;

  const LINKS = {
    channel: 'https://t.me/+nG3IXuGenxdiZDBi',
    course: 'http://t.me/kellyumsch_bot?start=telegramkellypin112026ab_gk27',
  };
  const AUTHOR = 'Шерин Келли';
  const AUTHOR_TAG = 'ЕГЭ английский язык';

  const IMG = {
    hello: 'hello.webp',
    wow: 'wow.webp',
    wink: 'wink.webp',
    super: 'super.webp',
  };

  const PHRASES = {
    start: [
      'Пара фразовых глаголов в день — и к экзамену их будут сотни!',
      'Маленькими шагами к 80+. Начнём?',
      'Ты уже здесь — значит, половина дела сделана ✨',
      'Регулярность сильнее таланта. 10 минут — и ты молодец!',
      'Сегодня учим, завтра щёлкаем задания ЕГЭ как орешки.',
      'Не бойся ошибок — они показывают, что повторить.',
    ],
    great: [
      'Вау, это уровень 80+! Так держать!',
      'Умница! Ещё немного — и ЕГЭ не страшен.',
      'Вот это результат! Я тобой горжусь 💜',
    ],
    good: [
      'Хороший результат! Повтори ошибки — и будет ещё лучше.',
      'Уже отлично! Ещё пара повторений — и всё запомнится.',
    ],
    low: [
      'Ничего страшного! Ошибки — лучшая подсказка, что повторить.',
      'Каждый круг делает тебя сильнее. Попробуем ещё раз?',
      'Главное — не останавливаться. У тебя получится!',
    ],
  };

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /** Маскот с облачком-фразой. kind: hello|wow|wink|super; mood: ключ PHRASES или своя строка */
  function mascot(kind, mood, extraClass = '') {
    const text = PHRASES[mood] ? pick(PHRASES[mood]) : mood;
    return `<div class="mascot ${extraClass}">
      <img class="mascot-img" src="${IMG[kind]}" alt="Маскот ${AUTHOR}" width="120" height="110" loading="lazy">
      <div class="mascot-bubble">${U.esc(text)}</div>
    </div>`;
  }

  /** Маскот и фраза по проценту результата */
  function byScore(pct) {
    if (pct >= 85) return mascot('super', 'great', 'mascot-center');
    if (pct >= 60) return mascot('wink', 'good', 'mascot-center');
    return mascot('hello', 'low', 'mascot-center');
  }

  const ext = 'target="_blank" rel="noopener"';

  /** Небольшой блок со ссылкой на курс (для экранов результатов) */
  function courseNudge() {
    return `<a class="course-nudge" href="${LINKS.course}" ${ext}>
      <span><span class="script">хочешь</span> сдать ЕГЭ на <b>80+</b>? Записаться на курс</span><span class="arrow" aria-hidden="true">→</span></a>`;
  }

  /** Обложка на главной: полосы, рамка, крупный заголовок, маскот в марочной рамке */
  function banner() {
    return `<section class="hero">
      <div class="hero-frame">
        <div class="hero-text">
          <p class="script hero-script">учим легко</p>
          <h1 class="hero-title">Фразовые глаголы<br>для ЕГЭ</h1>
          <p class="hero-meta">${PV.verbs.length} глаголов · ${PV.cards.length} значений · by ${AUTHOR}</p>
          <div class="ab-links">
            <a class="pill pill-violet" href="${LINKS.course}" ${ext}>Курс ЕГЭ на 80+</a>
            <a class="pill pill-pink" href="${LINKS.channel}" ${ext}>Telegram-канал</a>
            <a class="pill pill-blue" href="#about">Материалы</a>
          </div>
        </div>
        <figure class="hero-pic">
          <div class="stamp"><img src="${IMG.wink}" alt="Маскот ${AUTHOR}" width="220" height="200"></div>
          <figcaption class="hero-bubble">${U.esc(pick(PHRASES.start))}</figcaption>
        </figure>
      </div>
    </section>`;
  }

  function footer() {
    return `<footer class="site-footer">
      <div class="sf-inner">
        <div><span class="script sf-name">${AUTHOR}</span><span class="sf-tag">${AUTHOR_TAG}</span></div>
        <div class="sf-links">
          <a href="${LINKS.channel}" ${ext}>Telegram-канал ↗</a>
          <a href="${LINKS.course}" ${ext}>Курс ЕГЭ на 80+ ↗</a>
        </div>
      </div>
    </footer>`;
  }

  /** Раздел «Автор и курс» */
  const about = {
    render(root) {
      root.innerHTML = `
        <section class="page about-page">
          <div class="hero about-hero">
            <div class="hero-frame">
              <div class="hero-text">
                <p class="script hero-script">автор тренажёра</p>
                <h1 class="hero-title">${AUTHOR}</h1>
                <p class="hero-meta">${AUTHOR_TAG}</p>
                <p>Готовлю к ЕГЭ по английскому языку уже больше 6 лет. Обучалась в Лондоне, выпустила 3000+ высокобалльников и 39 стобалльников и сама сдала ЕГЭ на 100.<br>Обучаю языку легко и без зубрёжки!</p>
              </div>
              <figure class="hero-pic"><div class="stamp"><img src="${IMG.hello}" alt="${AUTHOR}" width="220" height="200"></div></figure>
            </div>
          </div>

          <div class="about-grid">
            <a class="about-card card-blue" href="${LINKS.channel}" ${ext}>
              <div class="ac-num">01</div>
              <h3>Telegram-канал</h3>
              <p>Разборы заданий, лайфхаки и полезности для подготовки к ЕГЭ по английскому.</p>
              <span class="ac-cta">Подписаться →</span>
            </a>
            <a class="about-card card-pink" href="${LINKS.channel}" ${ext}>
              <div class="ac-num">02</div>
              <h3>Материалы для подготовки</h3>
              <p>Все материалы собраны <b>в закрепе канала</b>: открой канал и нажми на закреплённое сообщение сверху.</p>
              <span class="ac-cta">Открыть материалы →</span>
            </a>
            <a class="about-card card-violet" href="${LINKS.course}" ${ext}>
              <div class="ac-num">03</div>
              <h3>Курс подготовки к ЕГЭ на 80+</h3>
              <p>Системная подготовка ко всем заданиям экзамена. Запишись через бота — он расскажет подробности.</p>
              <span class="ac-cta">Записаться на курс →</span>
            </a>
          </div>

          ${mascot('super', 'start', 'mascot-center')}
        </section>`;
    },
  };

  PV.author = { LINKS, mascot, byScore, courseNudge, banner, footer, about };
})(window.PV);
