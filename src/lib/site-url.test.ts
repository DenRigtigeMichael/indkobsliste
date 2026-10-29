import assert from "node:assert/strict";
import {
  canonicalOrigin,
  householdShareUrl,
  isHomeScreenLaunch,
  wwwHostFor,
} from "./site-url";

assert.equal(wwwHostFor("indkoebsliste.dk"), "www.indkoebsliste.dk");
assert.equal(wwwHostFor("www.indkoebsliste.dk"), null);
assert.equal(wwwHostFor("householdlist.eu"), "www.householdlist.eu");
assert.equal(wwwHostFor("www.householdlist.eu"), null);
assert.equal(wwwHostFor("localhost"), null);

assert.equal(
  canonicalOrigin("https://indkoebsliste.dk"),
  "https://www.indkoebsliste.dk",
);
assert.equal(
  canonicalOrigin("https://www.indkoebsliste.dk"),
  "https://www.indkoebsliste.dk",
);
assert.equal(
  canonicalOrigin("https://householdlist.eu"),
  "https://www.householdlist.eu",
);

assert.equal(
  householdShareUrl("https://indkoebsliste.dk", "ab12cd"),
  "https://www.indkoebsliste.dk/h/AB12CD",
);
assert.equal(
  householdShareUrl("https://www.householdlist.eu", "xyz"),
  "https://www.householdlist.eu/h/XYZ",
);

assert.equal(
  isHomeScreenLaunch({ get: (k) => (k === "source" ? "pwa" : null) }, null),
  true,
);
assert.equal(
  isHomeScreenLaunch({ get: () => null }, null),
  false,
);

const fakeStandalone = {
  navigator: { standalone: true },
  matchMedia: () => ({ matches: false }),
} as unknown as Window;
assert.equal(isHomeScreenLaunch({ get: () => null }, fakeStandalone), true);

const fakeDisplayMode = {
  navigator: {},
  matchMedia: (q: string) => ({
    matches: q.includes("standalone"),
  }),
} as unknown as Window;
assert.equal(isHomeScreenLaunch({ get: () => null }, fakeDisplayMode), true);

console.log("site-url tests passed");
