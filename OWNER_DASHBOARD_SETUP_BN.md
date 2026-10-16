# Dream Core Bot + Owner Dashboard (বাংলা)

Owner: **Israfil Thronhalo**

## কী আছে
- `src/` হলো Discord bot-এর মূল source code।
- `owner-dashboard/` হলো আলাদা Render Web Service হিসেবে deploy করার dashboard website।
- Bot HOKAS-এ চালু থাকবে। Dashboard Render-এ আলাদা চলবে।
- Dashboard command activity, bot-এ আসা DM event metadata, server list, uptime ও loaded command count দেখায়।
- DM-এর message content সংরক্ষণ করা হয় না। এটি অন্য ব্যবহারকারীদের private conversation পড়তে পারে না।
- Activity history বর্তমানে bot restart হলে reset হয়।

## 1) GitHub-এ সঠিক ফাইল দিন
ZIP extract করলে `TitanBot-main` folder-এর ভেতরের সব project file GitHub repository root-এ upload করুন। GitHub root-এ `src/`, `package.json`, `package-lock.json`, `Dockerfile` থাকতে হবে। শুধু `index.js` upload করলে চলবে না।

## 2) HOKAS-এ Bot চালু করুন
HOKAS-এর bot service-এ project root ঠিক রাখুন এবং startup command `npm start` দিন। `src/app.js`-সহ সব source file থাকতে হবে। `package.json`-এর dependencies install করে deploy করুন।

Bot service environment variables:
- `DISCORD_TOKEN` বা আপনার বিদ্যমান bot token variable (আপনার config অনুযায়ী)
- `DATABASE_URL` (যদি PostgreSQL ব্যবহার করেন)
- `REQUIRE_PERSISTENT_DATABASE=true` (PostgreSQL অবশ্যই সচল থাকলে তবেই)
- `OWNER_ID` = আপনার Discord user ID
- `DASHBOARD_USER` = dashboard-to-bot API-এর username, যেমন `owner`
- `DASHBOARD_PASSWORD` = দীর্ঘ, unique password, অন্তত 24 characters
- `PORT` = hosting platform যে port দেয় সেটি (সাধারণত নিজে সেট করতে হয় না)

Bot-এর HTTPS public URL থাকলে সেটি নোট করুন। `/owner/data` endpoint কাজ করবে, যেমন `https://YOUR-BOT-HOST/owner/data`। Bot hosting থেকে public HTTPS URL না থাকলে dashboard-এর জন্য secure tunnel/proxy প্রয়োজন হবে।

## 3) Render-এ আলাদা Dashboard deploy করুন
Render-এ **New + → Web Service** নির্বাচন করে GitHub repository connect করুন।
- Root Directory: `owner-dashboard`
- Runtime: Docker (যদি Dockerfile detected হয়) অথবা Node
- Build Command (Node হলে): `npm install`
- Start Command: `npm start`

Render Environment Variables:
- `DASHBOARD_USER` = আপনার dashboard login username
- `DASHBOARD_PASSWORD` = নতুন, শক্তিশালী password (কমপক্ষে 24 characters)
- `BOT_API_URL` = HOKAS bot-এর public HTTPS URL, শেষে `/owner/data`
- `BOT_DASHBOARD_USER` = HOKAS bot-এর `DASHBOARD_USER`-এর একই মান
- `BOT_DASHBOARD_PASSWORD` = HOKAS bot-এর `DASHBOARD_PASSWORD`-এর একই মান

Dashboard-এর `DASHBOARD_PASSWORD` এবং bot-এর `DASHBOARD_PASSWORD` আলাদা রাখতে পারেন। `BOT_DASHBOARD_PASSWORD`-এ bot-এর password বসবে। কোনো token/password GitHub-এ লিখবেন না।

## 4) Test
- Render dashboard URL খুলুন।
- Browser login prompt-এ Render-এর `DASHBOARD_USER` এবং `DASHBOARD_PASSWORD` দিন।
- Dashboard-এ “Connected” দেখালে bot API সংযোগ হয়েছে।
- “Cannot reach the bot API” এলে bot-এর HTTPS URL, HOKAS service status, এবং bot API username/password মিলিয়ে দেখুন।
- `/health` endpoint Render service health test করার জন্য আছে।

## Security notes
- GitHub repository private রাখুন।
- Strong unique passwords ব্যবহার করুন এবং source code বা chat-এ password/token পাঠাবেন না।
- Bot dashboard-এর HTTP Basic Auth HTTPS-এর উপর ব্যবহার করুন।
- Dashboard-এ শুধু bot নিজে যে event গ্রহণ করে সেটির metadata দেখানো হয়; অন্য মানুষের private DMs পড়া হয় না।
