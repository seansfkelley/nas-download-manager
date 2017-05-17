# synology

## TODO

- [ ] fix issue where you can't actually download .torrent files
- [ ] allow specifying IPs as the hostname
- [ ] register as a URL handler (would have to add a document-level handler to catch registered outbound links)
- [ ] audit error-handling (promise-catching, mostly)
- [ ] determine how to merge `browser.d.ts` and `DefinitelyTyped/chrome` (which has a different shape, specifically, around Promises v. callbacks)
- [ ] should background task notify if there is no username/password set?
- [ ] fix notification interval setting to not require onblur
- [ ] when deleting tasks, the UI removes two from the list (!)
- [ ] icons for disabled/in-progress/success/failure of notifications/browser icon
- [ ] factor out synology api
- [ ] rename stateful -> client
- [ ] support more than just link elements (video, audio, etc.)
