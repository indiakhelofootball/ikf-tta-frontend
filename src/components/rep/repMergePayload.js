// Which org fields to put on the wire when adding a REP.
//
// THE LAYER RULE
//
// A REP row is a master record: name, contacts, socials, MoU, logo. It carries
// no address, because "where the REP is" and "where we are sending them for a
// trial" are different facts and both live on the city assignment. One org has
// many city assignments and every one of them reads that single row.
//
// So there are two different operations behind one form:
//
//   NEW ORG    — the name matches nothing. The form is creating the master
//                record, and the org fields on it are the record.
//   ADD CITY   — the name matches an existing org. The form is adding a city
//                UNDER that record, and the record itself is not being edited.
//                Editing it is a separate screen (edit mode, PUT /reps/<id>/).
//
// On the add-city path the org layer is therefore not ours to send. Only the
// name goes, because the server needs it to find the org.
//
// WHY THIS FILE HAS BEEN WRITTEN THREE TIMES
//
// Every previous version tried to decide WHICH org values to merge, and each
// one produced a version of the same bug:
//
//   send everything      -> blanks wiped the stored logo link and MoU status
//                           every time a city was added ("Address and MOU, Logo
//                           got deleted again", reported six times)
//   drop every blank     -> a deliberate clear was silently discarded
//   keep clearable blanks-> an untouched `repLogoLink` (never prefilled by the
//                           name search, so always '') counted as "clearable"
//                           whenever the org held one, and wiped it again
//
// The question was wrong. On the add-city path no org value should be on the
// wire at all, so there is nothing to decide.

const IDENTITY = ['repName'];

export const buildAddModePayload = (orgData, existingRep) => {
  const data = orgData || {};

  // Adding a city to an org that already exists: send its name and nothing else.
  if (existingRep) {
    return Object.fromEntries(
      IDENTITY.filter((k) => k in data).map((k) => [k, data[k]]),
    );
  }

  // Creating the org: send what was filled in. Blanks are dropped because there
  // is no stored row for them to mean anything against. `value !== ''` rather
  // than a truthiness test, so a false NA toggle and a 0 survive.
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== ''),
  );
};
