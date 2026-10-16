import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import manifest from '../config/legacyPrefixManifest.json' with { type: 'json' };
import { WarningService } from './moderation/warningService.js';
import { schedulePersistentJob } from './persistentJobScheduler.js';
import { pgDb } from '../utils/postgresDatabase.js';
import axios from 'axios';
import { getAutomodConfig, saveAutomodConfig } from './legacyAutomodService.js';

const CATEGORY = new Map([
  ...'tempban softban unwarn banlist nuke lockdown demote clearuser antiinvite antilinks antispam linkschannel'.split(' ').map(n=>[n,'Moderation']),
  ...'automod'.split(' ').map(n=>[n,'Automod']),
  ...'adopt propose divorce disown family'.split(' ').map(n=>[n,'Family']),
  ...'profile create delete aboutme age bday color gender origin status addpet delpet addhobby delhobby addfood delfood addmovie delmovie addsong delsong addactor delactor addartist delartist'.split(' ').map(n=>[n,'Profile']),
  ...'youtube github npm steam itunes crypto corona translate docs bing ddg'.split(' ').map(n=>[n,'Search']),
  ...'channelinfo roleinfo inviteinfo emojis stealemoji members oldestmember youngestmember'.split(' ').map(n=>[n,'Guild']),
  ...'8ball rps snake fasttype skipword wouldyourather willyoupressthebutton'.split(' ').map(n=>[n,'Games']),
  ...'ad banner bed bird blur burn car cat clown clyde colorify darkness dog drake fox glass greyscale image invert kiss koala meme panda podium pooh redpanda spank triggered trumptweet tweet wallpaper wanted wasted'.split(' ').map(n=>[n,'Images']),
  ...'qrcode remind encode decode emojify enlarge anagram button mcskin mcstatus review sourcebin'.split(' ').map(n=>[n,'Tools']),
]);
const descriptions = {
  'tempban':'Temporarily ban a member: !tempban @user 1h reason', 'softban':'Ban and unban a member to clear recent messages.',
  'unwarn':'Remove a warning from a member.', 'banlist':'Show members currently banned from this server.',
  'nuke':'Recreate the current channel (requires Manage Channels).', 'lockdown':'Lock the current channel for @everyone.',
  'demote':'Remove the highest manageable role from a member.', 'clearuser':'Delete recent messages from one member.',
};
// Prefix interactions store positional arguments under options._hoistedOptions.
// Reading only interaction._hoistedOptions silently discarded every argument.
function argsOf(i){ return (i.options?._hoistedOptions || i._hoistedOptions || []).map(x=>String(x.value??'')); }
function memberFrom(i, raw){ const id=raw?.match(/<@!?(\d+)>/)?.[1] || raw; return i.guild?.members?.cache?.get(id); }
async function reply(i, content){ return i.reply({content:String(content).slice(0,1900), allowedMentions:{parse:[]}}); }
function choose(a){return a[Math.floor(Math.random()*a.length)];}
function profileKey(guildId,userId){return `temp:titan_profile:${guildId}:${userId}`;}
async function readProfile(guildId,userId){return (await pgDb.get(profileKey(guildId,userId),{}))||{};}
async function writeProfile(guildId,userId,data){return pgDb.set(profileKey(guildId,userId),data);}
const PROFILE_LIST_FIELDS={
 addpet:['Pets','pet'], delpet:['Pets','pet'], addhobby:['Hobbys','hobby'], delhobby:['Hobbys','hobby'],
 addfood:['Foods','food'], delfood:['Foods','food'], addmovie:['Movies','movie'], delmovie:['Movies','movie'],
 addsong:['Songs','song'], delsong:['Songs','song'], addactor:['Actors','actor'], delactor:['Actors','actor'],
 addartist:['Artists','artist'], delartist:['Artists','artist'],
};

async function runLegacy(name, i, client){
 const a=argsOf(i), raw=a.join(' ').trim(), user=memberFrom(i,a[0]);
 const guild=i.guild, channel=i.channel;
 // Common, fully local commands: no external API key required.
 if(name==='8ball') return reply(i,`${choose(['🎱 Yes.','🎱 No.','🎱 Definitely!','🎱 Probably not.','🎱 Ask again later.','🎱 The signs point to yes.','🎱 It is uncertain.'])}`);
 if(name==='rps'){const pick=(a[0]||'').toLowerCase(); if(!['rock','paper','scissors'].includes(pick)) return reply(i,'Usage: `!rps rock|paper|scissors`'); const bot=choose(['rock','paper','scissors']); return reply(i,`You: **${pick}** · Me: **${bot}** — **${pick===bot?'Tie!':({rock:'scissors',paper:'rock',scissors:'paper'}[pick]===bot?'You win!':'I win!')}**`);}
 if(name==='reverse') return reply(i,raw.split('').reverse().join('')||'Usage: `!reverse text`');
 if(name==='ascii') return reply(i,raw ? `\`\`\`\n${raw.replace(/[^\x20-\x7E]/g,'?').slice(0,500)}\n\`\`\`` : 'Usage: `!ascii text`');
 if(name==='encode') return reply(i,raw?Buffer.from(raw,'utf8').toString('base64'):'Usage: `!encode text`');
 if(name==='decode'){try{return reply(i,Buffer.from(raw,'base64').toString('utf8')||'Nothing to decode.')}catch{return reply(i,'Invalid Base64 input.')}}
 if(name==='anagram'){const s=raw.toLowerCase().replace(/[^a-z0-9]/g,'');return reply(i,s?`Sorted letters: **${s.split('').sort().join('')}**`:'Usage: `!anagram phrase`');}
 if(name==='worldclock') return reply(i,`Current UTC time: **${new Date().toUTCString()}**`);
 if(name==='members') return reply(i,`Members in **${guild.name}**: **${guild.memberCount}**`);
 if(name==='channelinfo') return reply(i,`Channel: **${channel.name}**\nID: ${channel.id}\nType: **${ChannelType[channel.type]||channel.type}**`);
 if(name==='roleinfo'){const role=guild.roles.cache.get(a[0]?.replace(/<@&|>/g,''))||guild.roles.cache.find(r=>r.name.toLowerCase()===raw.toLowerCase());return reply(i,role?`Role: **${role.name}**\nID: ${role.id}\nMembers: ${role.members.size}\nColor: ${role.hexColor}`:'Mention a role or provide its exact name.');}
 if(name==='inviteinfo'){const code=a[0]?.replace(/.*discord(?:\.gg|app\.com\/invite|\.com\/invite)\//,'');if(!code)return reply(i,'Usage: `!inviteinfo invite-code`');const inv=await guild.invites.fetch().catch(()=>null);const found=inv?.get(code);return reply(i,found?`Invite **${found.code}** · uses: ${found.uses??0} · inviter: ${found.inviter??'Unknown'}`:'Invite not found or the bot lacks Manage Guild permission.');}
 if(name==='emojis') return reply(i,guild.emojis.cache.map(e=>`${e} ${e.name}`).slice(0,40).join(' ')||'No custom emojis found.');
 if(name==='oldestmember'||name==='youngestmember'){const members=await guild.members.fetch().catch(()=>null);if(!members)return reply(i,'Could not fetch members; enable the Server Members intent.');const sorted=[...members.values()].filter(m=>!m.user.bot).sort((x,y)=>name==='oldestmember'?x.user.createdTimestamp-y.user.createdTimestamp:y.user.createdTimestamp-x.user.createdTimestamp);const m=sorted[0];return reply(i,m?`${name==='oldestmember'?'Oldest':'Youngest'} account here: **${m.user.tag}** (created <t:${Math.floor(m.user.createdTimestamp/1000)}:R>)`:'No members found.');}
 if(name==='banlist'){if(!guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers))return reply(i,'I need **Ban Members** permission.');const bans=await guild.bans.fetch().catch(()=>null);return reply(i,bans?`Banned users (${bans.size}):\n${[...bans.values()].slice(0,25).map(b=>`• ${b.user.tag} — ${b.reason||'No reason'}`).join('\n')||'None'}`:'Could not fetch bans.');}
 if(name==='unwarn'){if(!i.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)&&!i.memberPermissions?.has(PermissionFlagsBits.ManageMessages))return reply(i,'You need Moderate Members or Manage Messages permission.');const target=user;if(!target)return reply(i,'Usage: `!unwarn @member warning-id`');const warningId=Number(a[1]);if(!Number.isSafeInteger(warningId))return reply(i,'Usage: `!unwarn @member warning-id` — get the ID from the warnings command.');try{await WarningService.removeWarning(guild.id,target.id,warningId);return reply(i,`Removed warning **${warningId}** from **${target.user.tag}**.`);}catch(error){return reply(i,error?.message||'Could not remove that warning.');}}
 if(name==='lockdown'||name==='lock'){if(!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels))return reply(i,'I need **Manage Channels** permission.');await channel.permissionOverwrites.edit(guild.roles.everyone,{SendMessages:false}).catch(()=>null);return reply(i,`🔒 Locked ${channel}.`);}
 if(name==='unlock'){if(!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels))return reply(i,'I need **Manage Channels** permission.');await channel.permissionOverwrites.edit(guild.roles.everyone,{SendMessages:null}).catch(()=>null);return reply(i,`🔓 Unlocked ${channel}.`);}
 if(name==='limit'){const n=Number(a[0]);if(!channel.isVoiceBased()||!Number.isInteger(n)||n<0||n>99)return reply(i,'Usage: `!limit 0-99` in a voice channel.');await channel.setUserLimit(n);return reply(i,`Voice channel user limit set to ${n}.`);}
 if(name==='rename'){const label=raw;if(!label)return reply(i,'Usage: `!rename new-name`');if(channel.manageable){await channel.setName(label.slice(0,100));return reply(i,'Channel renamed.');}return reply(i,'I cannot rename this channel.');}
 if(name==='nuke'){if(!channel.manageable||!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels))return reply(i,'I need Manage Channels permission.');const clone=await channel.clone({reason:`Nuke requested by ${i.user.tag}`});await clone.setPosition(channel.position).catch(()=>{});await channel.delete('Channel recreated by nuke command');return clone.send('💥 Channel recreated.');}
 if(name==='clearuser'){if(!guild.members.me?.permissions.has(PermissionFlagsBits.ManageMessages))return reply(i,'I need Manage Messages permission.');const target=user;const count=Math.min(100,Math.max(1,Number(a[1])||20));if(!target)return reply(i,'Usage: `!clearuser @member [count]`');const msgs=await channel.messages.fetch({limit:100});const deleted=await channel.bulkDelete(msgs.filter(m=>m.author.id===target.id).first(count),true);return reply(i,`Deleted ${deleted.size} recent message(s) from ${target.user.tag}.`);}
 if(name==='demote'){if(!user)return reply(i,'Usage: `!demote @member`');if(!i.memberPermissions?.has(PermissionFlagsBits.ManageRoles))return reply(i,'You need Manage Roles permission.');const role=user.roles.highest;if(role.id===guild.id||role.position>=guild.members.me.roles.highest.position)return reply(i,'That role cannot be removed by me.');await user.roles.remove(role);return reply(i,`Removed **${role.name}** from ${user.user.tag}.`);}
 if(name==='softban'){if(!user)return reply(i,'Usage: `!softban @member [reason]`');if(!i.memberPermissions?.has(PermissionFlagsBits.BanMembers)||!guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers))return reply(i,'Both you and I need Ban Members permission.');await user.ban({deleteMessageSeconds:86400,reason:raw.slice(a[0].length).trim()||'Softban'});await guild.members.unban(user.id,'Softban complete');return reply(i,`Softbanned **${user.user.tag}**.`);}
 if(name==='automod'){
  if(!guild)return reply(i,'This command can only be used in a server.');
  if(!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)&&!i.memberPermissions?.has(PermissionFlagsBits.ManageMessages))return reply(i,'You need Manage Server or Manage Messages permission.');
  const cfg=await getAutomodConfig(guild.id), action=(a[0]||'display').toLowerCase(), value=a.slice(1).join(' ').trim();
  if(action==='display'||action==='show')return reply(i,`AutoMod settings\nBlocked words: ${cfg.words.length?cfg.words.join(', '):'None'}\nAnti-invite: ${cfg.antiinvite?'ON':'OFF'}\nAnti-links: ${cfg.antilinks?'ON':'OFF'}\nAnti-spam: ${cfg.antispam?'ON':'OFF'}\nLinks channel: ${cfg.linksChannelId?`<#${cfg.linksChannelId}>`:'Not set'}\nUsage: !automod add <word> | !automod remove <word> | !automod display`);
  if(action==='add') {if(!value)return reply(i,'Usage: `!automod add <word or phrase>`');if(cfg.words.some(w=>w.toLowerCase()===value.toLowerCase()))return reply(i,'That word/phrase is already blocked.');if(cfg.words.length>=100)return reply(i,'AutoMod supports up to 100 blocked words.');cfg.words.push(value.slice(0,80));}
  else if(action==='remove'){if(!value)return reply(i,'Usage: `!automod remove <word or phrase>`');const index=cfg.words.findIndex(w=>w.toLowerCase()===value.toLowerCase());if(index<0)return reply(i,'That word/phrase is not in the AutoMod list.');cfg.words.splice(index,1);}
  else return reply(i,'Usage: `!automod add <word>`, `!automod remove <word>`, or `!automod display`.');
  const ok=await saveAutomodConfig(guild.id,cfg);return reply(i,ok?'AutoMod settings saved to PostgreSQL.':'Could not save AutoMod settings; check PostgreSQL.');
 }
 if(['antiinvite','antilinks','antispam'].includes(name)){
  if(!guild)return reply(i,'This command can only be used in a server.');
  if(!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)&&!i.memberPermissions?.has(PermissionFlagsBits.ManageMessages))return reply(i,'You need Manage Server or Manage Messages permission.');
  const cfg=await getAutomodConfig(guild.id);const current=cfg[name];const val=(a[0]||'toggle').toLowerCase();
  if(!['on','off','enable','disable','toggle','status'].includes(val))return reply(i,`Usage: !${name} on|off`);
  cfg[name]=val==='status'?current:['on','enable'].includes(val)?true:['off','disable'].includes(val)?false:!current;
  const ok=val==='status'||await saveAutomodConfig(guild.id,cfg);
  return reply(i,ok?`${name} is **${cfg[name]?'ON':'OFF'}**${val==='status'?' (status only)':''}.`:'Could not save settings to PostgreSQL.');
 }
 if(name==='linkschannel'){
  if(!guild)return reply(i,'This command can only be used in a server.');
  if(!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)&&!i.memberPermissions?.has(PermissionFlagsBits.ManageChannels))return reply(i,'You need Manage Server or Manage Channels permission.');
  const cfg=await getAutomodConfig(guild.id);const rawChannel=a[0];
  if(!rawChannel||['off','clear','none'].includes(rawChannel.toLowerCase()))cfg.linksChannelId=null;
  else {const id=rawChannel.match(/<#(\d+)>/)?.[1]||rawChannel;const target=guild.channels.cache.get(id);if(!target?.isTextBased())return reply(i,'Mention a valid text channel, e.g. `!linkschannel #links`.');cfg.linksChannelId=target.id;}
  const ok=await saveAutomodConfig(guild.id,cfg);return reply(i,ok?`Link channel set to ${cfg.linksChannelId?`<#${cfg.linksChannelId}>`:'none'}. Links are only allowed in the configured channel when antilinks is ON.`:'Could not save link channel setting.');
 }
 if(name==='tempban'){if(!user)return reply(i,'Usage: `!tempban @member 10m|2h|3d [reason]`');if(!i.memberPermissions?.has(PermissionFlagsBits.BanMembers))return reply(i,'You need Ban Members permission.');if(!pgDb.isConnected||!pgDb.pool)return reply(i,'❌ Temporary bans require PostgreSQL. Configure DATABASE_URL/POSTGRES_URL first; no ban was applied.');const duration=a[1]||'';const m=duration.match(/^(\d+)(m|h|d)$/i);if(!m||Number(m[1])<1)return reply(i,'Duration format: `10m`, `2h`, or `3d`.');const units={m:60000,h:3600000,d:86400000};const runAt=new Date(Date.now()+Number(m[1])*units[m[2].toLowerCase()]);if(runAt-Date.now()>30*86400000)return reply(i,'Temporary bans are limited to 30 days.');const reason=raw.slice(a[0].length+duration.length).trim()||`Tempban ${duration}`;let banned=false;try{await user.ban({reason:`${reason} | duration ${duration}`});banned=true;const job=await schedulePersistentJob('tempban_unban',runAt,{guildId:guild.id,userId:user.id,channelId:channel.id});return reply(i,`🔨 Banned **${user.user.tag}** for ${duration}. Automatic unban is scheduled for <t:${Math.floor(runAt.getTime()/1000)}:F> (job #${job.id}).`);}catch(error){if(banned)await guild.members.unban(user.id,'Temporary ban scheduling failed; rolling back to avoid a permanent ban').catch(()=>{});return reply(i,`❌ Temporary ban was not kept because its automatic unban could not be saved: ${error.message}`);}}
 if(['bed','colorify','blur','burn','clown','darkness','facepalm','greyscale','invert','kiss','podium','spank','triggered','wanted','wasted'].includes(name)){
  const targetUser = user?.user || (a[0] && /^\d{15,22}$/.test(a[0]) ? await client.users.fetch(a[0]).catch(()=>null) : null);
  if(!targetUser) return reply(i,`Usage: !${name} @user`);
  try {
   const mod = await import('canvacord');
   const Canvas = mod.Canvas || mod.default?.Canvas;
   const method = name === 'triggered' ? 'trigger' : name;
   if(!Canvas || typeof Canvas[method] !== 'function') return reply(i,`Canvacord does not provide the \`${method}\` image effect in this version. Try a supported effect such as bed, colorify, blur, burn, invert, wanted, or wasted.`);
   const avatar = targetUser.displayAvatarURL({ extension:'png', size:1024, forceStatic:true });
   const output = name === 'bed'
    ? await Canvas.bed(i.user.displayAvatarURL({ extension:'png', size:1024, forceStatic:true }), avatar)
    : name === 'colorify'
      ? await Canvas.colorfy(avatar, '#ff0000')
      : await Canvas[method](avatar);
   const { AttachmentBuilder } = await import('discord.js');
   return i.reply({content:'', files:[new AttachmentBuilder(output,{name:`${name}.png`})], allowedMentions:{parse:[]}});
  } catch(error) {
   return reply(i,`Could not create ${name} image: ${String(error?.message||error).slice(0,300)}. Check that canvacord and its runtime dependencies installed correctly.`);
  }
 }
 if(name==='stealemoji'){if(!i.memberPermissions?.has(PermissionFlagsBits.ManageEmojisAndStickers))return reply(i,'You need Manage Emojis and Stickers permission.');const url=a[0]?.match(/https?:\/\/\S+/)?.[0];const emoji=a[0]?.match(/<a?:([\w]+):(\d+)>/);if(!url&&!emoji)return reply(i,'Usage: `!stealemoji <emoji>`');const imageUrl=url||`https://cdn.discordapp.com/emojis/${emoji[2]}.${a[0].startsWith('<a:')?'gif':'png'}`;const created=await guild.emojis.create({attachment:imageUrl,name:(a[1]||emoji?.[1]||'emoji').replace(/[^\w]/g,'_').slice(0,32)}).catch(()=>null);return reply(i,created?`Added ${created}`:'Could not add emoji; check permissions and emoji limit.');}
 if(name==='remind'){if(!pgDb.isConnected||!pgDb.pool)return reply(i,'❌ Reminders require persistent PostgreSQL. Configure DATABASE_URL/POSTGRES_URL first.');const m=raw.match(/^(\d+)(s|m|h|d)\s+([\s\S]+)$/i);if(!m)return reply(i,'Usage: `!remind 10m take a break` (supports 10s, 10m, 2h, 3d).');const amount=Number(m[1]);if(!Number.isSafeInteger(amount)||amount<1)return reply(i,'Choose a duration greater than zero.');const scale={s:1000,m:60000,h:3600000,d:86400000}[m[2].toLowerCase()];const delay=amount*scale;if(delay>30*86400000)return reply(i,'Reminders are limited to 30 days ahead.');const runAt=new Date(Date.now()+delay);try{const job=await schedulePersistentJob('reminder',runAt,{guildId:guild?.id||null,channelId:channel.id,userId:i.user.id,message:m[3].slice(0,1500)});return reply(i,`⏰ Reminder #${job.id} set for <t:${Math.floor(runAt.getTime()/1000)}:R>. It is stored in PostgreSQL and survives restarts/redeploys.`);}catch(error){return reply(i,`❌ Could not save reminder: ${error.message}`);}}
 if(['hourly','weekly','monthly','yearly','hunt','present','addmoney','removemoney','additem','deleteitem'].includes(name)) return reply(i,'Economy commands are intentionally excluded, as requested.');
 if(['github','npm','weather','crypto','translate','youtube','google','bing','ddg','docs','itunes','steam'].includes(name)){
  if(!raw)return reply(i,`Usage: !${name} <search term>`);
  const q=raw.trim().slice(0,160);
  try{
   if(name==='github'){
    const r=await axios.get(`https://api.github.com/users/${encodeURIComponent(q.split(/\s+/)[0])}`,{timeout:8000,headers:{'User-Agent':'TitanBot'}});
    const d=r.data;return reply(i,`**GitHub: ${d.login}**\n${d.name||''}\n${d.bio||'No bio'}\nRepositories: ${d.public_repos} · Followers: ${d.followers}\n${d.html_url}`);
   }
   if(name==='npm'){
    const pkg=q.split(/\s+/)[0];const r=await axios.get(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`,{timeout:8000});const d=r.data;
    return reply(i,`**npm: ${d.name}** v${d['dist-tags']?.latest||'unknown'}\n${d.description||'No description'}\n${d.homepage||`https://www.npmjs.com/package/${encodeURIComponent(pkg)}`}`);
   }
   if(name==='weather'){
    const r=await axios.get(`https://wttr.in/${encodeURIComponent(q)}?format=j1`,{timeout:8000});const d=r.data.current_condition?.[0];
    if(!d)return reply(i,'Weather data was not available for that location.');
    return reply(i,`**Weather: ${q}**\n${d.weatherDesc?.[0]?.value||'Conditions unavailable'}\nTemperature: ${d.temp_C}°C (${d.temp_F}°F) · Feels like ${d.FeelsLikeC}°C\nHumidity: ${d.humidity}% · Wind: ${d.windspeedKmph} km/h`);
   }
   if(name==='crypto'){
    const coin=q.toLowerCase().replace(/\s+/g,'-');const r=await axios.get('https://api.coingecko.com/api/v3/simple/price',{params:{ids:coin,vs_currencies:'usd',include_24hr_change:'true'},timeout:8000});const d=r.data?.[coin];
    if(!d)return reply(i,'Coin not found. Try a CoinGecko coin ID, e.g. bitcoin or ethereum.');
    return reply(i,`**${coin}**: $${Number(d.usd).toLocaleString('en-US')} USD\n24h change: ${Number(d.usd_24h_change||0).toFixed(2)}%`);
   }
   if(name==='translate'){
    const m=q.match(/^([a-z]{2,5})\s+([\s\S]+)$/i);if(!m)return reply(i,'Usage: !translate <target-language-code> <text> (example: !translate bn Hello)');
    const r=await axios.get('https://api.mymemory.translated.net/get',{params:{q:m[2].slice(0,500),langpair:`autodetect|${m[1]}`},timeout:8000});
    const translated=r.data?.responseData?.translatedText;if(!translated)return reply(i,'Translation service returned no result.');
    return reply(i,`**Translation (${m[1]}):**\n${translated.slice(0,1600)}`);
   }
   if(name==='youtube')return reply(i,`YouTube search for **${q}**: https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`);
   if(name==='google')return reply(i,`Google search: https://www.google.com/search?q=${encodeURIComponent(q)}`);
   if(name==='bing')return reply(i,`Bing search: https://www.bing.com/search?q=${encodeURIComponent(q)}`);
   if(name==='ddg')return reply(i,`DuckDuckGo search: https://duckduckgo.com/?q=${encodeURIComponent(q)}`);
   if(name==='docs')return reply(i,`Documentation search: https://www.google.com/search?q=${encodeURIComponent(`${q} documentation`)}`);
   if(name==='itunes')return reply(i,`Apple Music/iTunes search: https://music.apple.com/search?term=${encodeURIComponent(q)}`);
   if(name==='steam')return reply(i,`Steam search for **${q}**: https://store.steampowered.com/search/?term=${encodeURIComponent(q)}`);
  }catch(error){
   const status=error?.response?.status;
   if(name==='github'&&status===404)return reply(i,'GitHub user not found. Try the exact username.');
   if(name==='npm'&&status===404)return reply(i,'npm package not found. Try the exact package name.');
   return reply(i,`${name} lookup failed (${status||error.code||'network error'}). Please try again shortly.`);
  }
 }
 if(['corona','sourcebin','mcskin','mcstatus','qrcode','gif','fact','birdfact','catfact','dogfact','koalafact','pandafact','dinochrome'].includes(name)) return reply(i,`The original ${name} handler is preserved in legacy-source/Discord-Bot-main/src/commands, but its external API or output format still needs migration before it can run in TitanBot.`);
 // Profile commands are migrated to a namespaced PostgreSQL JSON record. These keys
 // live in the existing temp_data table and do not overwrite the bot's other settings.
 if(['profile','create','aboutme','age','bday','color','gender','origin','status',...Object.keys(PROFILE_LIST_FIELDS)].includes(name)){
  if(!guild)return reply(i,'Profile commands can only be used in a server.');
  const targetMember=user || i.member;
  const targetUser=targetMember?.user || i.user;
  if(name==='profile'){
   const action=(a[0]||'view').toLowerCase();
   if(action==='create') {const existing=await readProfile(guild.id,i.user.id);if(existing.created)return reply(i,'Your profile already exists.');const ok=await writeProfile(guild.id,i.user.id,{...existing,created:true,createdAt:new Date().toISOString()});return reply(i,ok?'Your profile has been created.':'Could not save your profile; check PostgreSQL.');}
   if(action==='delete') {const ok=await writeProfile(guild.id,i.user.id,{});return reply(i,ok?'Your profile has been deleted.':'Could not delete your profile; check PostgreSQL.');}
   const targetMember=memberFrom(i,a[0])||i.member;const targetUser=targetMember?.user||i.user;const p=await readProfile(guild.id,targetUser.id);
   const list=(v)=>Array.isArray(v)&&v.length?v.join(', '):'Not set';
   return reply(i,`**${targetUser.username}'s profile**\nAbout me: ${p.AboutMe||'Not set'}\nAge: ${p.Age||'Not set'}\nBirthday: ${p.Birthday||'Not set'}\nColor: ${p.Color||'Not set'}\nGender: ${p.Gender||'Not set'}\nOrigin: ${p.Origin||'Not set'}\nStatus: ${p.Status||'Not set'}\nPets: ${list(p.Pets)}\nHobbies: ${list(p.Hobbys)}\nFoods: ${list(p.Foods)}\nMovies: ${list(p.Movies)}\nSongs: ${list(p.Songs)}\nActors: ${list(p.Actors)}\nArtists: ${list(p.Artists)}\nUse !profile create or !profile delete to manage your profile.`);
  }
  if(targetUser.id!==i.user.id)return reply(i,'You can only edit your own profile.');
  if(name==='create'){
   const existing=await readProfile(guild.id,i.user.id);
   if(existing.created)return reply(i,'Your profile already exists. Use the profile commands to edit it.');
   const ok=await writeProfile(guild.id,i.user.id,{...existing,created:true,createdAt:new Date().toISOString()});
   return reply(i,ok?'Your profile has been created.':'Could not save your profile; check PostgreSQL connection.');
  }
  const fieldMap={aboutme:['AboutMe','about me'],age:['Age','age'],bday:['Birthday','birthday'],color:['Color','color'],gender:['Gender','gender'],origin:['Origin','origin'],status:['Status','status']};
  const p=await readProfile(guild.id,i.user.id);
  if(fieldMap[name]){
   const [field,label]=fieldMap[name];
   if(!raw)return reply(i,`Usage: !${name} <${label}>`);
   if(name==='age'&&(!/^\d{1,3}$/.test(raw)||Number(raw)>120))return reply(i,'Age must be a number from 1 to 120.');
   if(name==='color'&&!/^(#[0-9a-f]{6}|[a-z]{3,20})$/i.test(raw))return reply(i,'Use a color name or hex value such as #ff0000.');
   p[field]=raw.slice(0,500);p.created=true;
   const ok=await writeProfile(guild.id,i.user.id,p);
   return reply(i,ok?`Updated your ${label}.`:'Could not save your profile; check PostgreSQL connection.');
  }
  const [field,label]=PROFILE_LIST_FIELDS[name];
  const item=raw.trim();
  if(!item)return reply(i,`Usage: !${name} <${label}>`);
  p[field]=Array.isArray(p[field])?p[field]:[];
  if(name.startsWith('add')){
   if(p[field].some(x=>String(x).toLowerCase()===item.toLowerCase()))return reply(i,`That ${label} is already in your profile.`);
   if(p[field].length>=20)return reply(i,`You can store up to 20 ${label}s in this list.`);
   p[field].push(item.slice(0,80));
  }else{
   const idx=p[field].findIndex(x=>String(x).toLowerCase()===item.toLowerCase());
   if(idx<0)return reply(i,`That ${label} was not found in your profile.`);
   p[field].splice(idx,1);
  }
  p.created=true;
  const ok=await writeProfile(guild.id,i.user.id,p);
  return reply(i,ok?`Updated your ${label} list.`:'Could not save your profile; check PostgreSQL connection.');
 }
 if(['calculator','lower','information','url','hexcolour','pwdgen','time','tier','voice-channels','text-channels','stage-channels','news-channels','static-emoji','animated-emoji','boosts','bots','roles','channels','emoji','userinfo'].includes(name)){
  if(name==='calculator'){
   if(!raw)return reply(i,'Usage: !calculator 12*(3+4). Only basic arithmetic is supported.');
   if(!/^[\d\s()+\-*/%.]+$/.test(raw))return reply(i,'Only numbers and basic arithmetic operators are allowed.');
   try{const tokens=raw.match(/\d+(?:\.\d+)?|[()+\-*/%]/g)||[];if(tokens.join('')!==raw.replace(/\s+/g,''))throw Error();const value=Function(`"use strict";return (${raw})`)();if(!Number.isFinite(value))throw Error();return reply(i,`Result: **${value}**`);}catch{return reply(i,'Invalid arithmetic expression.');}
  }
  if(name==='lower')return reply(i,raw?raw.toLowerCase():'Usage: !lower <text>');
  if(name==='information')return reply(i,`**TitanBot command info**\nPrefix: ${process.env.PREFIX||'!'}\nCommands are handled through TitanBot's prefix adapter.`);
  if(name==='url') {const m=raw.match(/https?:\/\/\S+/i);return reply(i,m?`URL: ${m[0]}`:'Usage: !url https://example.com');}
  if(name==='hexcolour'){const m=raw.match(/#?([0-9a-f]{6})/i);return reply(i,m?`Hex: **#${m[1].toUpperCase()}** · RGB: ${parseInt(m[1].slice(0,2),16)}, ${parseInt(m[1].slice(2,4),16)}, ${parseInt(m[1].slice(4,6),16)}`:'Usage: !hexcolour #ff0000');}
  if(name==='pwdgen'){const n=Math.max(8,Math.min(64,Number(a[0])||16));const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';let out='';for(let j=0;j<n;j++)out+=chars[Math.floor(Math.random()*chars.length)];return reply(i,`Generated password (${n} chars): ||${out}||`);}
  if(name==='time')return reply(i,`Current time: <t:${Math.floor(Date.now()/1000)}:F> (<t:${Math.floor(Date.now()/1000)}:R>)`);
  if(!guild)return reply(i,'This command can only be used in a server.');
  if(name==='tier')return reply(i,`Server boost tier: **${guild.premiumTier}** · Boosts: **${guild.premiumSubscriptionCount||0}**`);
  if(name==='bots')return reply(i,`Bots in ${guild.name}: **${guild.members.cache.filter(m=>m.user.bot).size}** (cached members only)`);
  if(name==='roles')return reply(i,`Roles (${guild.roles.cache.size}):\n${guild.roles.cache.map(r=>r.name).slice(0,50).join(', ')}`);
  if(name==='channels')return reply(i,`Channels (${guild.channels.cache.size}):\n${guild.channels.cache.map(c=>`#${c.name}`).slice(0,50).join(', ')}`);
  if(name==='voice-channels')return reply(i,`Voice channels: **${guild.channels.cache.filter(c=>c.isVoiceBased()).size}**`);
  if(name==='text-channels')return reply(i,`Text channels: **${guild.channels.cache.filter(c=>c.isTextBased()&&!c.isDMBased()).size}**`);
  if(name==='stage-channels')return reply(i,`Stage channels: **${guild.channels.cache.filter(c=>c.type===ChannelType.GuildStageVoice).size}**`);
  if(name==='news-channels')return reply(i,`Announcement channels: **${guild.channels.cache.filter(c=>c.type===ChannelType.GuildAnnouncement).size}**`);
  if(name==='static-emoji'||name==='animated-emoji') {const emojis=guild.emojis.cache.filter(e=>name==='animated-emoji'?e.animated:!e.animated);return reply(i,`${name==='animated-emoji'?'Animated':'Static'} emojis (${emojis.size}): ${emojis.map(e=>e.toString()).slice(0,40).join(' ')||'None'}`);}
  if(name==='boosts')return reply(i,`Server boosts: **${guild.premiumSubscriptionCount||0}** · Tier **${guild.premiumTier}**`);
  if(name==='emoji')return reply(i,guild.emojis.cache.map(e=>`${e} — ${e.name}`).slice(0,40).join('\n')||'No custom emojis.');
  if(name==='userinfo'){const target=user?.user||i.user;return reply(i,`**${target.tag||target.username}**\nID: ${target.id}\nCreated: <t:${Math.floor(target.createdTimestamp/1000)}:F>\nBot: ${target.bot?'Yes':'No'}`);}
 }
 if(['family','adopt','propose','divorce','disown'].includes(name)){
  if(!guild)return reply(i,'Family commands can only be used in a server.');
  const familyKey=id=>`temp:titan_family:${guild.id}:${id}`;
  const getFamily=async id=>{const saved=await pgDb.get(familyKey(id),{});return {partner:null,parents:[],children:[],pending:null,...(saved&&typeof saved==='object'?saved:{})};};
  const saveFamily=async(id,d)=>pgDb.set(familyKey(id),{partner:d.partner||null,parents:Array.isArray(d.parents)?d.parents:[],children:Array.isArray(d.children)?d.children:[],pending:d.pending||null});
  const action=name==='family'?(a[0]||'view').toLowerCase():name;
  const target=memberFrom(i,name==='family'?a[1]:a[0]);
  if(action==='family'||action==='view'){
   const who=target?.user||i.user;const d=await getFamily(who.id);
   return reply(i,`**${who.username}'s family**\nPartner: ${d.partner?`<@${d.partner}>`:'None'}\nParents: ${d.parents.length?d.parents.map(id=>`<@${id}>`).join(', '):'None'}\nChildren: ${d.children.length?d.children.map(id=>`<@${id}>`).join(', '):'None'}\n${d.pending?`Pending proposal: <@${d.pending}>`:''}\\nCommands: !propose @user, !divorce, !adopt @user, !disown @user, !family delete`);
  }
  if(action==='delete') {const ok=await saveFamily(i.user.id,{partner:null,parents:[],children:[],pending:null});return reply(i,ok?'Your family data has been cleared.':'Could not save family data.');}
  if(action==='propose'){
   if(!target)return reply(i,'Usage: !propose @member');if(target.id===i.user.id)return reply(i,'You cannot propose to yourself.');if(target.user.bot)return reply(i,'You cannot propose to a bot.');
   const mine=await getFamily(i.user.id), theirs=await getFamily(target.id);if(mine.partner||theirs.partner)return reply(i,'One of you already has a partner.');
   mine.pending=target.id;await saveFamily(i.user.id,mine);await saveFamily(target.id,{...theirs,pending:i.user.id});return reply(i,`${target} and <@${i.user.id}>: proposal recorded. Both users can view it with !family; this legacy prefix system does not yet provide an interactive accept button.`);
  }
  if(action==='divorce'){
   const mine=await getFamily(i.user.id);if(!mine.partner)return reply(i,'You do not have a partner.');const partner=mine.partner;mine.partner=null;await saveFamily(i.user.id,mine);const theirs=await getFamily(partner);if(theirs.partner===i.user.id)theirs.partner=null;await saveFamily(partner,theirs);return reply(i,'Family partnership removed.');
  }
  if(action==='adopt'||action==='disown'){
   if(!target)return reply(i,`Usage: !${action} @member`);if(target.id===i.user.id)return reply(i,'You cannot use this on yourself.');const parent=await getFamily(i.user.id), child=await getFamily(target.id);
   if(action==='adopt'){if(parent.children.includes(target.id))return reply(i,'That member is already listed as your child.');if(parent.children.length>=30)return reply(i,'Family child limit reached.');parent.children.push(target.id);if(!child.parents.includes(i.user.id))child.parents.push(i.user.id);}
   else {parent.children=parent.children.filter(id=>id!==target.id);child.parents=child.parents.filter(id=>id!==i.user.id);}
   const ok1=await saveFamily(i.user.id,parent),ok2=await saveFamily(target.id,child);return reply(i,ok1&&ok2?(action==='adopt'?`${target} added to your family.`:`${target} removed from your family.`):'Could not save family changes to PostgreSQL.');
  }
 }
 if(['createreward','deletereward','setxp','leaderboard','show','add','remove','display','stick','unstick','messages','accept','deny','thanks','check','notes','setcolor','setchannelname'].includes(name)) return reply(i,`The original ${name} feature still needs its server-specific workflow migrated. No data was changed.`);
 // Safe generic fallbacks for entertainment commands.
 if(['cleverrate','epicgamerrate','simprate','stankrate','howgay','lovemeter'].includes(name))return reply(i,`**${i.user.username}** score: **${Math.floor(Math.random()*101)}%**`);
 if(name==='roast')return reply(i,`${i.user} ${choose(['You have something on your chin… no, the third one down.','You bring everyone so much joy… when you leave the room.','Your Wi-Fi signal has more personality.','You are proof that loading screens can become people.'])}`);
 if(name==='hack')return reply(i,`💻 Hacking ${user?.user?.tag||a[0]||'the mainframe'}...\n[██████████] 100%\nSimulation complete. Just for fun; no account was accessed.`);
 if(name==='sudo')return reply(i,`🔐 ${i.user.username} has been granted imaginary admin powers. (No permissions changed.)`);
 if(name==='token')return reply(i,'For safety, this bot will never reveal or generate Discord account tokens.');
 if(name==='confused')return reply(i,'(・・ ) ?');
 if(name==='rickroll')return reply(i,'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
 if(name==='xmas')return reply(i,'🎄 Ho ho ho! Happy holidays!');
 if(name==='fact')return reply(i,choose(['Octopuses have three hearts.','Honey can remain edible for a very long time when sealed properly.','A day on Venus is longer than its year.']));
 if(name==='birdfact')return reply(i,'🪶 Some bird species can sleep with one half of their brain at a time.');
 if(name==='catfact')return reply(i,'🐈 Cats use their whiskers to help judge whether spaces are wide enough to pass through.');
 if(name==='dogfact')return reply(i,'🐕 Dogs have an exceptionally strong sense of smell compared with humans.');
 if(name==='koalafact')return reply(i,'🐨 Koalas are marsupials, not bears.');
 if(name==='pandafact')return reply(i,'🐼 Giant pandas spend much of their day eating bamboo.');
 if(name==='wouldyourather')return reply(i,choose(['Would you rather explore the ocean or outer space?','Would you rather pause time or rewind it?','Would you rather always be 10 minutes early or 10 minutes late?']));
 if(name==='skipword')return reply(i,'Word game: type **planet** as fast as you can!');
 if(name==='fasttype')return reply(i,'Typing challenge: **The quick brown fox jumps over the lazy dog.**');
 if(name==='snake')return reply(i,'Snake is a graphical game and is not available as a text-only Discord command yet.');
 if(name==='willyoupressthebutton')return reply(i,choose(['Would you press the button: become invisible, but only when nobody is looking?','Would you press the button: get unlimited money, but never travel again?']));
 if(name==='review')return reply(i,'Usage and review submission flow need to be connected to a configured review channel first.');
 return reply(i,`📦 **${name}** source imported. Its original implementation is retained in legacy-source/Discord-Bot-main/src/commands; this handler still needs migration before it can safely execute. No data was changed.`);
}

export function createLegacyPrefixCommands(existingNames=new Set()){
 const result=[];
 for(const name of manifest){
  if(existingNames.has(name))continue;
  const command={
   data:new SlashCommandBuilder().setName(name).setDescription((descriptions[name]||`Imported prefix command: ${name}`).slice(0,100)),
   category:CATEGORY.get(name)||'Imported', prefixOnly:true,
   async execute(interaction,_config,client){return runLegacy(name,interaction,client);},
  };
  result.push(command);
 }
 return result;
}
