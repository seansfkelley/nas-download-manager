import * as fs from "fs";
import * as path from "path";

import {
  formatTime,
  formatPercentage,
  formatRelativeTime,
  resolveTranslatedLocale,
  TRANSLATED_LOCALES,
} from "../src/common/format";

describe("format", () => {
  describe("formatTime", () => {
    const TESTS: { input: number; output: string }[] = [
      { input: 0, output: "0:00" },
      { input: 1, output: "0:01" },
      { input: 10, output: "0:10" },
      { input: 60, output: "1:00" },
      { input: 61, output: "1:01" },
      { input: 70, output: "1:10" },
      { input: 610, output: "10:10" },
      { input: 3600, output: "1:00:00" },
      { input: 3661, output: "1:01:01" },
      { input: 4210, output: "1:10:10" },
    ];

    it.each(TESTS)("should output '$output' for $input", ({ input, output }) => {
      expect(formatTime(input)).toBe(output);
    });
  });

  describe("formatPercentage", () => {
    const TESTS: { input: number; output: string }[] = [
      { input: 0, output: "0%" },
      { input: 0.1, output: "10%" },
      { input: 0.011, output: "1.1%" },
      // This one actually surfaced in the UI. .56 * 100 = 56.00000000000001.
      { input: 0.56, output: "56%" },
      { input: 1, output: "100%" },
      { input: 1.0, output: "100%" },
    ];

    it.each(TESTS)("should output '$output' for $input", ({ input, output }) => {
      expect(formatPercentage(input)).toBe(output);
    });
  });

  describe("formatRelativeTime", () => {
    const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);
    const SECOND = 1000;
    const MINUTE = 60 * SECOND;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;

    const TESTS: { name: string; offset: number; output: string }[] = [
      { name: "now", offset: 0, output: "now" },
      { name: "under a second", offset: -999, output: "now" },
      { name: "one second", offset: -SECOND, output: "1 second ago" },
      { name: "under a minute", offset: -59 * SECOND, output: "59 seconds ago" },
      { name: "one minute", offset: -MINUTE, output: "1 minute ago" },
      { name: "under an hour", offset: -59 * MINUTE, output: "59 minutes ago" },
      { name: "one hour", offset: -HOUR, output: "1 hour ago" },
      { name: "one day", offset: -DAY, output: "yesterday" },
      { name: "one month", offset: -30 * DAY, output: "last month" },
      { name: "one year", offset: -365 * DAY, output: "last year" },
      { name: "in the future", offset: HOUR, output: "in 1 hour" },
    ];

    it.each(TESTS)("should output '$output' $name", ({ offset, output }) => {
      expect(formatRelativeTime(NOW + offset, NOW, "en")).toBe(output);
    });

    it("should format in the requested locale", () => {
      expect(formatRelativeTime(NOW - HOUR, NOW, "de")).toBe("vor 1 Stunde");
    });
  });

  describe("resolveTranslatedLocale", () => {
    const TESTS: { input: string; output: string }[] = [
      { input: "en", output: "en" },
      { input: "de", output: "de" },
      { input: "en-US", output: "en" },
      { input: "de-AT", output: "de" },
      { input: "fr-CA", output: "fr" },
      { input: "zh-CN", output: "zh-CN" },
      { input: "zh-TW", output: "zh-TW" },
      // Case-insensitive, because getUILanguage is not required to match our casing.
      { input: "zh-tw", output: "zh-TW" },
      // No zh directory exists to fall back to, so browser.i18n serves English and so do we.
      { input: "zh-HK", output: "en" },
      { input: "zh", output: "en" },
      // Not translated at all.
      { input: "es", output: "en" },
      { input: "ja-JP", output: "en" },
    ];

    it.each(TESTS)("should resolve $input to $output", ({ input, output }) => {
      expect(resolveTranslatedLocale(input)).toBe(output);
    });
  });

  describe("TRANSLATED_LOCALES", () => {
    it("should list exactly the locales that have messages", () => {
      // _locales uses underscores, BCP 47 uses hyphens.
      const onDisk = fs
        .readdirSync(path.join(__dirname, "..", "_locales"))
        .map((name) => name.replace("_", "-"))
        .sort();
      expect([...TRANSLATED_LOCALES].sort()).toStrictEqual(onDisk);
    });

    it("should be formattable by Intl.RelativeTimeFormat", () => {
      TRANSLATED_LOCALES.forEach((locale) => {
        expect(Intl.RelativeTimeFormat.supportedLocalesOf(locale)).toStrictEqual([locale]);
      });
    });
  });
});
