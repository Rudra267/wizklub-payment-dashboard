import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn(
      "rounded-[24px] border border-[rgba(0,255,220,.10)] bg-[rgba(6,18,38,.85)] shadow-[0_20px_60px_rgba(0,0,0,.4)] backdrop-blur-xl",
      className
    )}
    ref={ref}
    {...props}
  />
));

Card.displayName = "Card";
