import { validatePasswordComplexity } from "@/lib/password-validator";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

export interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const validation = validatePasswordComplexity(password);
  
  return (
    <div className="space-y-2 mt-2 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <PasswordCriterion 
          label="At least 8 characters" 
          satisfied={validation.length} 
        />
        <PasswordCriterion 
          label="At least 1 uppercase letter" 
          satisfied={validation.uppercase} 
        />
        <PasswordCriterion 
          label="At least 1 lowercase letter" 
          satisfied={validation.lowercase} 
        />
        <PasswordCriterion 
          label="At least 1 number" 
          satisfied={validation.number} 
        />
        <div className="col-span-2">
          <PasswordCriterion 
            label="At least 1 special character" 
            satisfied={validation.special} 
          />
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="text-xs font-medium">Password strength</div>
        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500",
              getStrengthBarColor(password, validation)
            )}
            style={{ width: `${calculateStrengthPercentage(validation)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface PasswordCriterionProps {
  label: string;
  satisfied: boolean;
}

function PasswordCriterion({ label, satisfied }: PasswordCriterionProps) {
  return (
    <div className="flex items-center gap-1.5">
      {satisfied ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
      )}
      <span className={cn(
        "text-xs",
        satisfied ? "text-gray-700" : "text-gray-500"
      )}>
        {label}
      </span>
    </div>
  );
}

function calculateStrengthPercentage(validation: ReturnType<typeof validatePasswordComplexity>) {
  const { length, uppercase, lowercase, number, special } = validation;
  const criteriaCount = [length, uppercase, lowercase, number, special].filter(Boolean).length;
  return (criteriaCount / 5) * 100;
}

function getStrengthBarColor(
  password: string,
  validation: ReturnType<typeof validatePasswordComplexity>
) {
  if (!password) return "w-0";
  
  const percentage = calculateStrengthPercentage(validation);
  
  if (percentage <= 20) return "bg-red-500 w-1/5";
  if (percentage <= 40) return "bg-orange-500 w-2/5";
  if (percentage <= 60) return "bg-yellow-500 w-3/5";
  if (percentage <= 80) return "bg-blue-500 w-4/5";
  return "bg-green-500 w-full";
}