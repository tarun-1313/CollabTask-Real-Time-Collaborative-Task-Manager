"use client"

import type { ReactNode } from "react"
import { usePermissions, type TeamRole, type Permission } from "@/lib/permissions"

interface ProtectedActionProps {
  children: ReactNode
  userRole: TeamRole
  requiredPermission: keyof Permission
  fallback?: ReactNode
}

export default function ProtectedAction({
  children,
  userRole,
  requiredPermission,
  fallback = null,
}: ProtectedActionProps) {
  const permissions = usePermissions(userRole)

  if (!permissions[requiredPermission]) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
