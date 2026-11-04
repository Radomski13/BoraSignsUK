// Returns the minimum needed for the order confirmation page.
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  const id = new URL(req.url).searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return json({ error: 'Invalid session' }, 400);

  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }
  });
  const s = await r.json();
  if (!r.ok) return json({ error: 'Order not found' }, 404);

  return json({
    status: s.status,                       // open | complete | expired
    paid: s.payment_status === 'paid',
    ref: 'BS-' + id.slice(-8).toUpperCase(),
    amount_total: s.amount_total,
    email: s.customer_details?.email || '',
    name: s.customer_details?.name || ''
  });
};

export const config = { path: '/api/session' };
