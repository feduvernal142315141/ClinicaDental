import { SearchInput } from "@/components/ui/atomic/forms/search-input";

interface SidebarSearchProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function SidebarSearch({
  placeholder = "Buscar...",
  value,
  onChange,
}: SidebarSearchProps) {
  return (
    <div className="px-4 py-3 mb-2">
      <SearchInput
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="border-color-base-300 rounded-2xl"
      />
    </div>
  );
}
