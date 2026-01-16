"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * AdminModalSurface - A shared primitive for admin modal contents.
 * TRANSPARENCY BAN: All admin surfaces must be fully opaque.
 * This component ensures modal backgrounds are always solid.
 */
const AdminModalSurface = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-background border rounded-lg shadow-lg p-6",
      className
    )}
    style={{ opacity: 1 }}
    {...props}
  />
))
AdminModalSurface.displayName = "AdminModalSurface"

/**
 * AdminDialogOverlay - A fully opaque overlay for admin dialogs.
 * TRANSPARENCY BAN: No alpha, no blur, no transparency allowed.
 */
const AdminDialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black",
      className
    )}
    style={{ opacity: 1, backdropFilter: "none" }}
    {...props}
  />
))
AdminDialogOverlay.displayName = "AdminDialogOverlay"

/**
 * AdminCard - A solid card surface for admin panels.
 * TRANSPARENCY BAN: Must use solid bg-muted, not bg-muted/30.
 */
const AdminCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-muted border rounded-lg p-4",
      className
    )}
    style={{ opacity: 1 }}
    {...props}
  />
))
AdminCard.displayName = "AdminCard"

export { AdminModalSurface, AdminDialogOverlay, AdminCard }
