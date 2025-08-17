import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, CheckCircle } from "lucide-react"
import Link from "next/link"
import CreateTeamDialog from "@/components/create-team-dialog"
import CreateBoardDialog from "@/components/create-board-dialog"
import { AppHeader } from "@/components/app-header"

export default async function DashboardPage() {
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

  // Get user's teams
  const { data: teams } = await supabase
    .from("team_members")
    .select(`
      team_id,
      role,
      teams (
        id,
        name,
        description,
        created_at
      )
    `)
    .eq("user_id", user.id)

  // Get user's recent boards
  const { data: boards } = await supabase
    .from("boards")
    .select(`
      id,
      name,
      description,
      created_at,
      teams (
        name
      )
    `)
    .in("team_id", teams?.map((t) => t.teams.id) || [])
    .order("created_at", { ascending: false })
    .limit(6)

  // Get task statistics
  const { data: taskStats } = await supabase
    .from("tasks")
    .select("status, board_id")
    .in("board_id", boards?.map((b) => b.id) || [])

  const totalTasks = taskStats?.length || 0
  const completedTasks = taskStats?.filter((t) => t.status === "done").length || 0
  const inProgressTasks = taskStats?.filter((t) => t.status === "in_progress").length || 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back!</h1>
          <p className="text-muted-foreground">Here's what's happening with your teams and projects.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTasks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressTasks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTasks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teams</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teams?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Teams Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Teams</CardTitle>
              <CardDescription>Teams you're a member of</CardDescription>
            </CardHeader>
            <CardContent>
              {teams && teams.length > 0 ? (
                <div className="space-y-4">
                  {teams.map((teamMember) => (
                    <div key={teamMember.team_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{teamMember.teams.name}</h3>
                        <p className="text-sm text-muted-foreground">{teamMember.teams.description}</p>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {teamMember.role}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/teams/${teamMember.team_id}`}>View</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">You're not part of any teams yet.</p>
                  <CreateTeamDialog />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Boards Section */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Boards</CardTitle>
              <CardDescription>Your recently accessed project boards</CardDescription>
            </CardHeader>
            <CardContent>
              {boards && boards.length > 0 ? (
                <div className="space-y-4">
                  {boards.map((board) => (
                    <div key={board.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{board.name}</h3>
                        <p className="text-sm text-muted-foreground">{board.description}</p>
                        <span className="text-xs text-muted-foreground">Team: {board.teams.name}</span>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/boards/${board.id}`}>Open</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No boards yet.</p>
                  <CreateBoardDialog teams={teams || []} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
