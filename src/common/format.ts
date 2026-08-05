const METRIC_SUFFIXES = ["", "K", "M", "G", "T", "P"];

export function formatMetric1024(n: number) {
  function renderString(suffix: string) {
    if (n === Math.round(n)) {
      return `${n.toFixed(0)}${suffix}`;
    } else {
      return `${n.toFixed(2)}${suffix}`;
    }
  }

  for (let i = 0; i < METRIC_SUFFIXES.length - 1; ++i) {
    if (n < 1024) {
      return renderString(METRIC_SUFFIXES[i]);
    } else {
      n /= 1024;
    }
  }

  return renderString(METRIC_SUFFIXES[METRIC_SUFFIXES.length - 1]);
}

export function formatTime(s: number) {
  const hours = Math.floor(s / (60 * 60));
  const minutes = Math.floor(s / 60) - hours * 60;
  const seconds = Math.floor(s) - hours * 60 * 60 - minutes * 60;

  function withZero(n: number) {
    return n > 9 ? n.toString() : `0${n.toString()}`;
  }

  return `${hours ? hours + ":" : ""}${hours ? withZero(minutes) : minutes}:${withZero(seconds)}`;
}

// This stupid logic exists because Number sucks. Naively trying to convert .56 into a percentage
// yielded 56.00000000000001% so I jumped through some hoops to get the exact formatting I wanted.
export function formatPercentage(fraction: number) {
  const scaled = Math.round(fraction * 1000);
  return scaled % 10 === 0 ? `${(scaled / 10).toFixed(0)}%` : `${(scaled / 10).toFixed(1)}%`;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Largest first: the first unit the difference fills is the one that gets used. Months and years are
// approximations, which is fine for a "last updated" label and is what a calendar-unaware formatter
// can offer anyway.
const RELATIVE_TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * DAY],
  ["month", 30 * DAY],
  ["day", DAY],
  ["hour", HOUR],
  ["minute", MINUTE],
  ["second", SECOND],
];

// Mirrors the directories under _locales/, which a test asserts. Intl.RelativeTimeFormat knows far
// more locales than this extension has messages for, and browser.i18n serves English for the rest,
// so an unfiltered UI language would render the fragment in a language the sentence around it is
// not written in: "Updated hace 1 hora".
export const TRANSLATED_LOCALES = ["de", "en", "fr", "ru", "zh-CN", "zh-TW"];

export function resolveTranslatedLocale(uiLanguage: string) {
  const tag = uiLanguage.toLowerCase();
  const primarySubtag = tag.split("-")[0];
  return (
    TRANSLATED_LOCALES.find((locale) => locale.toLowerCase() === tag) ??
    // Only bare entries match a primary subtag, which mirrors how browser.i18n resolves: de-AT finds
    // the de messages, but zh-HK has no zh directory to fall back to and so gets English.
    TRANSLATED_LOCALES.find((locale) => locale === primarySubtag) ??
    "en"
  );
}

// now and locale are parameters so that this is testable without a clock or a browser. Their
// defaults are evaluated per call, so passing them explicitly never touches the browser API.
export function formatRelativeTime(
  timestamp: number,
  now: number = Date.now(),
  locale: string = resolveTranslatedLocale(browser.i18n.getUILanguage()),
) {
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const difference = timestamp - now;

  for (const [unit, milliseconds] of RELATIVE_TIME_UNITS) {
    if (Math.abs(difference) >= milliseconds) {
      return format.format(Math.round(difference / milliseconds), unit);
    }
  }

  return format.format(0, "second");
}
