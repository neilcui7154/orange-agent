// 瀵煎叆閭€璇风爜鍒板井淇′簯寮€鍙戞暟鎹簱
// 杩愯鏂瑰紡锛氬湪寰俊寮€鍙戣€呭伐鍏风殑浜戝嚱鏁版湰鍦拌皟璇曚腑杩愯锛屾垨鍒涘缓涓存椂浜戝嚱鏁版墽琛?
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cloud1-d4g1b3u4cd759b29d'
});

const db = cloud.database();

// 閭€璇风爜鏁版嵁锛堜粠鍘?MySQL 鏁版嵁搴撳鍑猴級
const inviteCodes = [
  {
    code: '1A605EA89D1DFA07',
    phone: '13800000001',
    is_used: 1,
    used_by: null,
    used_at: null,
    created_at: new Date('2026-04-01')
  },
  {
    code: 'TEST001',
    phone: '13800000004',
    is_used: 1,
    used_by: null,
    used_at: null,
    created_at: new Date('2026-04-01')
  },
  {
    code: 'TEST002',
    phone: '13800000005',
    is_used: 1,
    used_by: null,
    used_at: null,
    created_at: new Date('2026-04-01')
  },
  {
    code: 'TEST003',
    phone: '13800000006',
    is_used: 0,
    used_by: null,
    used_at: null,
    created_at: new Date('2026-05-01')
  },
  {
    code: 'AGENT003',
    phone: '13800000002',
    is_used: 0,
    used_by: null,
    used_at: null,
    created_at: new Date('2026-05-06')
  },
  {
    code: 'AGENT004',
    phone: '13800000003',
    is_used: 0,
    used_by: null,
    used_at: null,
    created_at: new Date('2026-05-06')
  },
  {
    code: 'INVALID',
    phone: '13800000007',
    is_used: 0,
    used_by: null,
    used_at: null,
    created_at: new Date('2026-05-01')
  },
  {
    code: 'AGENT001',
    phone: '13800000004',
    is_used: 1,
    used_by: null,
    used_at: null,
    created_at: new Date('2026-04-15')
  }
];

// 浜戝嚱鏁板叆鍙?exports.main = async (event, context) => {
  try {
    let successCount = 0;
    let skipCount = 0;

    for (const invite of inviteCodes) {
      // 妫€鏌ユ槸鍚﹀凡瀛樺湪
      const exist = await db.collection('invite_codes').where({
        code: invite.code,
        phone: invite.phone
      }).get();

      if (exist.data.length > 0) {
        console.log(`璺宠繃宸插瓨鍦ㄧ殑閭€璇风爜: ${invite.code}`);
        skipCount++;
        continue;
      }

      // 娣诲姞閭€璇风爜
      await db.collection('invite_codes').add({
        data: invite
      });

      console.log(`鉁?宸叉坊鍔犻個璇风爜: ${invite.code} (${invite.phone})`);
      successCount++;
    }

    return {
      success: true,
      message: `瀵煎叆瀹屾垚锛氭垚鍔?${successCount} 鏉★紝璺宠繃 ${skipCount} 鏉
    };

  } catch (error) {
    console.error('瀵煎叆澶辫触:', error);
    return {
      success: false,
      message: error.message
    };
  }
};
