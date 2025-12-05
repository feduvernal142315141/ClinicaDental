import dynamic from "next/dynamic";
import { LazyLoadingFallback } from "@/components/ui/atomic/feedback/lazy-loading-fallback";

export const GeneralSettings = dynamic(
  () => import("./general-settings").then((mod) => mod.GeneralSettings),
  { loading: () => <LazyLoadingFallback /> }
);

export const NotificationsSettings = dynamic(
  () =>
    import("./notifications-settings").then((mod) => mod.NotificationsSettings),
  { loading: () => <LazyLoadingFallback /> }
);

export const IntegrationsSettings = dynamic(
  () =>
    import("./integrations-settings").then((mod) => mod.IntegrationsSettings),
  { loading: () => <LazyLoadingFallback /> }
);

export const DoctorsRolesSettings = dynamic(
  () => import("../doctors/DoctorsRolesSettings"),
  { loading: () => <LazyLoadingFallback /> }
);

export const PatientsPageClient = dynamic(
  () =>
    import("../patients/patients-page-client").then(
      (mod) => mod.PatientsPageClient
    ),
  { loading: () => <LazyLoadingFallback /> }
);
