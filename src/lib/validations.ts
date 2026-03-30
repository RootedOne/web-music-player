export function validateUsername(username: string): boolean {
  // Only standard English alphabet letters (a-z, A-Z) and numbers (0-9).
  // No spaces, no special characters.
  // Must be between 3 and 16 characters long.
  const usernameRegex = /^[a-zA-Z0-9]{3,16}$/;
  return usernameRegex.test(username);
}
