import { test, describe } from "node:test";
import assert from "node:assert";
import { parseArtists } from "./utils.ts";

describe("parseArtists", () => {
  test("returns ['Unknown Artist'] for null", () => {
    assert.deepStrictEqual(parseArtists(null), ["Unknown Artist"]);
  });

  test("returns ['Unknown Artist'] for undefined", () => {
    assert.deepStrictEqual(parseArtists(undefined), ["Unknown Artist"]);
  });

  test("returns ['Unknown Artist'] for empty string", () => {
    assert.deepStrictEqual(parseArtists(""), ["Unknown Artist"]);
  });

  test("returns a single artist in an array", () => {
    assert.deepStrictEqual(parseArtists("Rick Astley"), ["Rick Astley"]);
  });

  test("splits artists by comma", () => {
    assert.deepStrictEqual(parseArtists("Artist A, Artist B"), ["Artist A", "Artist B"]);
  });

  test("splits artists by ampersand", () => {
    assert.deepStrictEqual(parseArtists("Artist A & Artist B"), ["Artist A", "Artist B"]);
  });

  test("splits artists by 'feat.'", () => {
    assert.deepStrictEqual(parseArtists("Artist A feat. Artist B"), ["Artist A", "Artist B"]);
  });

  test("splits artists by 'ft.'", () => {
    assert.deepStrictEqual(parseArtists("Artist A ft. Artist B"), ["Artist A", "Artist B"]);
  });

  test("splits artists by 'featuring'", () => {
    assert.deepStrictEqual(parseArtists("Artist A featuring Artist B"), ["Artist A", "Artist B"]);
  });

  test("is case-insensitive for delimiters", () => {
    assert.deepStrictEqual(parseArtists("Artist A FEAT. Artist B"), ["Artist A", "Artist B"]);
    assert.deepStrictEqual(parseArtists("Artist A FT. Artist B"), ["Artist A", "Artist B"]);
    assert.deepStrictEqual(parseArtists("Artist A FEATURING Artist B"), ["Artist A", "Artist B"]);
  });

  test("trims whitespace around artists", () => {
    assert.deepStrictEqual(parseArtists("  Artist A  ,  Artist B  "), ["Artist A", "Artist B"]);
  });

  test("handles complex combinations of delimiters", () => {
    assert.deepStrictEqual(
      parseArtists("Artist A, Artist B & Artist C feat. Artist D"),
      ["Artist A", "Artist B", "Artist C", "Artist D"]
    );
  });

  test("filters out empty parts", () => {
    assert.deepStrictEqual(parseArtists("Artist A , , Artist B"), ["Artist A", "Artist B"]);
  });
});
