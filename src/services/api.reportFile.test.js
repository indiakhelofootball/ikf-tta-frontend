import { csrAPI, clientAPI, fileNameFromDisposition } from './api';

const response = (status, body, headers = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => body,
  blob: async () => body,
});

beforeEach(() => {
  localStorage.setItem('tta_token', 'tok');
  global.fetch = jest.fn();
});

afterEach(() => {
  localStorage.clear();
  delete global.fetch;
});

test('the upload is multipart: the JSON content type is never forced on it', async () => {
  global.fetch.mockResolvedValue(response(201, { hasFile: true }, { 'content-type': 'application/json' }));
  const file = new File(['%PDF-1.4'], 'r.pdf', { type: 'application/pdf' });

  await csrAPI.reportFile.upload(9, file);

  const [url, init] = global.fetch.mock.calls[0];
  expect(url).toMatch(/\/csr\/reports\/9\/file\/$/);
  expect(init.method).toBe('POST');
  expect(init.body).toBeInstanceOf(FormData);
  expect(init.body.get('file')).toBe(file);
  expect(init.headers.Authorization).toBe('Bearer tok');
  expect(init.headers['Content-Type']).toBeUndefined();
});

test('the funder download returns the bytes with the server-given name', async () => {
  const blob = new Blob(['x']);
  global.fetch.mockResolvedValue(response(200, blob, {
    'content-type': 'application/pdf',
    'content-disposition': "inline; filename=\"r_.pdf\"; filename*=UTF-8''r%C3%A9.pdf",
  }));

  const out = await clientAPI.reportFile(4);

  expect(global.fetch.mock.calls[0][0]).toMatch(/\/client\/reports\/4\/file\/$/);
  expect(out).toEqual({ blob, contentType: 'application/pdf', fileName: 'ré.pdf' });
});

test('a refused upload surfaces the server sentence', async () => {
  global.fetch.mockResolvedValue(response(400, { file: ['The file is larger than 15 MB.'] }, {
    'content-type': 'application/json',
  }));
  await expect(csrAPI.reportFile.upload(1, new File(['x'], 'a.pdf')))
    .rejects.toThrow('The file is larger than 15 MB.');
});

test('the plain filename is used when there is no encoded one', () => {
  expect(fileNameFromDisposition('attachment; filename="deck.pptx"')).toBe('deck.pptx');
  expect(fileNameFromDisposition(null)).toBe('');
});
