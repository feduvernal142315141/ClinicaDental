import { Search } from "lucide-react";
import { Input } from "@/components/ui/atomic/forms/input";
import { cn } from "@/lib/utils/utils";
import { forwardRef } from "react";

interface SearchInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type"> {
  iconPosition?: "left" | "right";
  containerClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ iconPosition = "left", containerClassName, className, ...props }, ref) => {
    return (
      <div className={cn("relative", containerClassName)}>
        {iconPosition === "left" && (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
        <Input
          ref={ref}
          type="text"
          className={cn(
            iconPosition === "left" && "pl-9",
            iconPosition === "right" && "pr-9",
            className
          )}
          {...props}
        />
        {iconPosition === "right" && (
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
