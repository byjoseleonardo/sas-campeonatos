// Detección de la plataforma de transmisión a partir de la URL, para mostrar el
// logo/color correcto. Funciones puras, reutilizables en cliente y servidor.

export type StreamPlatform =
  | "youtube" | "facebook" | "twitch" | "instagram" | "tiktok" | "kick" | "generic";

export interface StreamInfo {
  platform: StreamPlatform;
  label: string;
  color: string; // color de marca (hex)
}

/** Agrega https:// si falta y valida la URL. Devuelve null si es inválida/vacía. */
export function normalizeStreamUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const full = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    new URL(full);
    return full;
  } catch {
    return null;
  }
}

/** Detecta la plataforma desde la URL. Devuelve null si la URL es inválida. */
export function detectStreamPlatform(url: string | null | undefined): StreamInfo | null {
  const full = normalizeStreamUrl(url);
  if (!full) return null;

  let host = "";
  try {
    host = new URL(full).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  const has = (...domains: string[]) => domains.some((d) => host === d || host.endsWith("." + d));

  if (has("youtube.com", "youtu.be")) return { platform: "youtube", label: "YouTube", color: "#FF0000" };
  if (has("facebook.com", "fb.watch", "fb.gg", "fb.com")) return { platform: "facebook", label: "Facebook", color: "#1877F2" };
  if (has("twitch.tv")) return { platform: "twitch", label: "Twitch", color: "#9146FF" };
  if (has("instagram.com")) return { platform: "instagram", label: "Instagram", color: "#E4405F" };
  if (has("tiktok.com")) return { platform: "tiktok", label: "TikTok", color: "#111111" };
  if (has("kick.com")) return { platform: "kick", label: "Kick", color: "#22c55e" };
  return { platform: "generic", label: "En vivo", color: "#16a34a" };
}
