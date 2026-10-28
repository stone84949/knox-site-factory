/* KSF SAMPLE KIT — shared behavior for single-page sample sites.
   Reads <script type="application/json" id="sample-data">{phone, tel, advice}</script>.
   Problem chooser, quote-form prefill, and a staged quote form that sends nothing. */
(function () {
  'use strict';
  var dataEl = document.getElementById('sample-data');
  if (!dataEl) return;
  var D = JSON.parse(dataEl.textContent);
  var box = document.getElementById('advice');
  var form = document.getElementById('quote');
  var issue = document.getElementById('q-issue');

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function list(a) { return a.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join(''); }

  function render(key) {
    var a = D.advice[key];
    if (!a || !box) return;
    box.innerHTML = '<h3>' + esc(a.t) + '</h3><div class="cols">' +
      '<div><h4><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>Check these first</h4><ul>' + list(a.check) + '</ul></div>' +
      '<div class="call-if"><h4><svg class="icon" aria-hidden="true"><use href="#i-phone"/></svg>Call now if</h4><ul>' + list(a.call) + '</ul></div></div>' +
      '<div class="actions"><a class="btn" href="tel:' + esc(D.tel) + '"><svg class="icon" aria-hidden="true"><use href="#i-phone"/></svg><span class="tnum">Call ' + esc(D.phone) + '</span></a>' +
      '<a class="textlink" href="#contact" data-prefill="' + esc(a.form) + '">Send this as a quote request <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a></div>';
  }

  var choices = document.querySelectorAll('.choice');
  choices.forEach(function (b) {
    b.addEventListener('click', function () {
      choices.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      render(b.dataset.key);
      if (issue && D.advice[b.dataset.key]) issue.value = D.advice[b.dataset.key].form;
    });
  });
  var first = document.querySelector('.choice[aria-pressed="true"]') || choices[0];
  if (first) render(first.dataset.key);

  document.addEventListener('click', function (e) {
    var p = e.target.closest('[data-prefill]');
    if (p && issue) issue.value = p.dataset.prefill;
  });

  if (!form) return;
  function setErr(name, msg) {
    var f = form.querySelector('[data-f="' + name + '"]');
    var e = document.getElementById('e-' + name);
    var input = f.querySelector('input,select');
    if (msg) { f.setAttribute('data-bad', ''); e.textContent = msg; input.setAttribute('aria-invalid', 'true'); }
    else { f.removeAttribute('data-bad'); e.textContent = ''; input.removeAttribute('aria-invalid'); }
    return !msg;
  }
  function check() {
    var ok = true, firstBad = null;
    if (!setErr('name', form.elements.name.value.trim() ? '' : 'Add your name so we know who to ask for.')) { ok = false; firstBad = firstBad || form.elements.name; }
    var digits = form.elements.phone.value.replace(/\D/g, '');
    var pm = !digits ? 'Add a phone number so we can call you back.' : (digits.length < 10 ? 'That number looks short. Include the area code, like 865-555-0123.' : '');
    if (!setErr('phone', pm)) { ok = false; firstBad = firstBad || form.elements.phone; }
    if (!setErr('town', form.elements.town.value ? '' : 'Pick your town, or "Somewhere else".')) { ok = false; firstBad = firstBad || form.elements.town; }
    return { ok: ok, first: firstBad };
  }
  ['name', 'phone', 'town'].forEach(function (n) {
    form.elements[n].addEventListener('blur', function () { if (form.dataset.tried) check(); });
  });
  var st = document.getElementById('status');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    form.dataset.tried = '1';
    var r = check();
    if (!r.ok) { st.textContent = 'Fix the highlighted fields, then send again.'; st.style.color = 'var(--err)'; r.first.focus(); return; }
    st.textContent = '';
    form.classList.add('sent');
    document.getElementById('done').focus();
  });
  document.getElementById('again').addEventListener('click', function () {
    form.reset(); delete form.dataset.tried; form.classList.remove('sent'); form.elements.name.focus();
  });
})();
