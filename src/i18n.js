const ar = {
  nav_mine: 'الرئيسية', nav_spin: 'العجلة', nav_tasks: 'المهام', nav_friends: 'الإحالات', nav_wallet: 'السحب',
  ok: 'تمام', retry: 'إعادة المحاولة', open: 'فتح', join: 'انضمام', verify: 'تحقق', claim: 'استلام', claimed: 'تم', watch: 'شاهد', max: 'الكل',
  copy: 'نسخ', copied: 'تم نسخ الرابط', share: 'مشاركة', daily_tag: ' · يومية',
  // التعدين
  mine_ignite: 'تشغيل المفاعل', mine_collect: 'استلام الكريستال', mine_started: 'بدأ التعدين ⛏️',
  mine_rate: '{n} كريستال / {h} ساعة',
  mine_hint_idle: 'شاهد إعلاناً قصيراً لتشغيل مفاعل الكريستال',
  mine_hint_mining: 'المفاعل يعمل… ارجع عند اكتمال الشريط',
  mine_hint_ready: 'كريستالاتك جاهزة! اضغط للاستلام',
  daily_title: 'منشور اليوم', daily_sub: 'ادخل كل يوم لتزيد مكافأتك', daily_done: 'استلمت مكافأة اليوم، ارجع غداً',
  // العجلة
  spin_title: 'عجلة المنشور', spin_sub: 'متبقي لك {n} من {l} لفات اليوم', spin_left: '{n} لفات متبقية',
  spin_btn: 'لِفّ العجلة', spin_none: 'انتهت لفات اليوم', spin_chances: 'فرص الربح', spin_win: 'كريستال أُضيفت لرصيدك',
  tier_common: 'عادي', tier_rare: 'نادر', tier_epic: 'أسطوري', tier_legend: 'ملحمي',
  // المهام
  tasks_title: 'المهام', tasks_empty: 'لا توجد مهام حالياً، ارجع قريباً',
  // الأصدقاء
  fr_tab_invite: 'دعوة', fr_tab_top: 'المتصدرون', fr_title: 'اكسب من أصدقائك',
  fr_sub: '{r} كريستال عن كل صديق مؤهل + {p}% من أرباحه دائماً',
  fr_total: 'أصدقاء', fr_qualified: 'مؤهلون', fr_earned: 'أرباحك',
  fr_s1: 'شارك رابطك مع أصدقائك',
  fr_s2: 'صديقك يشاهد {n} إعلانات داخل التطبيق ليصبح مؤهلاً',
  fr_s3: 'تستلم {r} كريستال، ويزيد تعدينك {b}% لكل صديق مؤهل (حتى {c}%)',
  fr_list: 'أصدقاؤك', fr_ok: 'مؤهل', lb_me: 'ترتيبك: #{n}', share_text: 'تعال نعدّن كريستال على {n} 💎',
  // المحفظة
  rate: 'كل {n} كريستال = 1$', wd_ready: 'تقدر تسحب الآن 🎉', wd_need: 'تحتاج {n} كريستال إضافية للوصول إلى ${u}',
  wd_title: 'سحب الأرباح', wd_method: 'شبكة السحب', wd_addr: 'عنوان محفظة TON', wd_amount: 'عدد الكريستال', wd_btn: 'طلب سحب',
  wd_ton_only: 'السحب متاح عبر شبكة TON فقط', wd_ton_hint: 'تأكد من إدخال عنوان TON الصحيح قبل إرسال طلب السحب.',
  wd_channel_kicker: 'قناة السحب الرسمية', wd_channel_title: 'تابع إشعارات الدفع', wd_channel_desc: 'انضم إلى قناة الدفع الرسمية لمتابعة إثباتات السحب وآخر تحديثات معالجة الطلبات.', wd_channel_open: 'فتح قناة السحب', wd_channel_continue: 'متابعة إلى طلب السحب',
  wd_sent: 'تم إرسال طلب السحب ✅', wd_off: 'السحب متوقف مؤقتاً', wd_hist: 'سجل السحب',
  st_pending: 'قيد المراجعة', st_paid: 'مدفوع', st_rejected: 'مرفوض',
  gift_title: 'كود هدية', redeem: 'تفعيل', payments: 'إثباتات الدفع', news: 'القناة', support: 'الدعم', support_title: 'تحتاج مساعدة؟', support_withdraw_help: 'للاستفسار عن السحب أو أي مشكلة، تواصل معنا مباشرة.', contact: 'تواصل',
  // شاشات
  s_open_tg: 'افتح التطبيق من داخل تيليجرام', s_maintenance: 'التطبيق تحت الصيانة، ارجع بعد قليل', s_banned: 'تم تقييد حسابك',
  s_error: 'تعذّر الاتصال بالخادم', gate_msg: 'اشترك في القناة أولاً حتى تكمل', gate_done: 'اشتركت ✔',
  // أخطاء
  e_generic: 'صار خطأ، حاول مرة ثانية', e_network: 'تحقق من اتصال الإنترنت',
  e_no_block: 'الإعلانات غير مفعّلة حالياً', e_busy: 'إعلان ثاني شغال، انتظر', e_wait: 'انتظر {n} ثانية قبل الإعلان القادم',
  e_not_ready: 'الإعلان غير جاهز، جرّب بعد قليل', e_no_fill: 'ما فيه إعلان متاح الآن، جرّب لاحقاً', e_too_short: 'لازم تكمل مشاهدة الإعلان',
  e_ad_wait: 'انتظر {n} ثانية قبل الإعلان القادم', e_ad_not_started: 'لازم تشاهد الإعلان أولاً', e_ad_expired: 'انتهت صلاحية الإعلان، أعد المحاولة', e_ad_too_short: 'لازم تكمل مشاهدة الإعلان',
  e_mining_active: 'التعدين شغّال أصلاً', e_spin_limit: 'خلصت لفات اليوم', e_already: 'استلمتها من قبل',
  e_task_wait: 'انتظر قليلاً بعد فتح الرابط', e_not_member: 'لازم تنضم للقناة أولاً', e_task_missing: 'المهمة غير موجودة',
  e_withdraw_off: 'السحب متوقف', e_bad_method: 'السحب متاح عبر TON فقط', e_bad_address: 'عنوان المحفظة غير صحيح', e_bad_amount: 'المبلغ غير صحيح',
  e_below_min: 'أقل مبلغ للسحب ${n}', e_insufficient: 'رصيدك غير كافٍ', e_too_many_pending: 'عندك طلبات سحب معلّقة كثيرة',
  e_invalid: 'الكود غير صحيح', e_exhausted: 'الكود انتهى', e_not_ready_mining: 'المفاعل لم يكتمل بعد',
}

const en = {
  nav_mine: 'Home', nav_spin: 'Spin', nav_tasks: 'Tasks', nav_friends: 'Invite', nav_wallet: 'Withdraw',
  ok: 'OK', retry: 'Retry', open: 'Open', join: 'Join', verify: 'Verify', claim: 'Claim', claimed: 'Done', watch: 'Watch', max: 'Max',
  copy: 'Copy', copied: 'Link copied', share: 'Share', daily_tag: ' · daily',
  mine_ignite: 'Ignite reactor', mine_collect: 'Collect crystals', mine_started: 'Mining started ⛏️',
  mine_rate: '{n} crystals / {h}h',
  mine_hint_idle: 'Watch a short ad to ignite the crystal reactor',
  mine_hint_mining: 'Reactor is running… come back when the ring fills',
  mine_hint_ready: 'Your crystals are ready! Tap to collect',
  daily_title: 'Daily Prism', daily_sub: 'Visit every day to grow your reward', daily_done: "Today's reward claimed, see you tomorrow",
  spin_title: 'Prism Wheel', spin_sub: '{n} of {l} spins left today', spin_left: '{n} spins left',
  spin_btn: 'Spin the wheel', spin_none: 'No spins left today', spin_chances: 'Win chances', spin_win: 'crystals added to your balance',
  tier_common: 'Common', tier_rare: 'Rare', tier_epic: 'Epic', tier_legend: 'Legendary',
  tasks_title: 'Tasks', tasks_empty: 'No tasks right now, check back soon',
  fr_tab_invite: 'Invite', fr_tab_top: 'Top', fr_title: 'Earn with friends',
  fr_sub: '{r} crystals per qualified friend + {p}% of their earnings forever',
  fr_total: 'Friends', fr_qualified: 'Qualified', fr_earned: 'You earned',
  fr_s1: 'Share your link with friends',
  fr_s2: 'Your friend watches {n} ads in the app to qualify',
  fr_s3: 'You get {r} crystals, and your mining grows {b}% per qualified friend (up to {c}%)',
  fr_list: 'Your friends', fr_ok: 'Qualified', lb_me: 'Your rank: #{n}', share_text: 'Come mine crystals with me on {n} 💎',
  rate: '{n} crystals = $1', wd_ready: 'You can withdraw now 🎉', wd_need: 'You need {n} more crystals to reach ${u}',
  wd_title: 'Withdraw', wd_method: 'Withdrawal network', wd_addr: 'TON wallet address', wd_amount: 'Crystals amount', wd_btn: 'Request withdrawal',
  wd_ton_only: 'Withdrawals are available on TON only', wd_ton_hint: 'Make sure the TON wallet address is correct before submitting.',
  wd_channel_kicker: 'OFFICIAL WITHDRAWAL CHANNEL', wd_channel_title: 'Follow payment updates', wd_channel_desc: 'Join the official payment channel for withdrawal proofs and updates about request processing.', wd_channel_open: 'Open withdrawal channel', wd_channel_continue: 'Continue to withdrawal',
  wd_sent: 'Withdrawal request sent ✅', wd_off: 'Withdrawals are paused', wd_hist: 'Withdrawal history',
  st_pending: 'Pending', st_paid: 'Paid', st_rejected: 'Rejected',
  gift_title: 'Gift code', redeem: 'Redeem', payments: 'Payment proofs', news: 'Channel', support: 'Support', support_title: 'Need help?', support_withdraw_help: 'For withdrawal questions or any issue, contact our team directly.', contact: 'Contact',
  s_open_tg: 'Please open the app from inside Telegram', s_maintenance: 'Under maintenance, back soon', s_banned: 'Your account is restricted',
  s_error: 'Could not reach the server', gate_msg: 'Join the channel first to continue', gate_done: "I've joined ✔",
  e_generic: 'Something went wrong, try again', e_network: 'Check your internet connection',
  e_no_block: 'Ads are not enabled yet', e_busy: 'Another ad is running, wait', e_wait: 'Wait {n}s before the next ad',
  e_not_ready: 'Ad is not ready, try shortly', e_no_fill: 'No ad available right now, try later', e_too_short: 'Please watch the ad to the end',
  e_ad_wait: 'Wait {n}s before the next ad', e_ad_not_started: 'Watch the ad first', e_ad_expired: 'Ad expired, try again', e_ad_too_short: 'Please watch the ad to the end',
  e_mining_active: 'Mining is already running', e_spin_limit: 'No spins left today', e_already: 'Already claimed',
  e_task_wait: 'Wait a little after opening the link', e_not_member: 'Join the channel first', e_task_missing: 'Task not found',
  e_withdraw_off: 'Withdrawals are off', e_bad_method: 'TON is the only withdrawal method', e_bad_address: 'Invalid wallet address', e_bad_amount: 'Invalid amount',
  e_below_min: 'Minimum withdrawal is ${n}', e_insufficient: 'Insufficient balance', e_too_many_pending: 'Too many pending withdrawals',
  e_invalid: 'Invalid code', e_exhausted: 'Code is used up', e_not_ready_mining: 'Reactor is not done yet',
}

const D = { ar, en }

export function makeT(lang) {
  const d = D[lang] || ar
  return (key, vars) => {
    let s = d[key]
    if (s === undefined) return key
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? '' : String(vars[k])))
    return s
  }
}
