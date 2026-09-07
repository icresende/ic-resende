export const useApi = () => {
  const config = useRuntimeConfig();
  const base = config.public.apiBase.replace(/\/$/, "");
  const anonKey = config.public.supabaseAnonKey;

  const call = async <T = any>(
    path: string,
    options: { method?: string; body?: any; token?: string } = {}
  ): Promise<T> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${options.token || anonKey}`,
    };
    return await $fetch<T>(`${base}${path}`, {
      method: (options.method as any) || "GET",
      headers,
      body: options.body,
    });
  };

  return { call };
};
