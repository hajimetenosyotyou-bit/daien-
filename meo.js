
const LOGIN_ID = process.env.MEO_LOGIN_ID;
const PASSWORD = process.env.MEO_PASSWORD;
const GAS_URL  = process.env.GAS_URL;

if (!LOGIN_ID || !PASSWORD || !GAS_URL) {
  throw new Error("Missing env: MEO_LOGIN_ID / MEO_PASSWORD / GAS_URL");
}



const { chromium } = require('playwright');

(async () => {
  try {
    console.log('🚀 script start');

    // ========= 起動 =========
    const browser = await chromium.launch({
      headless: false,
      slowMo: 100
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // ========= ログイン =========
    console.log('➡️ go login page');
    await page.goto('https://app.meo-dash.com/users/sign_in', {
      waitUntil: 'domcontentloaded'
    });

    console.log('✏️ fill login');
    await page.locator('#user_login_id').fill(LOGIN_ID);
await page.locator('#user_password').fill(PASSWORD);

    console.log('🔐 submit login');
    await page.locator('input[type="submit"]').click();

    console.log('⏳ wait login');
    await page.waitForLoadState('networkidle');

    // ========= ダッシュボード直行 =========
    console.log('➡️ go dashboard');
    await page.goto('https://app.meo-dash.com/gmbs/76262/dashboard', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForLoadState('networkidle');

    // ========= KPI取得 =========
    console.log('📊 collect all "回" numbers');

    // 「◯◯回」表記を全部拾う
    const rawList = await page
      .locator('text=/\\d[\\d,]*回/')
      .allTextContents();

    const list = rawList.map(t => (t ?? '').replace(/\s+/g, ''));
    console.log('all 回 values:', list);

    // 数値化関数
    const toNum = (s) => Number(String(s).replace(/[^\d]/g, ''));

    /*
      ※ 並びは現状のダッシュボード想定
      list[0] : 全体閲覧ユーザー数
      list[1] : 全体アクション数
      list[2] : 電話回数
      list[3] : ルート案内
      （ズレたら index を調整するだけ）
    */
    const views      = toNum(list[0]);
    const actions    = toNum(list[1]);
    const calls      = list[2] ? toNum(list[2]) : null;
    const directions = list[3] ? toNum(list[3]) : null;

    console.log('✅ views:', views);
    console.log('✅ actions:', actions);
    console.log('✅ calls:', calls);
    console.log('✅ directions:', directions);

    // ========= データ完成 =========
    const data = {
      date: new Date().toISOString().slice(0, 10),
      store_id: '76262',
      views,
      actions,
      calls,
      directions
    };

    console.log('📦 data:', data);

// ========= GASへPOST =========

const res = await fetch(GAS_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(data)
});

const text = await res.text();
console.log("📡 GAS response:", res.status, text);
// ========= ここまで =========


    // ========= ここでGASにPOSTするなら（今はコメントアウト） =========
    /*
    await fetch('https://script.google.com/macros/s/XXXX/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    */

    console.log('🕒 wait before close');
    await page.waitForTimeout(3000);

    console.log('❌ closing browser');
    await browser.close();

    console.log('🏁 script end');

  } catch (err) {
    console.error('🔥 ERROR:', err);
  }
})();
