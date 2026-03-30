export function parseArtists(artistString: string | null | undefined): string[] {
  if (!artistString) return ["Unknown Artist"];

  // Split by common delimiters
  // Commas, ampersands, "feat.", "ft.", "featuring" (case insensitive)
  const regex = /\s*(?:,|\s+&\s+|\s+feat\.\s+|\s+ft\.\s+|\s+featuring\s+)\s*/i;

  const parts = artistString.split(regex).map(s => s.trim()).filter(Boolean);

  return parts.length > 0 ? parts : [artistString];
}

export const usernameFormatRegex = /^[a-zA-Z0-9]+$/;

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
  sanitizedValue: string;
}

/**
 * Validates a username against length and character constraints.
 *
 * @param username The raw input string from the user.
 * @returns A ValidationResult object indicating success or specific error.
 */
export function validateUsername(username: string): ValidationResult {
  // Convert to lowercase as requested for the sanitized value
  const sanitizedValue = username.toLowerCase();

  // 1. Check length constraints (3 to 16 characters)
  if (username.length < 3 || username.length > 16) {
    return {
      isValid: false,
      error: "Username must be between 3 and 16 characters long.",
      sanitizedValue
    };
  }

  // 2. Check character constraints (only English letters and numbers)
  if (!usernameFormatRegex.test(username)) {
    return {
      isValid: false,
      error: "Username can only contain letters and numbers. Spaces and symbols are not allowed.",
      sanitizedValue
    };
  }

  // 3. Validation passed
  return {
    isValid: true,
    error: null,
    sanitizedValue
  };
}
