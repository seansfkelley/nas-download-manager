import "mocha";
import { expect } from "chai";

import { _stripQueryAndFragment } from "../src/background/actions/urls";

describe("_stripQueryAndFragment", () => {
  it("should not change a URL without a query or a fragment", () => {
    expect(_stripQueryAndFragment("http://foo.bar/baz/")).to.equal("http://foo.bar/baz/");
  });

  it("should strip a URL that has only a query", () => {
    expect(_stripQueryAndFragment("http://foo.bar/?baz=quux")).to.equal("http://foo.bar/");
  });

  it("should strip a URL that has only a fragment", () => {
    expect(_stripQueryAndFragment("http://foo.bar/#baz")).to.equal("http://foo.bar/");
  });

  it("should strip a URL that has both a query and a fragment", () => {
    expect(_stripQueryAndFragment("http://foo.bar/?baz=quux#corge")).to.equal("http://foo.bar/");
  });

  it("should strip a URL that has a question mark in the fragment", () => {
    expect(_stripQueryAndFragment("http://foo.bar/#/?baz=quux")).to.equal("http://foo.bar/");
  });

  it("should strip a URL that has a query and a fragment with a question mark in it", () => {
    expect(_stripQueryAndFragment("http://foo.bar/?baz=quux#/?corge=grault")).to.equal(
      "http://foo.bar/",
    );
  });
});
