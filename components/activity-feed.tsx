"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase/client"
import { Clock, User, ArrowRight } from "lucide-react"

interface ActivityFeedProps {
  boardId: string
}

interface Activity {
  id: string
  type: "task_created" | "task_updated" | "task_moved" | "task_assigned"
  message: string
  user_name: string | null
  user_email: string
  created_at: string
  task_title?: string
}

export default function ActivityFeed({ boardId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    // Load initial activities
    loadActivities()

    // Subscribe to real-time task changes
    const channel = supabase
      .channel(`board-activity-${boardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `board_id=eq.${boardId}`,
        },
        async (payload) => {
          await handleTaskChange(payload)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [boardId])

  const loadActivities = async () => {
    try {
      // Get recent task activities
      const { data: tasks } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          created_at,
          updated_at,
          created_by_user:users!tasks_created_by_fkey (
            full_name,
            email
          ),
          assigned_to_user:users!tasks_assigned_to_fkey (
            full_name,
            email
          )
        `)
        .eq("board_id", boardId)
        .order("updated_at", { ascending: false })
        .limit(10)

      if (tasks) {
        const activities: Activity[] = tasks.map((task) => ({
          id: `${task.id}-created`,
          type: "task_created",
          message: `created task "${task.title}"`,
          user_name: task.created_by_user?.full_name || null,
          user_email: task.created_by_user?.email || "",
          created_at: task.created_at,
          task_title: task.title,
        }))

        setActivities(activities)
      }
    } catch (error) {
      console.error("Error loading activities:", error)
    }
  }

  const handleTaskChange = async (payload: any) => {
    try {
      if (payload.eventType === "INSERT") {
        // Get user info for the new task
        const { data: user } = await supabase
          .from("users")
          .select("full_name, email")
          .eq("id", payload.new.created_by)
          .single()

        const newActivity: Activity = {
          id: `${payload.new.id}-created-${Date.now()}`,
          type: "task_created",
          message: `created task "${payload.new.title}"`,
          user_name: user?.full_name || null,
          user_email: user?.email || "",
          created_at: payload.new.created_at,
          task_title: payload.new.title,
        }

        setActivities((prev) => [newActivity, ...prev.slice(0, 9)])
      } else if (payload.eventType === "UPDATE") {
        // Determine what changed
        const old = payload.old
        const updated = payload.new

        let message = ""
        let type: Activity["type"] = "task_updated"

        if (old.column_id !== updated.column_id) {
          message = `moved task "${updated.title}"`
          type = "task_moved"
        } else if (old.assigned_to !== updated.assigned_to) {
          message = `assigned task "${updated.title}"`
          type = "task_assigned"
        } else {
          message = `updated task "${updated.title}"`
          type = "task_updated"
        }

        // Get current user info (assuming they made the change)
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()

        if (currentUser) {
          const { data: userProfile } = await supabase
            .from("users")
            .select("full_name")
            .eq("id", currentUser.id)
            .single()

          const newActivity: Activity = {
            id: `${updated.id}-${type}-${Date.now()}`,
            type,
            message,
            user_name: userProfile?.full_name || null,
            user_email: currentUser.email || "",
            created_at: updated.updated_at,
            task_title: updated.title,
          }

          setActivities((prev) => [newActivity, ...prev.slice(0, 9)])
        }
      }
    } catch (error) {
      console.error("Error handling task change:", error)
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

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "task_created":
        return <User className="h-3 w-3" />
      case "task_moved":
        return <ArrowRight className="h-3 w-3" />
      case "task_assigned":
        return <User className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const getActivityColor = (type: Activity["type"]) => {
    switch (type) {
      case "task_created":
        return "bg-green-100 text-green-800"
      case "task_moved":
        return "bg-blue-100 text-blue-800"
      case "task_assigned":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
                  <Avatar className="h-6 w-6 mt-0.5">
                    <AvatarFallback className="text-xs">
                      {getInitials(activity.user_name, activity.user_email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="secondary" className={`text-xs ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                        <span className="ml-1">{activity.type.replace("_", " ")}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(activity.created_at)}</span>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">{activity.user_name || activity.user_email}</span>{" "}
                      {activity.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
