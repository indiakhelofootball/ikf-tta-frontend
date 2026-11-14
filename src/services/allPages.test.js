import { getAllPages } from './allPages';

const rowsFrom = (start, n) => Array.from({ length: n }, (_, i) => ({ id: start + i }));

const pages = (count, sizes) => sizes.map((n, i) => ({
  count,
  next: i < sizes.length - 1 ? `https://x/api/csr/athletes/?page=${i + 2}` : null,
  previous: i > 0 ? `https://x/api/csr/athletes/?page=${i}` : null,
  results: rowsFrom(sizes.slice(0, i).reduce((a, b) => a + b, 0) + 1, n),
}));

test('252 athletes over three pages come back as 252', async () => {
  const getAll = jest.fn();
  pages(252, [100, 100, 52]).forEach((p) => getAll.mockResolvedValueOnce(p));

  const rows = await getAllPages(getAll, { project: '42' });

  expect(rows).toHaveLength(252);
  expect(rows[0].id).toBe(1);
  expect(rows[251].id).toBe(252);
  expect(getAll).toHaveBeenCalledTimes(3);
  expect(getAll.mock.calls.map((c) => c[0])).toEqual([
    { project: '42', limit: 1000, page: 1 },
    { project: '42', limit: 1000, page: 2 },
    { project: '42', limit: 1000, page: 3 },
  ]);
});

test('a page that fails mid-way rejects the read instead of returning part of it', async () => {
  const getAll = jest.fn();
  const [first] = pages(252, [100, 100, 52]);
  getAll.mockResolvedValueOnce(first).mockRejectedValueOnce(new Error('Bad gateway'));

  await expect(getAllPages(getAll, { project: '42' })).rejects.toThrow('Bad gateway');
  expect(getAll).toHaveBeenCalledTimes(2);
});

test('one page is one request', async () => {
  const getAll = jest.fn().mockResolvedValue({ count: 3, next: null, previous: null, results: rowsFrom(1, 3) });
  expect(await getAllPages(getAll)).toHaveLength(3);
  expect(getAll).toHaveBeenCalledTimes(1);
});

test('an unpaginated array is returned as it is', async () => {
  const getAll = jest.fn().mockResolvedValue(rowsFrom(1, 2));
  expect(await getAllPages(getAll)).toEqual(rowsFrom(1, 2));
});
