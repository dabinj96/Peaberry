import { Checkbox } from "@/components/ui/checkbox";

const brewingMethods = [
  { value: "espresso_based", label: "Espresso Based" },
  { value: "pour_over", label: "Pour Over" },
  { value: "siphon", label: "Siphon" },
  { value: "mixed_drinks", label: "Mixed Drinks" },
  { value: "nitro", label: "Nitro" },
  { value: "cold_brew", label: "Cold Brew" }
] as const;

interface BrewingMethodsFilterProps {
  selectedBrewingMethods: string[];
  onBrewingMethodsChange: (brewingMethods: string[]) => void;
}

export function BrewingMethodsFilter({ selectedBrewingMethods, onBrewingMethodsChange }: BrewingMethodsFilterProps) {
  const handleBrewingMethodToggle = (brewingMethod: string) => {
    const newBrewingMethods = selectedBrewingMethods.includes(brewingMethod)
      ? selectedBrewingMethods.filter(b => b !== brewingMethod)
      : [...selectedBrewingMethods, brewingMethod];
    onBrewingMethodsChange(newBrewingMethods);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-gray-900">Brewing Methods</h3>
      <div className="space-y-2">
        {brewingMethods.map((brewingMethod) => (
          <div key={brewingMethod.value} className="flex items-center space-x-2">
            <Checkbox
              id={brewingMethod.value}
              checked={selectedBrewingMethods.includes(brewingMethod.value)}
              onCheckedChange={() => handleBrewingMethodToggle(brewingMethod.value)}
            />
            <label
              htmlFor={brewingMethod.value}
              className="text-sm font-normal cursor-pointer"
            >
              {brewingMethod.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}