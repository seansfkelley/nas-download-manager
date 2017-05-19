# synology

## TODO

- [ ] register as a URL handler (would have to add a document-level handler to catch registered outbound links)
- [ ] audit error-handling (promise-catching, mostly)
- [ ] determine how to merge `browser.d.ts` and `DefinitelyTyped/chrome` (which has a different shape, specifically, around Promises v. callbacks)
- [ ] should settings page try to eagerly check that the hostname is valid?
- [ ] check that <audio> and <video> downloads work as expected
- [ ] fix notification interval setting to not require onblur
- [ ] icons for disabled/in-progress/success/failure of notifications/browser icon
- [ ] factor out synology api
