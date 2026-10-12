describe('fetchAPI transport', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.EXPO_PUBLIC_API_URL = originalEnv;
    jest.resetModules();
  });

  it('UT-FETCH-01: always uses the Render API', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://not-render.example.com';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    }) as any;

    const { fetchAPI } = require('../../lib/fetch');
    await fetchAPI('user');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://lyft-api-eofz.onrender.com/user',
      undefined,
    );
  });

  it('UT-FETCH-02: builds relative URLs from Render', async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    }) as any;

    const { fetchAPI } = require('../../lib/fetch');
    await fetchAPI('user');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://lyft-api-eofz.onrender.com/user',
      undefined,
    );
  });

  it('UT-FETCH-03: normalizes relative paths', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://not-render.example.com///';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }) as any;

    const { fetchAPI } = require('../../lib/fetch');
    await fetchAPI('user');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://lyft-api-eofz.onrender.com/user',
      undefined,
    );
  });

  it('UT-FETCH-04: rejects insecure absolute HTTP requests', async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }) as any;

    const { fetchAPI } = require('../../lib/fetch');
    await expect(fetchAPI('http://api.example.com/user')).rejects.toThrow(/Insecure HTTP/);
  });

  it('UT-FETCH-05: throws on non-OK HTTP responses', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server error'),
    }) as any;

    const { fetchAPI } = require('../../lib/fetch');
    await expect(fetchAPI('user')).rejects.toThrow(/HTTP error! status: 500/);
  });

  it('UT-FETCH-06: passes absolute URLs through unchanged', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    }) as any;

    const { fetchAPI } = require('../../lib/fetch');
    await fetchAPI('https://other-service.example.com/endpoint');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://other-service.example.com/endpoint',
      undefined,
    );
  });
});