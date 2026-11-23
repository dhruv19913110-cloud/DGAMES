// POST /.netlify/functions/verify-payment  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
const crypto = require('crypto');
const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return json(500, { error: 'Payment keys are not configured on the server' });

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON' }); }
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = b;
  if (!oid || !pid || !sig) return json(400, { error: 'Missing payment fields' });

  const expected = crypto.createHmac('sha256', secret).update(oid + '|' + pid).digest('hex');
  const a = Buffer.from(expected), c = Buffer.from(String(sig));
  if (a.length !== c.length || !crypto.timingSafeEqual(a, c)) return json(400, { success: false, error: 'Invalid payment signature' });

  return json(200, { success: true, order_id: oid, payment_id: pid });
};
