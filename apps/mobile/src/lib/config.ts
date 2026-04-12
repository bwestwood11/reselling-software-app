import Constants from "expo-constants";

function getExpoHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  const [host] = hostUri.split(":");
  return host || null;
}

export function resolveApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) return explicit;

  const host = getExpoHost();
  if (host) return `http://${host}:3001`;

  return "http://localhost:3001";
}
