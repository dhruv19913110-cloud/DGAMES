// POST /.netlify/functions/create-order  { amount (rupees), receipt? }
const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return json(500, { error: 'Payment keys are not configured on the server' });

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON' }); }

  const paise = Math.round(Number(b.amount) * 100);
  if (!Number.isFinite(paise) || paise < 100) return json(400, { error: 'Amount must be at least ₹1 (100 paise)' });

  try {
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(RAZORPAY_KEY_ID + ':' + RAZORPAY_KEY_SECRET).toString('base64'),
      },
      body: JSON.stringify({
        amount: paise,
        currency: 'INR',
        receipt: String(b.receipt || 'DG' + Date.now()).slice(0, 40),
        notes: b.notes && typeof b.notes === 'object' ? b.notes : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) return json(401, { error: 'Razorpay authentication failed' });
    if (!res.ok) return json(500, { error: (data.error && data.error.description) || 'Could not create order' });
    // key_id is public; the secret never leaves the server
    return json(200, { order_id: data.id, amount: data.amount, currency: data.currency, key_id: RAZORPAY_KEY_ID });
  } catch (e) {
    return json(500, { error: 'Could not reach Razorpay' });
  }
};
