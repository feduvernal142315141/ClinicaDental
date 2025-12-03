/**
 * UI Components - Screaming Architecture
 *
 * Exports organizados por PROPÓSITO, no por tipo técnico.
 * La estructura "grita" qué hace cada componente.
 */

// ============================================
// ATOMIC - LAYOUT
// ============================================
/**
 * Componentes para ORGANIZAR EL ESPACIO
 * Responsabilidad: Estructurar el layout de páginas y secciones
 */
export { PageHeader } from "./atomic/layout/page-header";
export { SectionHeader } from "./atomic/layout/section-header";
export type { PageHeaderProps } from "./atomic/layout/page-header";
export type { SectionHeaderProps } from "./atomic/layout/section-header";

// ============================================
// ATOMIC - FEEDBACK
// ============================================
/**
 * Componentes para DAR RETROALIMENTACIÓN
 * Responsabilidad: Comunicar estados y resultados al usuario
 */
export { LoadingSpinner } from "./atomic/feedback/loading-spinner";
export { EmptyState } from "./atomic/feedback/empty-state";
export { Alert, AlertDescription, AlertTitle } from "./atomic/feedback/alert";
export { Toaster } from "./atomic/feedback/toaster";
export {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastAction,
  ToastClose,
  ToastTitle,
  ToastDescription,
  type ToastProps,
  type ToastActionElement,
} from "./atomic/feedback/toast";
export type { LoadingSpinnerProps } from "./atomic/feedback/loading-spinner";
export type { EmptyStateProps } from "./atomic/feedback/empty-state";

export { Badge, badgeVariants } from "./atomic/data-display/badge";
export {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "./atomic/data-display/avatar";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./atomic/data-display/card";
export { Skeleton } from "./atomic/data-display/skeleton";
export { Progress } from "./atomic/data-display/progress";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./atomic/data-display/table";

export { Input } from "./atomic/forms/input";
export { default as Textarea } from "./atomic/forms/textarea";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "./atomic/forms/select";
export { Checkbox } from "./atomic/forms/checkbox";
export { RadioGroup, RadioGroupItem } from "./atomic/forms/radio-group";
export { Switch } from "./atomic/forms/switch";
export { Slider } from "./atomic/forms/slider";
export { Label } from "./atomic/forms/label";
export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from "./atomic/forms/form";
export {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "./atomic/forms/input-otp";

export { Button, buttonVariants } from "./primitives/shadcn/button";
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./primitives/shadcn/dialog";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from "./primitives/shadcn/dropdown-menu";
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "./primitives/shadcn/tabs";
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from "./primitives/shadcn/popover";
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "./primitives/shadcn/command";
export { Calendar } from "./primitives/shadcn/calendar";
export { Separator } from "./primitives/shadcn/separator";
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./primitives/shadcn/sheet";
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./primitives/shadcn/tooltip";
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./primitives/shadcn/accordion";
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./primitives/shadcn/alert-dialog";
export { AspectRatio } from "./primitives/shadcn/aspect-ratio";
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "./primitives/shadcn/breadcrumb";
export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "./primitives/shadcn/carousel";
export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "./primitives/shadcn/collapsible";
export { Combobox } from "./primitives/shadcn/combobox";
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
} from "./primitives/shadcn/context-menu";
export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "./primitives/shadcn/drawer";
export {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "./primitives/shadcn/hover-card";
export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
} from "./primitives/shadcn/menubar";
export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from "./primitives/shadcn/navigation-menu";
export {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "./primitives/shadcn/resizable";
export { ScrollArea, ScrollBar } from "./primitives/shadcn/scroll-area";
export { Toggle, toggleVariants } from "./primitives/shadcn/toggle";
export { ToggleGroup, ToggleGroupItem } from "./primitives/shadcn/toggle-group";

export { Modal } from "./primitives/custom/Modal";
export { TextField } from "./primitives/custom/TextField";
export { FormSelect } from "./primitives/custom/FormSelect";
export { DatePickerField } from "./primitives/custom/DatePickerField";

export { CustomTable } from "./composed/table/Table";
export { Pagination } from "./composed/pagination/Pagination";
export { FileUpload } from "./composed/fileUpload/FileUpload";
export { FileUploadField } from "./composed/fileUpload/FileUploadField";

export { useIsMobile } from "./hooks/use-mobile";
export { useToast, toast } from "./hooks/use-toast";
