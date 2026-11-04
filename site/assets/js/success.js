/* Bora Signs — order confirmation: confirm with Stripe, clear basket, fire Purchase once */
(async () => {
  const $ = s => document.querySelector(s);
  const id = new URLSearchParams(location.search).get('session_id');
  const state = $('#done-state');
  if (!id) { location.replace('/'); return; }

  try {
    const r = await fetch('/api/session?session_id=' + encodeURIComponent(id));
    const s = await r.json();
    if (!r.ok) throw new Error(s.error);

    if (s.status === 'open') { location.replace('/checkout/'); return; }

    $('#order-ref').textContent = s.ref;
    $('#order-total').textContent = '£' + (s.amount_total / 100).toFixed(2);
    $('#f-order').value = s.ref;
    if (s.email) { $('#f-email').value = s.email; $('#order-email').textContent = s.email; }
    if (s.name) $('#f-name').value = s.name;
    state.hidden = false;
    $('#done-loading').hidden = true;

    BoraCart.clear();
    let fired = [];
    try { fired = JSON.parse(localStorage.getItem('bora_purchases') || '[]'); } catch {}
    if (!fired.includes(s.ref) && window.fbq) {
      fbq('track', 'Purchase', { value: s.amount_total / 100, currency: 'GBP', content_type: 'product' }, { eventID: s.ref });
      fired.push(s.ref);
      try { localStorage.setItem('bora_purchases', JSON.stringify(fired.slice(-20))); } catch {}
    }
  } catch {
    $('#done-loading').innerHTML = '<p>We couldn\'t load your order details, but if you were charged your order is safe. Check your email for the receipt, or <a href="/pages/contact/">contact us</a>.</p>';
  }
})();
