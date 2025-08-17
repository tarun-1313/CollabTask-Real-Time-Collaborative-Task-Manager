import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import CreateTaskDialog from "@/components/create-task-dialog"
import KanbanBoard from "@/components/kanban-board"
import PresenceIndicator from "@/components/presence-indicator"
import ActivityFeed from "@/components/activity-feed"
import RealTimeNotifications from "@/components/real-time-notifications"
import { ThemeToggle } from "@/components/theme-toggle"

interface BoardPageProps {
  params: {
    id: string
  }
}

export default async function BoardPage({ params }: BoardPageProps) {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Connect Supabase to get started</h1>
      </div>
    )
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get board details with team info
  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select(`
      *,
      teams (
        id,
        name
      )
    `)
    .eq("id", params.id)
    .single()

  if (boardError || !board) {
    notFound()
  }

  // Check if user is member of the team
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", board.team_id)
    .eq("user_id", user.id)
    .single()

  if (!membership) {
    redirect("/dashboard")
  }

  // Get board columns
  const { data: columns } = await supabase
    .from("board_columns")
    .select("*")
    .eq("board_id", params.id)
    .order("position", { ascending: true })

  // Get tasks for this board
  const { data: tasks } = await supabase
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
    .eq("board_id", params.id)
    .order("position", { ascending: true })

  // Get team members for task assignment
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select(`
      users (
        id,
        full_name,
        email
      )
    `)
    .eq("team_id", board.team_id)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Real-time notifications component */}
      <RealTimeNotifications userId={user.id} boardId={params.id} />

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/teams/${board.team_id}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Team
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{board.name}</h1>
                <p className="text-gray-600">{board.description}</p>
                <span className="text-sm text-muted-foreground">Team: {board.teams.name}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <PresenceIndicator boardId={params.id} currentUserId={user.id} />
              <CreateTaskDialog boardId={params.id} columns={columns || []} teamMembers={teamMembers || []} />
              <Button variant="outline" size="sm" asChild>
                <Link href={`/teams/${board.team_id}/chat`}>Team Chat</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Kanban Board */}
          <div className="xl:col-span-3">
            <KanbanBoard initialColumns={columns || []} initialTasks={tasks || []} teamMembers={teamMembers || []} />
          </div>

          {/* Activity Sidebar */}
          <div className="xl:col-span-1">
            <ActivityFeed boardId={params.id} />
          </div>
        </div>
      </main>
    </div>
  )
}
