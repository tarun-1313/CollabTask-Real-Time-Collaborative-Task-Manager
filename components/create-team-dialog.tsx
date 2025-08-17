"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import { Plus, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export default function CreateTeamDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a team.",
          variant: "destructive",
        })
        return
      }

      const { data: existingUser } = await supabase.from("users").select("id").eq("id", user.id).single()

      if (!existingUser) {
        // Create user record if it doesn't exist
        const { error: userError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
        })

        if (userError) {
          console.error("Error creating user:", userError)
          toast({
            title: "Error",
            description: "Failed to create user profile. Please try again.",
            variant: "destructive",
          })
          return
        }
      }

      // Create team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: formData.name,
          description: formData.description,
          created_by: user.id,
        })
        .select()
        .single()

      if (teamError) throw teamError

      // Add creator as admin member
      const { error: memberError } = await supabase.from("team_members").insert({
        team_id: team.id,
        user_id: user.id,
        role: "admin",
      })

      if (memberError) throw memberError

      toast({
        title: "Success",
        description: "Team created successfully!",
      })

      setOpen(false)
      setFormData({ name: "", description: "" })
      router.refresh()
    } catch (error) {
      console.error("Error creating team:", error)
      toast({
        title: "Error",
        description: "Failed to create team. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>Create a new team to collaborate with others on projects.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Team"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
