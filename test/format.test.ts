import { formatTime, formatPercentage } from "../src/common/format";

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
});
