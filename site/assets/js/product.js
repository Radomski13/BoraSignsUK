/* Bora Signs — product page: van finder, options, add to basket, gallery, payback slider */
(async () => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const money = p => '£' + (p / 100).toFixed(2);

  /* Gallery thumbnails */
  const main = $('#g-main');
  $$('.gallery__thumbs button').forEach(b => b.addEventListener('click', () => {
    $$('.gallery__thumbs button').forEach(x => x.setAttribute('aria-current', 'false'));
    b.setAttribute('aria-current', 'true');
    main.src = b.dataset.src; main.alt = b.dataset.alt;
  }));

  /* Reviews: show 6 at a time */
  $('#more-revs')?.addEventListener('click', e => {
    $$('#revs .rev[hidden]').slice(0, 6).forEach(r => r.hidden = false);
    if (!$('#revs .rev[hidden]')) e.currentTarget.parentElement.remove();
  });

  /* Payback slider */
  const range = $('#pb-range');
  if (range) {
    const upd = () => {
      const v = +range.value, jobs = Math.max(1, Math.ceil(230 / v));
      $('#pb-val').textContent = v >= 1000 ? '£1000+' : '£' + v;
      $('#pb-jobs').textContent = jobs + (jobs === 1 ? ' job' : ' jobs');
    };
    range.addEventListener('input', upd); upd();
  }

  const cat = await fetch('/assets/data/catalog.json?v=20261104').then(r => r.json());
  const vans = cat.vans; // [make, model, wheelbase, size, from, to]
  const make = $('#van-make'), model = $('#van-model'), year = $('#van-year'), wb = $('#van-wb');
  const opts = (sel, label, list) => {
    sel.innerHTML = `<option value="">${label}</option>` + list.map(v => `<option>${v}</option>`).join('');
    sel.disabled = !list.length;
  };
  const uniq = a => [...new Set(a)];
  opts(make, 'Select make', uniq(vans.map(v => v[0])).sort());
  opts(model, 'Select model', []); opts(year, 'Select', []); opts(wb, 'Select', []);

  let size = null;
  const sideInputs = $$('input[name="sides"]');
  const sides = () => $('input[name="sides"]:checked')?.value;
  const variant = () => cat.variants.find(v => v.size === size && v.sides === sides());
  const priceFor = (sz, sd) => cat.variants.find(v => v.size === sz && v.sides === sd)?.price;
  // Before a van is picked, show the lowest price for each option
  const fromPrice = sd => Math.min(...cat.variants.filter(v => v.sides === sd).map(v => v.price));
  const saving = sz => priceFor(sz, 'Sides Only') + priceFor(sz, 'Back Only') - priceFor(sz, 'Sides & Back');

  function refresh() {
    const show = sd => size ? money(priceFor(size, sd)) : 'from £' + fromPrice(sd) / 100;
    sideInputs.forEach(i => { $(`label[for="${i.id}"] [data-side-price]`).textContent = show(i.value); });
    const save = $('[data-save]');
    if (save) save.textContent = size ? `Save £${saving(size) / 100}` : `Save up to £${Math.max(...cat.sizes.map(saving)) / 100}`;
    $$('[data-price]').forEach(el => el.textContent = show(sides()));
    $('#van-match').classList.toggle('is-on', !!size);
    if (size) $('#van-match').textContent = `✓ Your van takes our ${size} size. We'll cut your signs to fit.`;
  }

  make.addEventListener('change', () => {
    opts(model, 'Select model', uniq(vans.filter(v => v[0] === make.value).map(v => v[1])).sort());
    opts(year, 'Select', []); opts(wb, 'Select', []); size = null; refresh();
  });
  model.addEventListener('change', () => {
    const rows = vans.filter(v => v[0] === make.value && v[1] === model.value);
    const ys = [];
    rows.forEach(r => { for (let y = r[5]; y >= r[4]; y--) ys.push(y); });
    opts(year, 'Select', uniq(ys).sort((a, b) => b - a));
    opts(wb, 'Select', []); size = null; refresh();
  });
  year.addEventListener('change', () => {
    const y = +year.value;
    opts(wb, 'Select', uniq(vans.filter(v => v[0] === make.value && v[1] === model.value && y >= v[4] && y <= v[5]).map(v => v[2])));
    size = null; refresh();
  });
  wb.addEventListener('change', () => {
    const y = +year.value;
    const row = vans.find(v => v[0] === make.value && v[1] === model.value && v[2] === wb.value && y >= v[4] && y <= v[5]);
    size = row ? row[3] : null;
    $('#van-err').hidden = true;
    refresh();
  });
  sideInputs.forEach(i => i.addEventListener('change', refresh));
  refresh();

  if (window.fbq) fbq('track', 'ViewContent', { content_name: 'Magnetic Van Signs', content_type: 'product', value: 230, currency: 'GBP' });

  /* Add to basket */
  $$('[data-add]').forEach(btn => btn.addEventListener('click', () => {
    if (!size || !wb.value) {
      $('#van-err').hidden = false;
      $('#finder').scrollIntoView({ behavior: 'smooth', block: 'center' });
      (make.value ? (model.value ? (year.value ? wb : year) : model) : make).focus({ preventScroll: true });
      return;
    }
    const v = variant();
    BoraCart.add({ id: v.id, size: v.size, sides: v.sides, price: v.price, van: [make.value, model.value, year.value, wb.value] });
    if (window.fbq) fbq('track', 'AddToCart', { content_ids: [v.id], content_type: 'product', value: v.price / 100, currency: 'GBP' });
    BoraOpenCart();
  }));

  /* Sticky buy bar on phones once the main button scrolls away */
  const bar = $('#mobile-bar'), mainBtn = $('#add-main');
  if (bar && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => bar.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 0))
      .observe(mainBtn);
  }
})();
