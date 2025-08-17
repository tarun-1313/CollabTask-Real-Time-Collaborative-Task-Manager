"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import TaskCard from "@/components/task-card"

interface SortableTaskCardProps {
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

export default function SortableTaskCard({ task, teamMembers }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} teamMembers={teamMembers} />
    </div>
  )
}
