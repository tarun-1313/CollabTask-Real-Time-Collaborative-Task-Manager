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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface CreateBoardDialogProps {
  teams: Array<{
    team_id: string
    teams: {
      id: string
      name: string
    }
  }>
}

export default function CreateBoardDialog({ teams }: CreateBoardDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    teamId: "",
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
          description: "You must be logged in to create a board.",
          variant: "destructive",
        })
        return
      }

      // Create board
      const { data: board, error: boardError } = await supabase
        .from("boards")
        .insert({
          name: formData.name,
          description: formData.description,
          team_id: formData.teamId,
          created_by: user.id,
        })
        .select()
        .single()

      if (boardError) throw boardError

      // Create default columns
      const defaultColumns = [
        { name: "To Do", position: 0, color: "#ef4444" },
        { name: "In Progress", position: 1, color: "#f59e0b" },
        { name: "Review", position: 2, color: "#3b82f6" },
        { name: "Done", position: 3, color: "#10b981" },
      ]

      const { error: columnsError } = await supabase.from("board_columns").insert(
        defaultColumns.map((col) => ({
          board_id: board.id,
          name: col.name,
          position: col.position,
          color: col.color,
        })),
      )

      if (columnsError) throw columnsError

      toast({
        title: "Success",
        description: "Board created successfully!",
      })

      setOpen(false)
      setFormData({ name: "", description: "", teamId: "" })
      router.refresh()
    } catch (error) {
      console.error("Error creating board:", error)
      toast({
        title: "Error",
        description: "Failed to create board. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (teams.length === 0) {
    return (
      <Button disabled className="bg-gray-400">
        <Plus className="h-4 w-4 mr-2" />
        Create Board
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Create Board
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <DialogDescription>Create a new Kanban board for your team to manage tasks.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="team">Team</Label>
              <Select value={formData.teamId} onValueChange={(value) => setFormData({ ...formData, teamId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.team_id} value={team.team_id}>
                      {team.teams.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Board Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter board name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this board's purpose"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.teamId}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Board"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
