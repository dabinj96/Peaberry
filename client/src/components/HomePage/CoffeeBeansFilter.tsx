import { Checkbox } from "@/components/ui/checkbox";

interface CoffeeBeansFilterProps {
  sellsCoffeeBeans: boolean | null;
  onSellsCoffeeBeansChange: (sellsCoffeeBeans: boolean | null) => void;
}

export function CoffeeBeansFilter({ sellsCoffeeBeans, onSellsCoffeeBeansChange }: CoffeeBeansFilterProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-gray-900">Coffee Features</h3>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="sells-coffee-beans"
            checked={sellsCoffeeBeans === true}
            onCheckedChange={(checked) => onSellsCoffeeBeansChange(checked ? true : null)}
          />
          <label
            htmlFor="sells-coffee-beans"
            className="text-sm font-normal cursor-pointer"
          >
            Sells coffee beans
          </label>
        </div>
      </div>
    </div>
  );
}