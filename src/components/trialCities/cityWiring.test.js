// WIRING tests — not unit tests. CityModal/CityCard reach react-router-dom
// through the API layer and AuthContext, which CRA's Jest resolver cannot load,
// so these read the source. Same pattern and the same normalise() as
// repGroundWiring.test.js.
//
// §1.2b — the picker was labelled Zone and wrote a `zone` key.
// §1.3 — "Mark as Reverified" PUT a `lastReverified` the model does not have,
//        the serializer dropped it, and the UI reported success. The control is
//        gone; the dialog stays as a read-only detail view.
import fs from 'fs';
import path from 'path';

const normalise = (src) =>
  src
    .replace(/\r\n/g, '\n')
    .replace(/'/g, '"')
    .replace(/\s+/g, '')
    .replace(/\((\w+)\)=>/g, '$1=>')
    .replace(/,(?=[)\]}])/g, '');

const read = (file) => fs.readFileSync(path.join(__dirname, file), 'utf8');
const modal = normalise(read('CityModal.jsx'));
const card = normalise(read('CityCard.jsx'));
const page = normalise(read('TrialCitiesPage.jsx'));

describe('§1.2b — the region picker is wired to `region`', () => {
  test('the select reads and writes formData.region', () => {
    expect(modal).toContain(normalise('value={formData.region}'));
    expect(modal).toContain(normalise("onChange={handleChange('region')}"));
  });

  test('formData carries a region key, so an edit prefills it', () => {
    expect(modal).toContain(normalise("region: editingCity.region || ''"));
  });

  test('no `zone` survives anywhere in the modal', () => {
    expect(read('CityModal.jsx')).not.toMatch(/zone/i);
  });

  test('the options come from the shared list, not a local literal', () => {
    expect(modal).toContain(normalise('{REGIONS.map('));
  });
});

describe('§1.3 — nothing claims a reverification was recorded', () => {
  test('no lastReverified is written anywhere', () => {
    expect(read('TrialCitiesPage.jsx')).not.toMatch(/lastReverified/);
    expect(read('CityCard.jsx')).not.toMatch(/lastReverified/);
  });

  test('the page has no reverify handler and passes no onReverify', () => {
    expect(page).not.toContain(normalise('handleReverifyCity'));
    expect(page).not.toContain(normalise('onReverify'));
  });

  test('the card offers no "Mark as Reverified" action and no success claim', () => {
    expect(read('CityCard.jsx')).not.toMatch(/Mark as Reverified/);
    expect(read('TrialCitiesPage.jsx')).not.toMatch(/reverified successfully/i);
  });

  test('the detail dialog itself is kept — only the false action was removed', () => {
    expect(card).toContain(normalise('Trial City Details'));
    expect(card).toContain(normalise('open={detailsDialogOpen}'));
  });
});
