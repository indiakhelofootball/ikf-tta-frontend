import { diffRows } from './rowChanges';

test('a row that was not on screen is new', () => {
  const { added, changed } = diffRows([{ id: 1, a: 1 }], [{ id: 1, a: 1 }, { id: 2, a: 1 }]);
  expect([...added]).toEqual([2]);
  expect([...changed]).toEqual([]);
});

test('a row whose fields differ is changed, including nested items', () => {
  const prev = [{ id: 1, status: 'Draft', items: [{ name: 'Ball', quantity: 2 }] }];
  const next = [{ id: 1, status: 'Draft', items: [{ name: 'Ball', quantity: 3 }] }];
  expect([...diffRows(prev, next).changed]).toEqual([1]);
});

test('fields only the screen holds do not make a row look changed', () => {
  // After a save the page holds the DETAIL response, which carries logs and
  // the delivery photo; the list row does not.
  const prev = [{ id: 1, status: 'Draft', logs: [{ id: 9 }], deliveryImageUrl: 'data:...' }];
  const next = [{ id: 1, status: 'Draft' }];
  const { added, changed } = diffRows(prev, next);
  expect(added.size + changed.size).toBe(0);
});

test('nothing on screen yet means every row is new', () => {
  expect(diffRows(undefined, [{ id: 1 }]).added.size).toBe(1);
});
