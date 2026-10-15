import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { API_ORIGIN } from "@/constants/api";

// Module-level token provider — set this once in your root layout so every
// fetchAPI call automatically gets the Clerk JWT attached when present.
let _tokenProvider: (() => Promise<string | null>) | null = null;

export function setFetchTokenProvider(
  provider: (() => Promise<string | null>) | null,
) {
  _tokenProvider = provider;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  if (!_tokenProvider) return {};
  try {
    const token = await _tokenProvider();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

export const fetchAPI = async (url: string, options?: RequestInit) => {
  const apiBaseUrl = API_ORIGIN;
  const requestUrl = /^https?:\/\//i.test(url)
    ? url
    : `${apiBaseUrl}/${url
      .replace(/^\/\(api\)(?=\/|$)/, "/api")
      .replace(/^\/+/, "")}`;

  if (/^http:/i.test(requestUrl) && !requestUrl.includes("localhost")) {
    throw new Error("Insecure HTTP requests are not allowed");
  }

  const authHeader = await getAuthHeader();

  const mergedHeaders: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
    ...authHeader,
  };

  const response = await fetch(requestUrl, {
    ...options,
    headers: mergedHeaders,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP error! status: ${response.status} ${body}`);
  }

  return await response.json();
};

export const useFetch = <T>(url: string, options?: RequestInit) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optionsKey = useMemo(
    () => (options ? JSON.stringify(options) : ""),
    [options],
  );

  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    const id = ++requestId.current;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchAPI(url, options);

      if (!mounted.current || id !== requestId.current) return;
      setData(result?.data ?? null);
    } catch (err) {
      if (!mounted.current || id !== requestId.current) return;
      setError((err as Error).message);
    } finally {
      if (mounted.current && id === requestId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, optionsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};