"use client";

import { Youtube, Facebook, Twitch, Instagram, Radio } from "lucide-react";
import { detectStreamPlatform, normalizeStreamUrl, type StreamPlatform } from "@/lib/stream";

const ICONS: Partial<Record<StreamPlatform, typeof Radio>> = {
  youtube: Youtube,
  facebook: Facebook,
  twitch: Twitch,
  instagram: Instagram,
};

/**
 * Ícono/logo clickeable que abre la transmisión del partido en otra pestaña.
 * Si la URL es null/inválida, no renderiza nada.
 * Usa <button> + window.open (no <a>) para poder ir dentro de tarjetas clickeables
 * sin anidar enlaces, y detiene la propagación del click.
 */
export function StreamLink({
  url,
  size = "sm",
  showLabel = false,
  className = "",
}: {
  url: string | null | undefined;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const href = normalizeStreamUrl(url);
  const info = detectStreamPlatform(url);
  if (!href || !info) return null;

  const Icon = ICONS[info.platform] ?? Radio;
  const dim = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(href, "_blank", "noopener,noreferrer");
      }}
      title={`Ver transmisión en ${info.label}`}
      aria-label={`Ver transmisión en ${info.label}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 transition-opacity hover:opacity-80 ${className}`}
      style={{ color: info.color, borderColor: info.color, backgroundColor: `${info.color}1a` }}
    >
      <Icon className={dim} />
      {showLabel && <span>{info.label}</span>}
    </button>
  );
}
