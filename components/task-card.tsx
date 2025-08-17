"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, User, MoreHorizontal, GripVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState } from "react"
import EditTaskDialog from "@/components/edit-task-dialog"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface TaskCardProps {
  task: {
    id: string
    title: string
    description: string | null
    priority: string
    due_date: string | null
    created_at: string
    assigned_to_user: {
      id: string
      full_name: string | null
      email: string
    } | null
    created_by_user: {
      id: string
      full_name: string | null
      email: string
    }
  }
  teamMembers: Array<{
    users: {
      id: string
      full_name: string | null
      email: string
    }
  }>
}

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
}

export default function TaskCard({ task, teamMembers }: TaskCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Task deleted successfully!",
      })

      router.refresh()
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
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
    <>
      <Card className="cursor-grab hover:shadow-md transition-all duration-200 active:cursor-grabbing active:rotate-3 active:scale-105">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2 flex-1">
              <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <h3 className="font-semibold text-sm leading-tight flex-1">{task.title}</h3>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit Task</DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {task.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>}

          <div className="flex items-center justify-between mb-3">
            <Badge
              variant="secondary"
              className={`text-xs ${priorityColors[task.priority as keyof typeof priorityColors]}`}
            >
              {task.priority}
            </Badge>

            {task.due_date && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(task.due_date)}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            {task.assigned_to_user ? (
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getInitials(task.assigned_to_user.full_name, task.assigned_to_user.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">
                  {task.assigned_to_user.full_name || task.assigned_to_user.email}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <User className="h-3 w-3" />
                <span className="text-xs">Unassigned</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <EditTaskDialog open={editOpen} onOpenChange={setEditOpen} task={task} teamMembers={teamMembers} />
    </>
  )
}
