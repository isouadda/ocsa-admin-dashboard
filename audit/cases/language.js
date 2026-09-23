// The language the dashboard asks the API for.
//
// Every call says the language the screen is drawn in, as Accept-Language, so the API's refusals,
// notices, pick lists and checklist items come back in the language the person is reading. The stub
// keeps what each call said beside the call, and keeps every call that said nothing, or another
// language, in a list no case can reset. That list is read here, once the whole run is over, so a
// call made anywhere in any suite is held to it.
"use strict";

function runLate({ stubs, results, inventory }) {
  const seen = stubs.language();
  const misses = seen.misses;
  const said = (m) => m.method + " " + m.path + " said " + (m.said === null ? "nothing" : JSON.stringify(m.said))
    + " on a screen drawn in " + JSON.stringify(m.want);
  results.check("language", inventory.LANGUAGE_HEADER.id, seen.calls > 0 && misses.length === 0,
    seen.calls === 0 ? "no call reached the stub, so no call was checked"
      : misses.length + " of " + seen.calls + " calls did not say the language the screen is drawn in: "
        + misses.slice(0, 3).map(said).join("; "));
  if (misses.length === 0) {
    results.note("every one of the " + seen.calls + " calls said the language its screen is drawn in");
    return;
  }
  // Each route that went wrong is named once, with how many times it did.
  const byRoute = {};
  misses.forEach((m) => { const k = said(m); byRoute[k] = (byRoute[k] || 0) + 1; });
  Object.keys(byRoute).slice(0, 20).forEach((k) => results.note("a call that did not say its language: " + k + " (" + byRoute[k] + " times)"));
}

module.exports = { runLate };
