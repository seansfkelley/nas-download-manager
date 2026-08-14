import { nullToUndefined, typesafeIsEqual, undefinedToNull } from "../src/common/lang";

// Compile-time only: fields that cannot hold the value being replaced must come back unwidened.
const _requiredSurvivesUndefinedToNull: { a: string } = undefinedToNull({ a: "" } as { a: string });
const _optionalGainsNull: { a?: string | null } = undefinedToNull({} as { a?: string });
const _requiredSurvivesNullToUndefined: { a: string } = nullToUndefined({ a: "" } as { a: string });
const _nullableGainsUndefined: { a: string | undefined } = nullToUndefined({ a: null } as {
  a: string | null;
});

// Compile-time only: the whole point of the wrapper is that the type parameter does not widen to
// something both arguments satisfy, which would make every comparison legal and lodash's signature
// no better. Every @ts-expect-error here is itself an error if the call starts compiling.
const _sameType: boolean = typesafeIsEqual({ a: 1 }, { a: 2 });
const _widerSecondArgument: boolean = typesafeIsEqual(["a"], undefined as string[] | undefined);
// @ts-expect-error -- different primitives.
const _primitives: boolean = typesafeIsEqual("a", 1);
// @ts-expect-error -- disjoint object shapes.
const _disjointShapes: boolean = typesafeIsEqual({ a: 1 }, { b: 2 });
// @ts-expect-error -- same key, different value type.
const _valueTypes: boolean = typesafeIsEqual({ a: 1 }, { a: "1" });
// @ts-expect-error -- different element types.
const _elementTypes: boolean = typesafeIsEqual([1], ["a"]);
// @ts-expect-error -- null is not undefined.
const _nullAndUndefined: boolean = typesafeIsEqual(null, undefined);

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
