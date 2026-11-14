export const PAGE_LIMIT = 1000;

// Every row of a paginated list ({ count, next, previous, results }), page by
// page until the server says there is no next one. Any page that fails rejects
// the whole read, so a caller never shows part of a list as all of it. A plain
// array (an unpaginated endpoint) is returned as it is.
export async function getAllPages(getAll, params = {}) {
  const rows = [];
  for (let page = 1; ; page += 1) {
    const data = await getAll({ ...params, limit: PAGE_LIMIT, page });
    if (Array.isArray(data)) return data;
    rows.push(...(data?.results || []));
    if (!data?.next) return rows;
  }
}
