# TitanBot — শুরু করার গাইড (বাংলা)

## গুরুত্বপূর্ণ অবস্থা
এই ZIP-টি **পূর্ণাঙ্গ final bot নয়**। TitanBot-এর মূল source, Discord-Bot-এর original command source এবং prefix adapter রাখা হয়েছে। Adapter-এর কিছু command-এর basic কাজ আছে, কিন্তু অনেক imported command এখনও placeholder দেখায় অথবা পুরোনো database/API/music/image dependency-তে রূপান্তর করা হয়নি। তাই সব command কাজ করবে বলে ধরে deploy করবেন না।

## Windows-এ চালানোর নিয়ম
1. ZIP extract করুন। `TitanBot-main` ফোল্ডার খুলুন।
2. Node.js **20.10 বা তার নতুন LTS** ইনস্টল থাকতে হবে।
3. ফোল্ডারে terminal/CMD খুলে `npm install` চালান।
4. `.env.example` থাকলে সেটি কপি করে `.env` বানান; না থাকলে project-এর README ও config দেখে প্রয়োজনীয় environment variables সেট করতে হবে। Bot token কখনও কারও সঙ্গে শেয়ার করবেন না।
5. Discord Developer Portal-এ bot-এর `Message Content Intent` চালু করুন, কারণ prefix command পড়তে এটি দরকার। প্রয়োজনীয় privileged intents এবং permissions-ও চালু করুন।
6. `npm start` চালান। Startup error এলে error log দেখে সমাধান না করে production server-এ deploy করবেন না।

## Prefix command
Guild-এর prefix configuration অনুযায়ী command চালাতে হয় (সাধারণ default `!`)। যেমন `!8ball` বা `!rps rock`। তবে imported command-এর অনেকগুলো এখনও সম্পূর্ণ migrate হয়নি।

## Slash command limit
Imported adapter-গুলো `prefixOnly` হিসেবে চিহ্নিত, তাই slash command হিসেবে register করার কথা নয়। TitanBot-এর আগের slash command-গুলো আলাদা থাকবে।

## Redeploy-এর পর data না হারানোর উপায়
- Managed/persistent PostgreSQL database ব্যবহার করুন।
- Hosting provider-এর secret/environment settings-এ `DATABASE_URL` বা project-এ নির্ধারিত PostgreSQL variable সেট করুন।
- Hosting-এর ephemeral local disk বা in-memory fallback-কে permanent storage মনে করবেন না।
- নিয়মিত `npm run backup:db` চালিয়ে backup আলাদা নিরাপদ storage-এ রাখুন। Restore করার আগে backup যাচাই করুন।
- Reminder, tempban auto-unban, giveaway timer ইত্যাদির জন্য database-backed persistent scheduler দরকার; process-এর `setTimeout` বা memory-only state restart-এর পরে টিকে থাকে না।

## কোন কাজ এখনও বাকি
1. Legacy command-গুলো একে একে TitanBot API ও permissions-এর সঙ্গে port করা।
2. Family/Profile/Invites/Message counting/Automod/Notepad ইত্যাদির schema এবং PostgreSQL CRUD service যোগ করা।
3. Music/Radio/Soundboard/Image/Search command-এর dependency এবং API key/config যাচাই করা।
4. `help`-এ প্রতিটি command-এর প্রকৃত usage যোগ করা।
5. Dependency install করে runtime test এবং Discord test server-এ permission test করা।

**নোট:** `legacy-source/Discord-Bot-main/`-এ original source রাখা আছে reference-এর জন্য। ওই source ফাইলগুলো রেখে দেওয়া মানেই সেগুলো TitanBot-এ কার্যকরভাবে port হয়েছে—এমন নয়।

## PostgreSQL ও persistent scheduler চালু করা

1. Hosting dashboard-এ **managed PostgreSQL** database তৈরি করুন। Bot-এর local file system-এ database রাখবেন না; redeploy-এ local file মুছে যেতে পারে।
2. Database provider-এর **private/internal connection URL** কপি করুন (provider যদি আলাদা `DATABASE_URL` বা `POSTGRES_URL` দেয়, সেটিই ব্যবহার করুন)।
3. Hosting-এর Variables/Secrets-এ `DATABASE_URL` এবং `REQUIRE_PERSISTENT_DATABASE=true` সেট করুন। Bot token-এর জন্য `DISCORD_TOKEN` সেট করুন। `.env.example` কেবল উদাহরণ—এটি নিজের secret দিয়ে hosting dashboard-এ পূরণ করতে হবে; ZIP-এ real token/password রাখবেন না।
4. Deploy/restart করুন। Log-এ PostgreSQL connected এবং persistent scheduler started দেখতে হবে। `/ready` endpoint-এ `ready: true` এবং database `degraded: false` থাকা উচিত।
5. `REQUIRE_PERSISTENT_DATABASE=true` থাকলে PostgreSQL না থাকলে bot startup বন্ধ হবে—এটি ইচ্ছাকৃত, যাতে database না থাকা অবস্থায় নতুন data শুধু RAM-এ লিখে হারিয়ে না যায়।
6. Test server-এ `!remind 1m test reminder` চালিয়ে দেখুন, তারপর bot redeploy/restart করে reminder-এর নির্ধারিত সময় পার হতে দিন। `!tempban @member 1m test` পরীক্ষা করতে আলাদা test account ব্যবহার করুন। Bot-এর **Ban Members** permission থাকতে হবে।

এই build-এ `!remind` এবং `!tempban` job PostgreSQL-এ রাখা হয়; restart-এর পর pending job আবার চালু হয়। Reminder/tempban সর্বোচ্চ 30 দিন আগে পর্যন্ত schedule করা যায়। Scheduler process-এর মধ্যে poll করে, তাই bot process অনলাইনে থাকতে হবে; hosting-এ bot-এর জন্য always-on service ব্যবহার করুন। PostgreSQL তৈরি করা বা hosting-এর secret নিজে থেকে বদলানো সম্ভব নয়—এই কাজটি hosting account-এর dashboard-এ করতে হবে।
