"use client"

import { supabase } from "@/lib/supabase/client"

export type UserRole = "admin" | "member"
export type TeamRole = "admin" | "member"

export interface Permission {
  canCreateTeam: boolean
  canDeleteTeam: boolean
  canEditTeam: boolean
  canInviteMembers: boolean
  canRemoveMembers: boolean
  canChangeRoles: boolean
  canCreateBoard: boolean
  canDeleteBoard: boolean
  canEditBoard: boolean
  canCreateTask: boolean
  canEditTask: boolean
  canDeleteTask: boolean
  canAssignTask: boolean
  canManageColumns: boolean
}

export const getTeamPermissions = (userRole: TeamRole): Permission => {
  const basePermissions: Permission = {
    canCreateTeam: true, // All users can create teams
    canDeleteTeam: false,
    canEditTeam: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canChangeRoles: false,
    canCreateBoard: false,
    canDeleteBoard: false,
    canEditBoard: false,
    canCreateTask: true,
    canEditTask: true,
    canDeleteTask: false,
    canAssignTask: true,
    canManageColumns: false,
  }

  if (userRole === "admin") {
    return {
      ...basePermissions,
      canDeleteTeam: true,
      canEditTeam: true,
      canInviteMembers: true,
      canRemoveMembers: true,
      canChangeRoles: true,
      canCreateBoard: true,
      canDeleteBoard: true,
      canEditBoard: true,
      canDeleteTask: true,
      canManageColumns: true,
    }
  }

  return basePermissions
}

export const checkTeamPermission = async (
  teamId: string,
  userId: string,
  permission: keyof Permission,
): Promise<boolean> => {
  try {
    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .single()

    if (!membership) return false

    const permissions = getTeamPermissions(membership.role as TeamRole)
    return permissions[permission]
  } catch (error) {
    console.error("Error checking permission:", error)
    return false
  }
}

export const usePermissions = (teamRole?: TeamRole) => {
  if (!teamRole) {
    return getTeamPermissions("member") // Default to member permissions
  }
  return getTeamPermissions(teamRole)
}
