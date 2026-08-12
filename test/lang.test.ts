import { nullToUndefined, undefinedToNull } from "../src/common/lang";

// Compile-time only: fields that cannot hold the value being replaced must come back unwidened.
const _requiredSurvivesUndefinedToNull: { a: string } = undefinedToNull({ a: "" } as { a: string });
const _optionalGainsNull: { a?: string | null } = undefinedToNull({} as { a?: string });
const _requiredSurvivesNullToUndefined: { a: string } = nullToUndefined({ a: "" } as { a: string });
const _nullableGainsUndefined: { a: string | undefined } = nullToUndefined({ a: null } as {
  a: string | null;
});

describe(undefinedToNull, () => {
  it("should replace an explicitly-undefined value with null", () => {
    expect(undefinedToNull({ a: undefined })).toStrictEqual({ a: null });
  });

  it("should leave null alone", () => {
    expect(undefinedToNull({ a: null })).toStrictEqual({ a: null });
  });

  it("should leave falsy values that are not undefined alone", () => {
    expect(undefinedToNull({ a: 0, b: "", c: false, d: NaN })).toStrictEqual({
      a: 0,
      b: "",
      c: false,
      d: NaN,
    });
  });

  it("should not recurse into nested values", () => {
    expect(undefinedToNull({ a: { b: undefined } })).toStrictEqual({ a: { b: undefined } });
  });

  it("should not mutate its input", () => {
    const input = { a: undefined };
    undefinedToNull(input);
    expect(input.a).toBeUndefined();
  });
});

describe(nullToUndefined, () => {
  it("should replace null with undefined, keeping the key", () => {
    expect(nullToUndefined({ a: null })).toStrictEqual({ a: undefined });
  });

  it("should leave undefined alone", () => {
    expect(nullToUndefined({ a: undefined })).toStrictEqual({ a: undefined });
  });

  it("should leave falsy values that are not null alone", () => {
    expect(nullToUndefined({ a: 0, b: "", c: false, d: NaN })).toStrictEqual({
      a: 0,
      b: "",
      c: false,
      d: NaN,
    });
  });

  it("should not recurse into nested values", () => {
    expect(nullToUndefined({ a: { b: null } })).toStrictEqual({ a: { b: null } });
  });

  it("should not mutate its input", () => {
    const input = { a: null };
    nullToUndefined(input);
    expect(input.a).toBeNull();
  });
});

describe("round trip", () => {
  it("should restore the original shape", () => {
    const original = { a: undefined, b: 1, c: "two", d: [3], e: { f: undefined } };
    expect(nullToUndefined(undefinedToNull(original))).toStrictEqual(original);
  });

  it("should not distinguish an original null from an original undefined", () => {
    expect(nullToUndefined(undefinedToNull({ a: null }))).toStrictEqual({ a: undefined });
  });
});
