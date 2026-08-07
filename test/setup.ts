// Modules under src/ read the `browser` global while they are being imported (state/constants.ts,
// for one), so it has to exist before any test file's own imports run. Tests that exercise a
// particular API install their own stub for it on top of this one.
Object.assign(globalThis, {
  browser: {
    i18n: {
      getMessage: (key: string) => key,
    },
  },
});
