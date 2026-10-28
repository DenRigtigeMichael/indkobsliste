import assert from "node:assert/strict";
import { defaultLocaleFromHostname } from "./preferences";

assert.equal(defaultLocaleFromHostname("householdlist.eu"), "en");
assert.equal(defaultLocaleFromHostname("www.householdlist.eu"), "en");
assert.equal(defaultLocaleFromHostname("HouseholdList.EU"), "en");
assert.equal(defaultLocaleFromHostname("www.householdlist.eu."), "en");

assert.equal(defaultLocaleFromHostname("indkoebsliste.dk"), "da");
assert.equal(defaultLocaleFromHostname("www.indkoebsliste.dk"), "da");
assert.equal(
  defaultLocaleFromHostname("indkobsliste-production.up.railway.app"),
  "da",
);
assert.equal(defaultLocaleFromHostname("localhost"), "da");
assert.equal(defaultLocaleFromHostname("127.0.0.1"), "da");

console.log("preferences hostname locale tests ok");
