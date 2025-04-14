import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Password strength levels
enum PasswordStrength {
  EMPTY = 0,
  WEAK = 1,
  FAIR = 2,
  GOOD = 3,
  STRONG = 4
}

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const [strength, setStrength] = useState<PasswordStrength>(PasswordStrength.EMPTY);
  const [feedback, setFeedback] = useState<string>("");

  useEffect(() => {
    if (!password) {
      setStrength(PasswordStrength.EMPTY);
      setFeedback("");
      return;
    }

    // Check password strength
    let currentStrength = PasswordStrength.WEAK;
    const currentFeedback = [];

    // Length check
    if (password.length < 8) {
      currentFeedback.push("Use at least 8 characters");
    } else {
      currentStrength++;
    }

    // Character variety check
    let varietyScore = 0;
    if (/[A-Z]/.test(password)) varietyScore++;
    if (/[a-z]/.test(password)) varietyScore++;
    if (/[0-9]/.test(password)) varietyScore++;
    if (/[^A-Za-z0-9]/.test(password)) varietyScore++;

    if (varietyScore < 2) {
      currentFeedback.push("Add different character types");
    } else {
      currentStrength += Math.min(varietyScore - 1, 2); // Max 2 points for variety
    }

    // Common password check (simplified example)
    const commonPasswords = ["password", "123456", "qwerty", "welcome", "admin"];
    if (commonPasswords.includes(password.toLowerCase())) {
      currentStrength = PasswordStrength.WEAK;
      currentFeedback.push("This password is too common");
    }

    setStrength(currentStrength);
    setFeedback(currentFeedback.join(". "));
  }, [password]);

  // Get color class based on strength
  const getColorClass = () => {
    switch (strength) {
      case PasswordStrength.EMPTY:
        return "bg-gray-300";
      case PasswordStrength.WEAK:
        return "bg-red-500";
      case PasswordStrength.FAIR:
        return "bg-orange-500";
      case PasswordStrength.GOOD:
        return "bg-yellow-500";
      case PasswordStrength.STRONG:
        return "bg-green-500";
      default:
        return "bg-gray-300";
    }
  };

  // Get label based on strength
  const getLabel = () => {
    switch (strength) {
      case PasswordStrength.EMPTY:
        return "";
      case PasswordStrength.WEAK:
        return "Weak";
      case PasswordStrength.FAIR:
        return "Fair";
      case PasswordStrength.GOOD:
        return "Good";
      case PasswordStrength.STRONG:
        return "Strong";
      default:
        return "";
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    return (strength / PasswordStrength.STRONG) * 100;
  };

  // Don't show anything for empty password
  if (strength === PasswordStrength.EMPTY) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium">{getLabel()}</span>
        {feedback && <span className="text-xs text-gray-600">{feedback}</span>}
      </div>
      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all", getColorClass())} 
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>
    </div>
  );
}