import * as React from "react";

const WIDE_DESKTOP_BREAKPOINT = 1536;

export function useIsWideDesktop() {
  const [isWide, setIsWide] = React.useState<boolean | undefined>(undefined);
  React.useEffect(() => {
    const mql = window.matchMedia(
      `(min-width: ${WIDE_DESKTOP_BREAKPOINT}px)`,
    );
    const onChange = () => setIsWide(window.innerWidth >= WIDE_DESKTOP_BREAKPOINT);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return !!isWide;
}
