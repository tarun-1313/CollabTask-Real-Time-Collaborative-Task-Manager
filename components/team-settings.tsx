"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Loader2, Save, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface TeamSettingsProps {
  team: {
    id: string
    name: string
    description: string | null
    created_at: string
  }
}

export default function TeamSettings({ team }: TeamSettingsProps) {
  const [formData, setFormData] = useState({
    name: team.name,
    description: team.description || "",
  })
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const router = useRouter()

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from("teams")
        .update({
          name: formData.name,
          description: formData.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", team.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Team settings updated successfully!",
      })

      router.refresh()
    } catch (error) {
      console.error("Error updating team:", error)
      toast({
        title: "Error",
        description: "Failed to update team settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTeam = async () => {
    if (deleteConfirm !== team.name) {
      toast({
        title: "Error",
        description: "Please type the team name exactly to confirm deletion.",
        variant: "destructive",
      })
      return
    }

    setDeleteLoading(true)

    try {
      // Delete team (cascade will handle related records)
      const { error } = await supabase.from("teams").delete().eq("id", team.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Team deleted successfully.",
      })

      router.push("/dashboard")
    } catch (error) {
      console.error("Error deleting team:", error)
      toast({
        title: "Error",
        description: "Failed to delete team. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Update your team's basic information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateTeam} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter team name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your team's purpose"
                rows={3}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Team Information */}
      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
          <CardDescription>Read-only information about your team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Team ID</Label>
            <Input value={team.id} readOnly className="bg-muted" />
          </div>
          <div className="grid gap-2">
            <Label>Created</Label>
            <Input value={new Date(team.created_at).toLocaleString()} readOnly className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible and destructive actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-red-600 mb-2">Delete Team</h4>
              <p className="text-sm text-muted-foreground mb-4">
                This will permanently delete the team, all boards, tasks, and chat messages. This action cannot be
                undone.
              </p>
              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="deleteConfirm">
                    Type <strong>{team.name}</strong> to confirm deletion:
                  </Label>
                  <Input
                    id="deleteConfirm"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={team.name}
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteTeam}
                  disabled={deleteLoading || deleteConfirm !== team.name}
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Team Permanently
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
