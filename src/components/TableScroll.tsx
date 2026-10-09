import clsx from "clsx";

/**
 * Horizontal scroller for the console tables.
 *
 * A data table with eight columns cannot shrink to 360px and stay readable, so
 * on phones it scrolls sideways instead. The scrollbar is hidden (it covers the
 * last row on Android) and a fade on the right edge shows there is more to see.
 */
export function TableScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("relative", className)}>
      <div className="overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent lg:hidden"
      />
    </div>
  );
}
