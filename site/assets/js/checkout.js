/* Bora Signs — checkout: order summary + Stripe embedded payment form */
(async () => {
  const $ = s => document.querySelector(s);
  const items = BoraCart.items();
  const box = $('#stripe-checkout');

  /* Order summary */
  const total = BoraCart.total();
  $('#co-lines').innerHTML = items.map(i => `
    <div class="line">
      <div class="co__thumb"><img src="https://cdn.shopify.com/s/files/1/0812/9517/9812/files/OF2G-magnetic-van-sign-panel_abb443e7-6337-4174-9ced-c93de367148b.webp?width=160" alt="" width="64" height="64"><em>${i.qty}</em></div>
      <div><h4>Magnetic Van Signs</h4><p>${i.size} / ${i.sides}</p><p>${BoraEsc(i.van[0])} ${BoraEsc(i.van[1])} · ${BoraEsc(i.van[3])} · ${BoraEsc(i.van[2])}</p></div>
      <div class="line__price">${BoraMoney(i.price * i.qty)}</div>
    </div>`).join('');
  document.querySelectorAll('[data-total]').forEach(el => el.textContent = BoraMoney(total));
  $('#co-toggle').addEventListener('click', e => {
    const side = $('.co__side'); const open = side.classList.toggle('is-open');
    e.currentTarget.setAttribute('aria-expanded', open);
    e.currentTarget.querySelector('span').textContent = open ? 'Hide order summary' : 'Show order summary';
  });

  if (!items.length) {
    box.innerHTML = '<div class="co__loading"><div><p>Your basket is empty.</p><a class="btn" href="/products/magnetic-van-signs/">Design your signs</a></div></div>';
    return;
  }

  const fail = msg => {
    box.innerHTML = `<div class="co__loading"><div><p>${msg}</p><button class="btn" type="button" onclick="location.reload()">Try again</button></div></div>`;
  };

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.map(i => ({ id: i.id, qty: i.qty, van: i.van })) })
    });
    const data = await res.json();
    if (!res.ok) return fail(data.error || 'Checkout could not load.');

    await new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/'; s.onload = ok; s.onerror = no;
      document.head.appendChild(s);
    });
    const stripe = Stripe(data.publishableKey);
    const checkout = await stripe.initEmbeddedCheckout({ fetchClientSecret: async () => data.clientSecret });
    box.innerHTML = '';
    checkout.mount('#stripe-checkout');
  } catch (e) {
    fail('Checkout could not load. Check your connection and try again.');
  }
})();
