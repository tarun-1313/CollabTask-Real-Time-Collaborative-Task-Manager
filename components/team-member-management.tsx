"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { UserPlus, MoreHorizontal, Shield, User, Trash2, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { usePermissions, type TeamRole } from "@/lib/permissions"

interface TeamMemberManagementProps {
  teamId: string
  currentUserRole: TeamRole
  members: Array<{
    role: string
    joined_at: string
    users: {
      id: string
      email: string
      full_name: string | null
    }
  }>
  currentUserId: string
}

export default function TeamMemberManagement({
  teamId,
  currentUserRole,
  members,
  currentUserId,
}: TeamMemberManagementProps) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<TeamRole>("member")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const permissions = usePermissions(currentUserRole)

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || loading) return

    setLoading(true)

    try {
      // Check if user exists
      const { data: existingUser } = await supabase.from("users").select("id").eq("email", inviteEmail).single()

      if (!existingUser) {
        toast({
          title: "User not found",
          description: "The user must sign up first before being invited to a team.",
          variant: "destructive",
        })
        return
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", teamId)
        .eq("user_id", existingUser.id)
        .single()

      if (existingMember) {
        toast({
          title: "Already a member",
          description: "This user is already a member of the team.",
          variant: "destructive",
        })
        return
      }

      // Add user to team
      const { error } = await supabase.from("team_members").insert({
        team_id: teamId,
        user_id: existingUser.id,
        role: inviteRole,
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Team member invited successfully!",
      })

      setInviteOpen(false)
      setInviteEmail("")
      setInviteRole("member")
      router.refresh()
    } catch (error) {
      console.error("Error inviting member:", error)
      toast({
        title: "Error",
        description: "Failed to invite team member. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChangeRole = async (userId: string, newRole: TeamRole) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ role: newRole })
        .eq("team_id", teamId)
        .eq("user_id", userId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Member role updated successfully!",
      })

      router.refresh()
    } catch (error) {
      console.error("Error changing role:", error)
      toast({
        title: "Error",
        description: "Failed to change member role. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from the team?`)) return

    try {
      const { error } = await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Team member removed successfully!",
      })

      router.refresh()
    } catch (error) {
      console.error("Error removing member:", error)
      toast({
        title: "Error",
        description: "Failed to remove team member. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <p className="text-sm text-muted-foreground">{members.length} members</p>
          </div>
          {permissions.canInviteMembers && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleInviteMember}>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>Invite a user to join this team by their email address.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={inviteRole} onValueChange={(value: TeamRole) => setInviteRole(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Inviting...
                        </>
                      ) : (
                        "Send Invite"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.map((member) => {
            const isCurrentUser = member.users.id === currentUserId
            const canModify = permissions.canChangeRoles || permissions.canRemoveMembers

            return (
              <div key={member.users.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(member.users.full_name, member.users.email)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {member.users.full_name || member.users.email}
                      {isCurrentUser && " (you)"}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.users.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={member.role === "admin" ? "default" : "secondary"}
                    className="flex items-center gap-1"
                  >
                    {member.role === "admin" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {member.role}
                  </Badge>
                  {canModify && !isCurrentUser && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {permissions.canChangeRoles && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleChangeRole(member.users.id, "admin")}
                              disabled={member.role === "admin"}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleChangeRole(member.users.id, "member")}
                              disabled={member.role === "member"}
                            >
                              <User className="h-4 w-4 mr-2" />
                              Make Member
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {permissions.canRemoveMembers && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleRemoveMember(member.users.id, member.users.full_name || member.users.email)
                            }
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove from Team
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
