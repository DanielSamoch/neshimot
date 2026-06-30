// api/send-reminders.js
// Cron job — רץ כל שעה ב-Vercel, בודק אילו משתמשים צריכים תזכורת עכשיו
// ושולח להם Web Push notification — עובד גם כשהדפדפן סגור.

const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // אבטחה — רק Vercel Cron יכול לקרוא לזה
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  webpush.setVapidDetails(
    'mailto:danielsamoch@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // השעה הנוכחית (UTC -> שעון ישראל)
  const now = new Date();
  const israelHour = (now.getUTCHours() + 3) % 24; // ישראל = UTC+3 (קיץ) / +2 (חורף) — מקורב
  const currentTimeStr = `${israelHour.toString().padStart(2, '0')}:00`;

  // מצא משתמשים שביקשו תזכורת בשעה הזו ויש להם push subscription
  const { data: users, error } = await sb
    .from('profiles')
    .select('id, full_name, gender, reminder_time, push_subscription')
    .eq('reminder_enabled', true)
    .not('push_subscription', 'is', null);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const toNotify = (users || []).filter(u => {
    if (!u.reminder_time) return false;
    const userHour = u.reminder_time.split(':')[0];
    return userHour === israelHour.toString().padStart(2, '0');
  });

  const results = await Promise.allSettled(
    toNotify.map(async (user) => {
      const name = user.full_name ? `, ${user.full_name}` : '';
      const readyWord = user.gender === 'female' ? 'מוכנה' : 'מוכן';
      const payload = JSON.stringify({
        title: `זמן לנשום${name} 🌬️`,
        body: `${readyWord}/ה לתרגול של 3 דקות?`
      });

      try {
        await webpush.sendNotification(JSON.parse(user.push_subscription), payload);
      } catch (err) {
        // אם ה-subscription לא תקף יותר — נקה אותו
        if (err.statusCode === 410 || err.statusCode === 404) {
          await sb.from('profiles').update({ push_subscription: null }).eq('id', user.id);
        }
        throw err;
      }
    })
  );

  res.status(200).json({
    checked: users?.length || 0,
    notified: toNotify.length,
    results: results.map(r => r.status)
  });
};
