# TitanBot command audit (Bangla)

## এই আপডেটে বাস্তবে যোগ/সংশোধন করা হয়েছে

- AutoMod settings PostgreSQL-এ সংরক্ষণ: `!automod add <word>`, `!automod remove <word>`, `!automod display`
- Anti-invite / anti-links / anti-spam toggle: `!antiinvite on|off`, `!antilinks on|off`, `!antispam on|off`
- Link allow-channel configuration: `!linkschannel #channel` (ক্লিয়ার করতে `!linkschannel off`)
- MessageCreate event-এ AutoMod enforcement: blocked words, Discord invite, configured link rules, এবং short-window spam deletion (bot-এর Manage Messages permission প্রয়োজন)
- PostgreSQL family data-র basic view/adopt/disown/divorce/propose record/clear flow
- Profile view/create/delete namespaced flow: `!profile`, `!profile create`, `!profile delete`

## গুরুত্বপূর্ণ সীমাবদ্ধতা

- Family `propose` এখন pending proposal রেকর্ড করে; accept/reject interaction এখনো নেই। তাই family system-কে সম্পূর্ণ বলা যাবে না।
- এই audit ZIP-এ তালিকার সব command-এর end-to-end runtime test হয়নি। Discord bot token, live server permissions, PostgreSQL connection এবং third-party APIs ছাড়া সেই test করা সম্ভব নয়।
- Ticket transcripts, casino/economy, radio/music, invites/message counting, levels reward management, soundboard audio playback এবং তালিকার বহু command এখনো আলাদা implementation/test চায়। Economy feature-গুলো ব্যবহারকারীর আগের নির্দেশ অনুযায়ী এই কাজের scope থেকে বাদ।
- Canvacord dependency package-lock-এর সঙ্গে মেলেনি এবং package registry offline ছিল; `npm ci` ভাঙা এড়াতে dependency manifest থেকে সেটি সরানো হয়েছে। ফলে Canvacord-নির্ভর image effectগুলো এই build-এ verified নয়।

## Validation

- `src/`-এর সব 289 JavaScript ফাইলে `node --check` চালানো হয়েছে।
- Live Discord/DB runtime test চালানো হয়নি।
