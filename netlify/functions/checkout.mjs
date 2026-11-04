// Creates a Stripe Checkout Session (embedded) from the basket.
// Prices and van sizes are checked here against catalog.json, so the browser can't change them.
import catalog from '../../site/assets/data/catalog.json';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const clean = s => String(s ?? '').replace(/[^\w\s/&.\-()]/g, '').trim().slice(0, 60);

// Stripe's API takes form-encoded nested params: a[b][0][c]=x
function encode(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') encode(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
  }
  return out.join('&');
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const { STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY } = process.env;
  if (!STRIPE_SECRET_KEY || !STRIPE_PUBLISHABLE_KEY) return json({ error: 'Payments are not set up yet.' }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const items = Array.isArray(body?.items) ? body.items.slice(0, 20) : [];
  if (!items.length) return json({ error: 'Your basket is empty.' }, 400);

  const line_items = [];
  const vanNotes = [];
  for (const it of items) {
    const v = catalog.variants.find(x => x.id === it.id);
    const qty = Math.trunc(Number(it.qty));
    if (!v || !(qty >= 1 && qty <= 10)) return json({ error: 'Something in your basket has changed. Please re-add it.' }, 400);

    const [make, model, year, wheelbase] = (Array.isArray(it.van) ? it.van : []).map(clean);
    const y = Number(year);
    const row = catalog.vans.find(r => r[0] === make && r[1] === model && r[2] === wheelbase && y >= r[4] && y <= r[5]);
    if (!row) return json({ error: 'Please re-select your van and add it again.' }, 400);
    if (row[3] !== v.size) return json({ error: 'That size does not match your van. Please re-add it.' }, 400);

    const van = `${make} ${model} · ${wheelbase} · ${year}`;
    vanNotes.push(`${qty}x ${v.size}/${v.sides}: ${van}`);
    line_items.push({
      quantity: qty,
      price_data: {
        currency: catalog.currency,
        unit_amount: v.price,
        tax_behavior: 'inclusive',
        product_data: { name: `Magnetic Van Signs — ${v.size} / ${v.sides}`, description: van, images: { 0: catalog.product.image } }
      }
    });
  }

  const origin = new URL(req.url).origin;
  const params = {
    ui_mode: 'embedded',
    mode: 'payment',
    return_url: `${origin}/checkout/success/?session_id={CHECKOUT_SESSION_ID}`,
    line_items: Object.fromEntries(line_items.map((l, i) => [i, l])),
    shipping_address_collection: { allowed_countries: { 0: 'GB' } },
    shipping_options: { 0: { shipping_rate_data: {
      type: 'fixed_amount', display_name: 'Free delivery',
      fixed_amount: { amount: 0, currency: catalog.currency },
      delivery_estimate: { minimum: { unit: 'business_day', value: 5 }, maximum: { unit: 'business_day', value: 10 } }
    } } },
    phone_number_collection: { enabled: 'true' },
    allow_promotion_codes: 'true',
    billing_address_collection: 'auto',
    custom_text: { submit: { message: "After you pay, we'll ask for your logo. Your free design proof arrives in 2–3 days." } },
    metadata: Object.fromEntries(vanNotes.slice(0, 20).map((n, i) => [`van_${i + 1}`, n.slice(0, 480)])),
    payment_intent_data: { description: 'Bora Signs order', metadata: { vans: vanNotes.join(' | ').slice(0, 480) } }
  };

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: encode(params)
  });
  const s = await r.json();
  if (!r.ok) {
    console.error('Stripe error', s?.error?.message);
    return json({ error: 'Checkout could not load. Please try again.' }, 502);
  }
  return json({ clientSecret: s.client_secret, publishableKey: STRIPE_PUBLISHABLE_KEY });
};

export const config = { path: '/api/checkout' };
