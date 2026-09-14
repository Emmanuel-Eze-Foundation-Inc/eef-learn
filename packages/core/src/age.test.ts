import { describe, expect, it } from "vitest";

import { isAtLeastYearsOld, parseEligibleBirthdate } from "./age";

const now = new Date("2026-09-14T00:00:00Z");

describe("isAtLeastYearsOld", () => {
  it("accepts exactly 13 today", () => {
    expect(isAtLeastYearsOld(new Date("2013-09-14"), 13, now)).toBe(true);
  });
  it("rejects 13 tomorrow", () => {
    expect(isAtLeastYearsOld(new Date("2013-09-15"), 13, now)).toBe(false);
  });
  it("accepts adults", () => {
    expect(isAtLeastYearsOld(new Date("1990-01-01"), 13, now)).toBe(true);
  });
});

describe("parseEligibleBirthdate", () => {
  it("returns Date for eligible birthdate", () => {
    expect(parseEligibleBirthdate("2000-05-01", now)).toEqual(new Date("2000-05-01"));
  });
  it("null for under-13", () => {
    expect(parseEligibleBirthdate("2020-01-01", now)).toBeNull();
  });
  it("null for garbage", () => {
    expect(parseEligibleBirthdate("not-a-date", now)).toBeNull();
  });
  it("null for future dates", () => {
    expect(parseEligibleBirthdate("2030-01-01", now)).toBeNull();
  });
  it("null for >120 years old", () => {
    expect(parseEligibleBirthdate("1890-01-01", now)).toBeNull();
  });
});
