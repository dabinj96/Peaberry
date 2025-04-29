/**
 * Handles server-side password reset functionality
 * This is separate from Firebase-based password reset to provide a self-contained flow
 */

/**
 * Request a password reset using the server-side flow
 * @param email User's email address
 * @returns Object containing success status and any error message
 */
export const requestPasswordReset = async (email: string): Promise<{ 
  success: boolean; 
  message?: string;
  error?: string;
}> => {
  try {
    const response = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    
    if (response.status === 429) {
      // Rate limiting error
      return {
        success: false,
        error: "Too many attempts. Please wait before trying again."
      };
    }
    
    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'An error occurred while requesting password reset.'
      };
    }

    return {
      success: true,
      message: data.message || 'If an account with that email exists, a password reset link has been sent.'
    };
  } catch (error: any) {
    console.error('Error requesting password reset:', error);
    return {
      success: false,
      error: error.message || 'Network error. Please try again.'
    };
  }
};

/**
 * Verify a password reset token
 * @param token The reset token
 * @returns Object containing success status, user info, and any error message
 */
export const verifyResetToken = async (token: string): Promise<{
  success: boolean;
  username?: string;
  email?: string;
  error?: string;
}> => {
  try {
    const response = await fetch('/api/verify-reset-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Invalid or expired token'
      };
    }

    return {
      success: true,
      username: data.username,
      email: data.email
    };
  } catch (error: any) {
    console.error('Error verifying reset token:', error);
    return {
      success: false,
      error: error.message || 'Network error. Please try again.'
    };
  }
};

/**
 * Reset a password using a token
 * @param token Reset token
 * @param newPassword New password
 * @returns Object containing success status and any error message
 */
export const resetPassword = async (token: string, newPassword: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> => {
  try {
    const response = await fetch('/api/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, newPassword }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to reset password'
      };
    }

    return {
      success: true,
      message: data.message || 'Your password has been reset successfully'
    };
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return {
      success: false,
      error: error.message || 'Network error. Please try again.'
    };
  }
};