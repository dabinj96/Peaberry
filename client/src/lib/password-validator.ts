export interface PasswordValidationResult {
  valid: boolean;
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

/**
 * Validates the complexity of a password
 * @param password The password to validate
 * @returns Object with validation results
 */
export function validatePasswordComplexity(password: string): PasswordValidationResult {
  // Initialize result with all validations set to false
  const result: PasswordValidationResult = {
    valid: false,
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  };
  
  // No validation for empty passwords
  if (!password) {
    return result;
  }
  
  // Length check: at least 8 characters
  result.length = password.length >= 8;
  
  // Uppercase letter check: at least one uppercase letter (A-Z)
  result.uppercase = /[A-Z]/.test(password);
  
  // Lowercase letter check: at least one lowercase letter (a-z)
  result.lowercase = /[a-z]/.test(password);
  
  // Number check: at least one number (0-9)
  result.number = /[0-9]/.test(password);
  
  // Special character check: at least one special character
  result.special = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  // Overall validity: all checks must pass
  result.valid = result.length && result.uppercase && result.lowercase && result.number && result.special;
  
  return result;
}