// Which org fields to put on the wire when adding a REP.
//
// Extracted so it can be unit-tested, and because the rule is genuinely subtle:
// it has to get two opposite cases right at once.
//
// Background. Adding a REP whose name matches an existing org makes the backend
// MERGE onto that stored row. `orgData` seeds every untouched field to '' — and
// the name search never prefills repLogoLink at all — so sending the whole
// object wrote blanks over stored values. That is the "Address and MOU, Logo
// got deleted again" report, raised six times.
//
// The naive fix, dropping every blank, trades one bug for another: once the
// name search has prefilled a field from the matched org, emptying that box is
// a deliberate clear, and the backend honours a blank the caller actually sent.
// Dropping it would silently discard the edit.
//
// The rule that satisfies both: keep a blank only where the matched org holds a
// value for that field — exactly when clearing it means something. With no
// match there is nothing to clear, so every blank is dropped.

export const isClearable = (existingRep, key) =>
  !!existingRep && !!existingRep[key] && existingRep[key] !== '';

export const buildAddModePayload = (orgData, existingRep) =>
  Object.fromEntries(
    Object.entries(orgData || {}).filter(
      ([key, value]) => value !== '' || isClearable(existingRep, key)
    )
  );
