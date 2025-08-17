import { createClient } from "@/lib/supabase/server"

export type NotificationType =
  | "task_assigned"
  | "task_completed"
  | "task_updated"
  | "team_invite"
  | "comment_added"
  | "board_shared"
  | "member_joined"
  | "member_left"

export interface CreateNotificationData {
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: any
}

export async function createNotification({ userId, type, title, message, data }: CreateNotificationData) {
  const supabase = createClient()

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    data,
    read: false,
  })

  if (error) {
    console.error("Error creating notification:", error)
    return false
  }

  return true
}

export async function createBulkNotifications(notifications: CreateNotificationData[]) {
  const supabase = createClient()

  const { error } = await supabase.from("notifications").insert(
    notifications.map((notification) => ({
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      read: false,
    })),
  )

  if (error) {
    console.error("Error creating bulk notifications:", error)
    return false
  }

  return true
}

// Helper functions for common notification scenarios
export async function notifyTaskAssigned(
  assigneeId: string,
  taskTitle: string,
  assignerName: string,
  boardName: string,
) {
  return createNotification({
    userId: assigneeId,
    type: "task_assigned",
    title: "New Task Assigned",
    message: `${assignerName} assigned you "${taskTitle}" in ${boardName}`,
    data: { taskTitle, assignerName, boardName },
  })
}

export async function notifyTaskCompleted(
  teamMemberIds: string[],
  taskTitle: string,
  completedBy: string,
  boardName: string,
) {
  const notifications = teamMemberIds.map((userId) => ({
    userId,
    type: "task_completed" as NotificationType,
    title: "Task Completed",
    message: `${completedBy} completed "${taskTitle}" in ${boardName}`,
    data: { taskTitle, completedBy, boardName },
  }))

  return createBulkNotifications(notifications)
}

export async function notifyTeamInvite(userId: string, teamName: string, inviterName: string) {
  return createNotification({
    userId,
    type: "team_invite",
    title: "Team Invitation",
    message: `${inviterName} invited you to join "${teamName}"`,
    data: { teamName, inviterName },
  })
}

export async function notifyCommentAdded(
  taskAssigneeId: string,
  taskTitle: string,
  commenterName: string,
  commentPreview: string,
) {
  return createNotification({
    userId: taskAssigneeId,
    type: "comment_added",
    title: "New Comment",
    message: `${commenterName} commented on "${taskTitle}": ${commentPreview.slice(0, 50)}...`,
    data: { taskTitle, commenterName, commentPreview },
  })
}

export async function notifyTaskDueSoon(
  assigneeId: string,
  taskTitle: string,
  dueDate: string,
  boardName: string,
  daysUntilDue: number,
) {
  const message =
    daysUntilDue === 0
      ? `"${taskTitle}" is due today in ${boardName}`
      : daysUntilDue === 1
        ? `"${taskTitle}" is due tomorrow in ${boardName}`
        : `"${taskTitle}" is due in ${daysUntilDue} days in ${boardName}`

  return createNotification({
    userId: assigneeId,
    type: "task_updated",
    title: daysUntilDue === 0 ? "Task Due Today" : "Task Due Soon",
    message,
    data: { taskTitle, dueDate, boardName, daysUntilDue },
  })
}

export async function notifyTaskOverdue(
  assigneeId: string,
  taskTitle: string,
  dueDate: string,
  boardName: string,
  daysOverdue: number,
) {
  return createNotification({
    userId: assigneeId,
    type: "task_updated",
    title: "Task Overdue",
    message: `"${taskTitle}" is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue in ${boardName}`,
    data: { taskTitle, dueDate, boardName, daysOverdue },
  })
}

export async function checkAndNotifyDeadlines() {
  const supabase = createClient()

  // Get all tasks with due dates and assigned users
  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      id,
      title,
      due_date,
      assigned_to,
      boards!inner(name),
      assigned_to_user:users!tasks_assigned_to_fkey(id, full_name, email)
    `)
    .not("due_date", "is", null)
    .not("assigned_to", "is", null)
    .eq("status", "todo")

  if (!tasks) return

  const now = new Date()
  const notifications: CreateNotificationData[] = []

  for (const task of tasks) {
    if (!task.assigned_to || !task.due_date) continue

    const dueDate = new Date(task.due_date)
    const timeDiff = dueDate.getTime() - now.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))

    // Check if we should send a notification
    if (daysDiff === 0) {
      // Due today
      notifications.push({
        userId: task.assigned_to,
        type: "task_updated",
        title: "Task Due Today",
        message: `"${task.title}" is due today in ${task.boards.name}`,
        data: { taskId: task.id, taskTitle: task.title, boardName: task.boards.name },
      })
    } else if (daysDiff === 1) {
      // Due tomorrow
      notifications.push({
        userId: task.assigned_to,
        type: "task_updated",
        title: "Task Due Tomorrow",
        message: `"${task.title}" is due tomorrow in ${task.boards.name}`,
        data: { taskId: task.id, taskTitle: task.title, boardName: task.boards.name },
      })
    } else if (daysDiff === 7) {
      // Due in a week
      notifications.push({
        userId: task.assigned_to,
        type: "task_updated",
        title: "Task Due Next Week",
        message: `"${task.title}" is due in 7 days in ${task.boards.name}`,
        data: { taskId: task.id, taskTitle: task.title, boardName: task.boards.name },
      })
    } else if (daysDiff < 0) {
      // Overdue
      const daysOverdue = Math.abs(daysDiff)
      notifications.push({
        userId: task.assigned_to,
        type: "task_updated",
        title: "Task Overdue",
        message: `"${task.title}" is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue in ${task.boards.name}`,
        data: { taskId: task.id, taskTitle: task.title, boardName: task.boards.name, daysOverdue },
      })
    }
  }

  // Send all notifications
  if (notifications.length > 0) {
    await createBulkNotifications(notifications)
  }

  return notifications.length
}
