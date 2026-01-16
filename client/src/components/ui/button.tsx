import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0" +
  " hover-elevate active-elevate-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary-border",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive-border",
        outline:
          // Shows the background color of whatever card / sidebar / accent background it is inside of.
          // Inherits the current text color.
          " border [border-color:var(--button-outline)]  shadow-xs active:shadow-none ",
        secondary: "border bg-secondary text-secondary-foreground border border-secondary-border ",
        // Add a transparent border so that when someone toggles a border on later, it doesn't shift layout/size.
        ghost: "border border-transparent",
        // TRAVI brand button - purple for primary CTAs (canonical from homepage)
        brand: "text-white border-2 border-[#24103E] rounded-[16px] bg-[#6443F4] hover:bg-[#5539d4] shadow-[0_4px_15px_rgba(100,67,244,0.3)]",
        // TRAVI secondary button - white with dark border
        "brand-secondary": "text-[#24103E] border-2 border-[#24103E] rounded-[16px] bg-white hover:bg-slate-50 shadow-[0_4px_15px_rgba(36,16,62,0.1)]",
        // On-image button - solid white for use over images/dark backgrounds
        "on-image": "bg-white text-[#1e1b4b] border-none rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)]",
      },
      // Heights are set as "min" heights, because sometimes Ai will place large amount of contents
      // inside buttons. With a min-height they will look appropriate with small amounts of contents,
      // but will expand to fit large amounts of contents.
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
