# Imported Discord-Bot command source

The original command source files from `Discord-Bot-main/src/commands` have been copied into `legacy-source/Discord-Bot-main/src/commands`, excluding the Economy category as requested. These files are kept out of TitanBot's normal loader because the old project uses a different client API, database models, and CommonJS command contract.

A prefix-only adapter manifest is in `src/config/legacyPrefixManifest.json`. These adapters do not register slash commands, so they do not consume Discord's 100 global slash-command slots. TitanBot's normal commands are not overwritten. Commands whose behavior can be safely implemented without the old database/API layer have working basic handlers; other imported commands explicitly report that their original handler is preserved but still needs compatibility migration. Do not treat those messages as successful command execution.

## Important limitations

- The old source files are preserved, not directly executable in TitanBot as-is.
- Economy is intentionally excluded.
- Commands that need old MongoDB/Mongoose models, external APIs, media/image libraries, timers, or interactive component handlers still require migration and runtime tests.
- `tempban` currently applies the ban but does not schedule an automatic unban; it warns about this. Do not use it as a true timed ban until persistent scheduling is implemented.
- Persistent user/guild data requires a real external PostgreSQL database configured via the hosting environment; memory fallback is not durable across restarts.
- Dependencies could not be installed or runtime-tested in this environment, so test on a copy/staging bot before deploying to a production server.
