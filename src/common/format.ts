const METRIC_SUFFIXES = [
  '',
  'K',
  'M',
  'G',
  'T',
  'P'
];

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
