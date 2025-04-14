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
  const validations = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
  
  // Password is valid if it meets at least 3 of the criteria and length is valid
  const criteriaCount = Object.values(validations).filter(Boolean).length;
  const valid = validations.length && criteriaCount >= 3;
  
  return {
    valid,
    ...validations
  };
}