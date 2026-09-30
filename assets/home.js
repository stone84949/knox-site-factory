'use strict';

/* Home-page behavior: header, menu, compare slider, scorecard, calculator,
   mobile action bar. Form validation + reveal live in site.js. */

function jobsToCover(cost, jobValue) {
  const value = Number(jobValue);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.ceil(cost / value);
}

function scoreVerdict(score, total) {
  if (score <= Math.floor(total * 0.3)) {
    return 'Your site is probably making customers work too hard.';
  }
  if (score < total - 1) {
    return 'A workable start, with gaps that cost calls.';
  }
  return 'The basics are covered. The gains now are in the details.';
}

function money(value) {
  return '$' + Number(value).toLocaleString('en-US');
}

function initHeader() {
  const header = document.querySelector('[data-site-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.getElementById('site-nav');

  if (header) {
    const sync = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', sync, { passive: true });
    sync();
  }

  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        setOpen(false);
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
  }
}

function initCompare() {
  const range = document.getElementById('compare-range');
  const after = document.querySelector('.compare-after');
  const divider = document.querySelector('.compare-divider');
  if (!range || !after || !divider) {
    return;
  }
  const sync = () => {
    const value = Number(range.value);
    after.style.clipPath = 'inset(0 ' + (100 - value) + '% 0 0)';
    divider.style.left = value + '%';
  };
  range.addEventListener('input', sync);
  sync();
}

function initScorecard() {
  const card = document.querySelector('[data-scorecard]');
  if (!card) {
    return;
  }
  const boxes = Array.from(document.querySelectorAll('[data-check]'));
  const number = card.querySelector('[data-score]');
  const meter = card.querySelector('[data-meter]');
  const verdict = card.querySelector('[data-verdict]');
  const gaps = card.querySelector('[data-gaps]');
  const cta = card.querySelector('[data-score-cta]');
  const note = document.getElementById('sales-note');

  const update = () => {
    const score = boxes.filter((box) => box.checked).length;
    const missing = boxes.filter((box) => !box.checked).map((box) => box.dataset.check);
    number.textContent = String(score);
    meter.style.width = Math.round((score / boxes.length) * 100) + '%';
    verdict.textContent = scoreVerdict(score, boxes.length);
    gaps.textContent = missing.length
      ? 'Still missing: ' + missing.join(' · ')
      : 'Nothing missing from this list.';
    card.dataset.summary = 'My site self-check: ' + score + ' of ' + boxes.length + '.'
      + (missing.length ? ' Missing: ' + missing.join(', ') + '.' : '');
  };

  boxes.forEach((box) => box.addEventListener('change', update));

  if (cta && note) {
    cta.addEventListener('click', () => {
      const line = card.dataset.summary || '';
      if (line && !note.value.includes(line)) {
        note.value = note.value ? note.value + '\n' + line : line;
      }
    });
  }
  update();
}

function initCalculator() {
  const range = document.getElementById('job-value');
  if (!range) {
    return;
  }
  const label = document.querySelector('[data-job-value]');
  const launch = document.querySelector('[data-launch-jobs]');
  const care = document.querySelector('[data-care-jobs]');
  const launchLabel = document.querySelector('[data-launch-label]');
  const careLabel = document.querySelector('[data-care-label]');

  const sync = () => {
    const value = Number(range.value);
    const launchJobs = jobsToCover(1500, value);
    const careJobs = jobsToCover(99 * 12, value);
    label.textContent = money(value);
    launch.textContent = String(launchJobs);
    care.textContent = String(careJobs);
    launchLabel.textContent = launchJobs === 1 ? 'job covers the $1,500 launch' : 'jobs cover the $1,500 launch';
    careLabel.textContent = careJobs === 1 ? 'job a year covers $99 / month care' : 'jobs a year cover $99 / month care';
  };
  range.addEventListener('input', sync);
  sync();
}

function initMobileBar() {
  const bar = document.querySelector('[data-mobile-bar]');
  const hero = document.getElementById('hero');
  const contact = document.getElementById('contact');
  if (!bar || !hero || !('IntersectionObserver' in window)) {
    return;
  }
  const state = { heroVisible: true, contactVisible: false };
  const sync = () => bar.classList.toggle('is-visible', !state.heroVisible && !state.contactVisible);
  new IntersectionObserver((entries) => {
    state.heroVisible = entries[0].isIntersecting;
    sync();
  }, { threshold: 0.05 }).observe(hero);
  if (contact) {
    new IntersectionObserver((entries) => {
      state.contactVisible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.05 }).observe(contact);
  }
}

if (typeof document !== 'undefined') {
  initHeader();
  initCompare();
  initScorecard();
  initCalculator();
  initMobileBar();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { jobsToCover, scoreVerdict };
}
