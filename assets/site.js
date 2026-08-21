'use strict';

function isCompleteWebsite(value) {
  try {
    const website = new URL(value);
    return ['http:', 'https:'].includes(website.protocol) && website.hostname.includes('.');
  } catch {
    return false;
  }
}

function validateInquiry(inquiry, requirements = {}) {
  const errors = {};
  const name = String(inquiry.name || '').trim();
  const email = String(inquiry.email || '').trim();
  const business = String(inquiry.business || '').trim();
  const website = String(inquiry.website || '').trim();

  if (!name) {
    errors.name = 'Enter your name.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (requirements.requireBusiness && !business) {
    errors.business = 'Enter the business name.';
  }

  if (requirements.requireWebsite && !isCompleteWebsite(website)) {
    errors.website = 'Enter a complete website address, including https://.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

function stagedResponse(kind) {
  if (kind === 'demo') {
    return 'Demo complete — no information was sent. A live client site would route this request to the business.';
  }

  return 'Your details look ready. This staging page is not connected to an inbox, so no information was sent.';
}

function applyFormChoice(form, fieldName, value) {
  const control = form?.elements?.namedItem(fieldName);
  const optionExists = control && Array.from(control.options || []).some((option) => option.value === value);

  if (!optionExists) {
    return false;
  }

  control.value = value;
  return true;
}

function handleFormChoice(event) {
  const choice = event.target.closest('[data-form-choice]');
  if (!choice) {
    return;
  }

  const target = document.querySelector(choice.hash);
  const form = target?.matches('form') ? target : target?.querySelector('form');
  const fieldName = choice.dataset.choiceField;

  if (!form || !applyFormChoice(form, fieldName, choice.dataset.formChoice)) {
    return;
  }

  const control = form.elements.namedItem(fieldName);
  const status = form.querySelector('[data-form-status]');
  if (status) {
    status.textContent = `Selected “${choice.dataset.formChoice}.” Add contact details to check this demo request.`;
  }
  requestAnimationFrame(() => control.focus({ preventScroll: true }));
}

function handleStagedForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const result = validateInquiry({
    name: data.get('name'),
    email: data.get('email'),
    business: data.get('business'),
    website: data.get('website'),
  }, {
    requireBusiness: form.hasAttribute('data-require-business'),
    requireWebsite: form.hasAttribute('data-require-website'),
  });

  form.querySelectorAll('[data-error-for]').forEach((element) => {
    element.textContent = result.errors[element.dataset.errorFor] || '';
  });

  const status = form.querySelector('[data-form-status]');
  if (!result.valid) {
    status.textContent = 'Check the marked fields and try again.';
    return;
  }

  status.textContent = stagedResponse(form.dataset.formKind || 'sales');
  form.reset();
}

function initReveal() {
  const revealables = document.querySelectorAll('[data-reveal]');
  if (!revealables.length) {
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealables.forEach((element) => element.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  revealables.forEach((element) => observer.observe(element));
}

if (typeof document !== 'undefined') {
  document.documentElement.classList.replace('no-js', 'js');
  document.addEventListener('click', handleFormChoice);
  document.querySelectorAll('[data-staged-form]').forEach((form) => {
    form.addEventListener('submit', handleStagedForm);
  });
  initReveal();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyFormChoice, validateInquiry, stagedResponse };
}
