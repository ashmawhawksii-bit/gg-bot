# Legacy prefix command migration status

This package imports 296 legacy prefix command names. The adapter has concrete TitanBot-compatible implementations for the commands listed below; this does **not** mean all 296 original commands have been fully ported.

## Implemented or migrated in this build

- Basic games/text helpers: `8ball`, `rps`, `reverse`, `ascii`, `encode`, `decode`, `anagram`, `worldclock`
- Server/member info and moderation helpers already implemented in the adapter: `members`, `channelinfo`, `roleinfo`, `inviteinfo`, `emojis`, `oldestmember`, `youngestmember`, `banlist`, `unwarn`, `lockdown`, `lock`, `unlock`, `limit`, `rename`, `nuke`, `clearuser`, `demote`, `softban`, `tempban`, `stealemoji`
- Persistent reminder: `remind` (requires PostgreSQL)
- Profile fields and list editing stored in a namespaced PostgreSQL `temp_data` key: `profile`, `create`, `aboutme`, `age`, `bday`, `color`, `gender`, `origin`, `status`, `addpet`, `delpet`, `addhobby`, `delhobby`, `addfood`, `delfood`, `addmovie`, `delmovie`, `addsong`, `delsong`, `addactor`, `delactor`, `addartist`, `delartist`
- Small utilities and server stats: `calculator`, `lower`, `information`, `url`, `hexcolour`, `pwdgen`, `time`, `tier`, `voice-channels`, `text-channels`, `stage-channels`, `news-channels`, `static-emoji`, `animated-emoji`, `boosts`, `bots`, `roles`, `channels`, `emoji`, `userinfo`
- Lookup/search commands: `github`, `npm`, `weather`, `crypto`, `translate`; `youtube`, `google`, `bing`, `ddg`, `docs`, `itunes`, and `steam` return usable search links
- Image generation: `bed`, `colorify`, `blur`, `burn`, `clown`, `darkness`, `facepalm`, `greyscale`, `invert`, `kiss`, `podium`, `spank`, `triggered`, `wanted`, and `wasted` via the Canvacord 5 API when that installed version exposes the requested effect

## Still requiring migration

A number of imported commands still need their original feature logic ported. The original manifest has 296 command names, and this build is a partial migration—not a guarantee that every command works. This includes commands coupled to old MongoDB/Mongoose models, multi-step setup or approval flows, music/voice playback, soundboard media, image APIs, or third-party APIs/keys. Those commands must not be considered working just because they appear in the command list. The adapter returns a clear migration or service error rather than claiming an operation succeeded.

## Deploy and test

1. Replace the project with this ZIP and run `npm install` on the host.
2. Keep `DATABASE_URL` configured and verify PostgreSQL reports connected at startup.
3. Restart the bot, then test the commands listed above in a test server first.
4. Confirm the bot has only the Discord permissions each moderation/config command needs. The host environment and live Discord interactions cannot be verified from this workspace.
