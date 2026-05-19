import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        "h-14 w-full rounded-[12px] border border-white/12 bg-[#06162E] px-4 text-[15px] font-normal text-white outline-none transition duration-200 placeholder:text-[#8CA3C7] focus:border-[#00E7B0]/70 focus:shadow-[0_0_0_4px_rgba(0,231,176,.14),0_0_34px_rgba(0,231,176,.16)]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Input.displayName = "Input";
