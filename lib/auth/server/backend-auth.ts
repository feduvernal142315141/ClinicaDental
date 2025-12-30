function getBackendApiUrl(): string | null {
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || null;
}

async function postJson<T>(
  url: string,
  body: unknown,
  accessToken?: string
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  const data = (await response.json()) as T;
  return { ok: true, data };
}

export async function refreshTokensWithBackend(params: {
  refreshToken: string;
  accessToken?: string;
}): Promise<
  | { ok: true; tokens: { accessToken: string; refreshToken: string } }
  | {
      ok: false;
      code: "NO_API_URL" | "REFRESH_FAILED" | "BAD_RESPONSE";
      status: number;
    }
> {
  const apiUrl = getBackendApiUrl();
  if (!apiUrl) {
    return { ok: false, code: "NO_API_URL", status: 500 };
  }

  const res = await postJson<{ accessToken: string; refreshToken: string }>(
    `${apiUrl}/auth/refresh-token`,
    { refreshToken: params.refreshToken },
    params.accessToken
  );

  if (!res.ok) {
    return { ok: false, code: "REFRESH_FAILED", status: 401 };
  }

  if (!res.data?.accessToken || !res.data?.refreshToken) {
    return { ok: false, code: "BAD_RESPONSE", status: 500 };
  }

  return { ok: true, tokens: res.data };
}

export async function logoutWithBackend(params: {
  refreshToken: string;
  accessToken?: string;
}): Promise<void> {
  const apiUrl = getBackendApiUrl();
  if (!apiUrl) return;

  try {
    await postJson<unknown>(
      `${apiUrl}/auth/logout`,
      { refreshToken: params.refreshToken },
      params.accessToken
    );
  } catch {
    // best-effort
  }
}
