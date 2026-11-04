/* Bora Signs — shared site script: menu, cart, Meta pixel, videos, lightbox */
(() => {
  const PIXEL_ID = '1112094258178143';
  const IMG = 'https://cdn.shopify.com/s/files/1/0812/9517/9812/files/OF2G-magnetic-van-sign-panel_abb443e7-6337-4174-9ced-c93de367148b.webp?width=200';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const money = p => '£' + (p / 100).toFixed(2);

  /* ---------- Storage (can be blocked in private windows) ---------- */
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  /* ---------- Meta pixel (loaded after the page is usable) ---------- */
  window.fbq = window.fbq || function () { (fbq.q = fbq.q || []).push(arguments); };
  fbq.loaded = true; fbq.version = '2.0'; fbq.queue = fbq.q = fbq.q || [];
  fbq.push = fbq; fbq.callMethod = null;
  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');
  const loadPixel = () => {
    const s = document.createElement('script');
    s.async = true; s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
  };
  if (document.readyState === 'complete') setTimeout(loadPixel, 1200);
  else addEventListener('load', () => setTimeout(loadPixel, 1200), { once: true });

  /* ---------- Cart ---------- */
  const cart = {
    items: () => store.get('bora_cart', []),
    save(items) { store.set('bora_cart', items); render(); },
    count: () => cart.items().reduce((n, i) => n + i.qty, 0),
    total: () => cart.items().reduce((n, i) => n + i.qty * i.price, 0),
    add(item) {
      const items = cart.items();
      const key = item.id + '|' + item.van.join('|');
      const hit = items.find(i => i.key === key);
      if (hit) hit.qty = Math.min(10, hit.qty + 1);
      else items.push({ ...item, key, qty: 1 });
      cart.save(items);
    },
    setQty(key, qty) {
      let items = cart.items();
      items = qty < 1 ? items.filter(i => i.key !== key)
        : items.map(i => i.key === key ? { ...i, qty: Math.min(10, qty) } : i);
      cart.save(items);
    },
    clear() { cart.save([]); }
  };
  window.BoraCart = cart;

  const lineHTML = i => `
    <div class="line">
      <img src="${IMG}" alt="" width="72" height="72" loading="lazy">
      <div>
        <h4>Magnetic Van Signs</h4>
        <p>${i.size} / ${i.sides}</p>
        <p>${esc(i.van[0])} ${esc(i.van[1])} · ${esc(i.van[3])} · ${esc(i.van[2])}</p>
        <div class="qty">
          <button type="button" data-q="${i.key}" data-d="-1" aria-label="Decrease quantity">−</button>
          <span>${i.qty}</span>
          <button type="button" data-q="${i.key}" data-d="1" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="line__price">${money(i.price * i.qty)}
        <button type="button" class="link-btn" data-rm="${i.key}">Remove</button>
      </div>
    </div>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  window.BoraLineHTML = lineHTML;
  window.BoraMoney = money;
  window.BoraEsc = esc;

  function render() {
    const n = cart.count();
    $$('.cart-count').forEach(el => { el.textContent = n; el.hidden = !n; });
    const body = $('#cart-body');
    if (!body) return;
    const items = cart.items();
    body.innerHTML = items.length ? items.map(lineHTML).join('')
      : '<div class="empty"><p>Your basket is empty.</p><a class="btn" href="/products/magnetic-van-signs/">Design your signs</a></div>';
    $('#cart-total').textContent = money(cart.total());
    $('#cart-ft').hidden = !items.length;
  }

  const drawer = $('#cart');
  const openCart = () => { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); $('#cart-close').focus(); };
  const closeCart = () => { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); };
  window.BoraOpenCart = openCart;

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-open-cart],[data-close-cart],[data-q],[data-rm],[data-menu]');
    if (!t) return;
    if (t.matches('[data-open-cart]')) { e.preventDefault(); openCart(); }
    else if (t.matches('[data-close-cart]')) closeCart();
    else if (t.matches('[data-q]')) {
      const i = cart.items().find(x => x.key === t.dataset.q);
      if (i) cart.setQty(i.key, i.qty + +t.dataset.d);
    } else if (t.matches('[data-rm]')) cart.setQty(t.dataset.rm, 0);
    else if (t.matches('[data-menu]')) {
      const m = $('#menu'); const open = m.classList.toggle('is-open');
      t.setAttribute('aria-expanded', open);
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCart(); closeLb(); } });

  $('#cart-checkout')?.addEventListener('click', () => {
    fbq('track', 'InitiateCheckout', { value: cart.total() / 100, currency: 'GBP', num_items: cart.count() });
  });
  addEventListener('storage', e => { if (e.key === 'bora_cart') render(); });
  render();

  /* ---------- Videos: nothing downloads until tapped ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('.vid[data-src]');
    if (!b) return;
    const v = document.createElement('video');
    v.src = b.dataset.src; v.poster = $('img', b)?.src || '';
    v.controls = true; v.autoplay = true; v.playsInline = true;
    const box = document.createElement('div');
    box.className = 'vid';
    box.appendChild(v);
    b.replaceWith(box);
  });

  /* ---------- Lightbox ---------- */
  const lb = $('#lb');
  let set = [], idx = 0;
  const show = () => { $('img', lb).src = set[idx].src; $('figcaption', lb).textContent = set[idx].cap || ''; };
  function closeLb() { lb?.classList.remove('is-open'); }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-lb]');
    if (b) {
      const group = b.dataset.lb;
      const all = $$(`[data-lb="${group}"]`);
      set = all.map(x => ({ src: x.dataset.full, cap: x.dataset.cap }));
      idx = all.indexOf(b); show(); lb.classList.add('is-open');
      return;
    }
    if (!lb?.classList.contains('is-open')) return;
    if (e.target.closest('.lb__x') || e.target === lb) closeLb();
    else if (e.target.closest('.lb__p')) { idx = (idx - 1 + set.length) % set.length; show(); }
    else if (e.target.closest('.lb__n')) { idx = (idx + 1) % set.length; show(); }
  });
})();
