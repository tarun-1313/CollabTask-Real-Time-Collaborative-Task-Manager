"use client"

import { useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"

interface RealTimeNotificationsProps {
  userId: string
  boardId?: string
}

export default function RealTimeNotifications({ userId, boardId }: RealTimeNotificationsProps) {
  useEffect(() => {
    // Subscribe to notifications for this user
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as any

          // Show toast notification
          toast({
            title: notification.title,
            description: notification.message,
            duration: 5000,
          })
        },
      )
      .subscribe()

    // Subscribe to task assignments if on a board
    if (boardId) {
      const taskChannel = supabase
        .channel(`task-assignments-${boardId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "tasks",
            filter: `board_id=eq.${boardId}`,
          },
          async (payload) => {
            const oldTask = payload.old as any
            const newTask = payload.new as any

            // Check if task was assigned to current user
            if (oldTask.assigned_to !== newTask.assigned_to && newTask.assigned_to === userId) {
              // Get task details
              const { data: task } = await supabase
                .from("tasks")
                .select(`
                  title,
                  created_by_user:users!tasks_created_by_fkey (
                    full_name,
                    email
                  )
                `)
                .eq("id", newTask.id)
                .single()

              if (task) {
                // Create notification in database
                await supabase.from("notifications").insert({
                  user_id: userId,
                  title: "Task Assigned",
                  message: `You've been assigned to "${task.title}" by ${task.created_by_user?.full_name || task.created_by_user?.email}`,
                  type: "info",
                  related_task_id: newTask.id,
                })
              }
            }
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
        supabase.removeChannel(taskChannel)
      }
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, boardId])

  return null // This component doesn't render anything visible
}
