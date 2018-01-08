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

export function formatTime(s: number) {
  const hours = Math.floor(s / (60 * 60));
  const minutes = Math.floor(s / 60) - hours * 60;
  const seconds = Math.floor(s) - hours * 60 * 60 - minutes * 60;

  function withZero(n: number) {
    return n > 9
      ? n.toString()
      : `0${n.toString()}`;
  }

  return `${hours ? hours + ':' : ''}${hours ? withZero(minutes) : minutes}:${withZero(seconds)}`;
}

// This stupid logic exists because Number sucks. Naively trying to convert .56 into a percentage
// yielded 56.00000000000001% so I jumped through some hoops to get the exact formatting I wanted.
export function formatPercentage(fraction: number) {
  const scaled = Math.round(fraction * 1000);
  return scaled % 10 === 0
    ? `${(scaled / 10).toFixed(0)}%`
    : `${(scaled / 10).toFixed(1)}%`;
}
