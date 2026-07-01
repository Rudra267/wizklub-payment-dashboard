import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-[54px] items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-semibold shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(0,231,176,.22)] disabled:pointer-events-none disabled:opacity-60",
  {
    defaultVariants: {
      size: "default",
      variant: "default"
    },
    variants: {
      size: {
        default: "h-[54px]",
        sm: "h-11 rounded-[12px] px-4",
        icon: "h-[54px] w-[54px] px-0"
      },
      variant: {
        default:
          "bg-gradient-to-r from-[#00E7B0] to-[#008E78] text-white shadow-[0_0_40px_rgba(0,231,176,.22)] hover:shadow-[0_0_48px_rgba(0,231,176,.34)]",
        blue:
          "bg-gradient-to-r from-[#4D6FFF] to-[#252ACB] text-white shadow-[0_0_40px_rgba(77,111,255,.24)] hover:shadow-[0_0_48px_rgba(77,111,255,.34)]",
        ghost:
          "border border-white/10 bg-[#061226]/70 text-white hover:border-[#00E7B0]/30 hover:bg-[#0A1B35]",
        sidebar:
          "justify-start rounded-[14px] bg-transparent px-4 text-white/84 shadow-none hover:bg-[#00E7B0]/10 hover:text-white"
      }
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size, variant, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ className, size, variant }))}
      ref={ref}
      {...props}
    />
  )
);

Button.displayName = "Button";
