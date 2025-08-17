"use client"

import { useState, useEffect } from "react"
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, closestCorners } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import SortableTaskCard from "@/components/sortable-task-card"
import TaskCard from "@/components/task-card"

interface KanbanBoardProps {
  initialColumns: Array<{
    id: string
    name: string
    color: string
    position: number
  }>
  initialTasks: Array<{
    id: string
    title: string
    description: string | null
    priority: string
    due_date: string | null
    created_at: string
    column_id: string
    position: number
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
  }>
  teamMembers: Array<{
    users: {
      id: string
      full_name: string | null
      email: string
    }
  }>
}

export default function KanbanBoard({ initialColumns, initialTasks, teamMembers }: KanbanBoardProps) {
  const [columns, setColumns] = useState(initialColumns)
  const [tasks, setTasks] = useState(initialTasks)
  const [activeTask, setActiveTask] = useState<any>(null)
  const router = useRouter()

  // Enhanced real-time subscription for tasks
  useEffect(() => {
    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Get the full task data with user relationships
            const { data: newTask } = await supabase
              .from("tasks")
              .select(`
                *,
                assigned_to_user:users!tasks_assigned_to_fkey (
                  id,
                  full_name,
                  email
                ),
                created_by_user:users!tasks_created_by_fkey (
                  id,
                  full_name,
                  email
                )
              `)
              .eq("id", payload.new.id)
              .single()

            if (newTask) {
              setTasks((prevTasks) => [...prevTasks, newTask])

              // Show real-time notification for new tasks
              toast({
                title: "New Task Created",
                description: `"${newTask.title}" was added to the board`,
                duration: 3000,
              })
            }
          } else if (payload.eventType === "UPDATE") {
            setTasks((prevTasks) =>
              prevTasks.map((task) => (task.id === payload.new.id ? { ...task, ...payload.new } : task)),
            )
          } else if (payload.eventType === "DELETE") {
            setTasks((prevTasks) => prevTasks.filter((task) => task.id !== payload.old.id))

            toast({
              title: "Task Deleted",
              description: "A task was removed from the board",
              duration: 3000,
            })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // Find the task being moved
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    // Determine if we're dropping on a column or another task
    const overColumn = columns.find((c) => c.id === overId)
    const overTask = tasks.find((t) => t.id === overId)

    let newColumnId: string
    let newPosition: number

    if (overColumn) {
      // Dropping on a column
      newColumnId = overColumn.id
      const columnTasks = tasks.filter((t) => t.column_id === newColumnId)
      newPosition = columnTasks.length
    } else if (overTask) {
      // Dropping on another task
      newColumnId = overTask.column_id
      newPosition = overTask.position
    } else {
      return
    }

    // Don't update if nothing changed
    if (task.column_id === newColumnId && task.position === newPosition) {
      return
    }

    try {
      // Optimistically update the UI
      setTasks((prevTasks) => {
        const updatedTasks = prevTasks.map((t) => {
          if (t.id === taskId) {
            return { ...t, column_id: newColumnId, position: newPosition }
          }
          // Adjust positions of other tasks in the target column
          if (t.column_id === newColumnId && t.position >= newPosition && t.id !== taskId) {
            return { ...t, position: t.position + 1 }
          }
          return t
        })

        // Sort tasks by position within each column
        return updatedTasks.sort((a, b) => {
          if (a.column_id === b.column_id) {
            return a.position - b.position
          }
          return 0
        })
      })

      // Update the database
      const { error } = await supabase
        .from("tasks")
        .update({
          column_id: newColumnId,
          position: newPosition,
          status:
            newColumnId === columns.find((c) => c.name === "Done")?.id
              ? "done"
              : newColumnId === columns.find((c) => c.name === "In Progress")?.id
                ? "in_progress"
                : "todo",
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId)

      if (error) throw error

      // Reorder other tasks in the column
      const columnTasks = tasks.filter((t) => t.column_id === newColumnId && t.id !== taskId)
      for (let i = 0; i < columnTasks.length; i++) {
        const adjustedPosition = i >= newPosition ? i + 1 : i
        if (columnTasks[i].position !== adjustedPosition) {
          await supabase.from("tasks").update({ position: adjustedPosition }).eq("id", columnTasks[i].id)
        }
      }

      // Show success notification
      toast({
        title: "Task Moved",
        description: `"${task.title}" moved to ${columns.find((c) => c.id === newColumnId)?.name}`,
        duration: 2000,
      })
    } catch (error) {
      console.error("Error moving task:", error)
      toast({
        title: "Error",
        description: "Failed to move task. Please try again.",
        variant: "destructive",
      })
      // Revert the optimistic update
      setTasks(initialTasks)
    }
  }

  return (
    <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.column_id === column.id)

          return (
            <Card key={column.id} className="h-fit min-h-[400px] transition-all duration-200 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: column.color }} />
                    {column.name}
                  </CardTitle>
                  <Badge variant="secondary" className="animate-pulse">
                    {columnTasks.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <SortableContext items={columnTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
                  {columnTasks
                    .sort((a, b) => a.position - b.position)
                    .map((task) => (
                      <SortableTaskCard key={task.id} task={task} teamMembers={teamMembers} />
                    ))}
                </SortableContext>
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-gray-200 rounded-lg transition-colors hover:border-gray-300">
                    <p className="text-sm">Drop tasks here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 scale-105">
            <TaskCard task={activeTask} teamMembers={teamMembers} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
