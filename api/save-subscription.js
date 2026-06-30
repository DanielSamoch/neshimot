// api/save-subscription.js
// שומר את Push Subscription של המשתמש ב-Supabase כדי שנוכל לשלוח לו push בעתיד

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { userId, subscription, reminderTime, reminderEnabled } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const { error } = await sb.from('profiles').update({
    push_subscription: subscription ? JSON.stringify(subscription) : null,
    reminder_time: reminderTime,
    reminder_enabled: reminderEnabled
  }).eq('id', userId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ success: true });
};
