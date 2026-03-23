export function parseArtists(artistString: string | null | undefined): string[] {
  if (!artistString) return ["Unknown Artist"];

  // Split by common delimiters
  // Commas, ampersands, "feat.", "ft.", "featuring" (case insensitive)
  const regex = /\s*(?:,|\s+&\s+|\s+feat\.\s+|\s+ft\.\s+|\s+featuring\s+)\s*/i;

  const parts = artistString.split(regex).map(s => s.trim()).filter(Boolean);

  return parts.length > 0 ? parts : [artistString];
}
