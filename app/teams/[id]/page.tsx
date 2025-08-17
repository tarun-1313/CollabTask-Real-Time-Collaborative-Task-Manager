import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, ArrowLeft, MessageSquare, Settings } from "lucide-react"
import Link from "next/link"
import TeamMemberManagement from "@/components/team-member-management"
import ProtectedAction from "@/components/protected-action"
import { ThemeToggle } from "@/components/theme-toggle"
import type { TeamRole } from "@/lib/permissions"

interface TeamPageProps {
  params: {
    id: string
  }
}

export default async function TeamPage({ params }: TeamPageProps) {
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

  // Get team details
  const { data: team, error: teamError } = await supabase.from("teams").select("*").eq("id", params.id).single()

  if (teamError || !team) {
    notFound()
  }

  // Check if user is member of this team
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", params.id)
    .eq("user_id", user.id)
    .single()

  if (!membership) {
    redirect("/dashboard")
  }

  // Get team members
  const { data: members } = await supabase
    .from("team_members")
    .select(`
      role,
      joined_at,
      users (
        id,
        email,
        full_name
      )
    `)
    .eq("team_id", params.id)

  // Get team boards
  const { data: boards } = await supabase
    .from("boards")
    .select("*")
    .eq("team_id", params.id)
    .order("created_at", { ascending: false })

  const userRole = membership.role as TeamRole

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                <p className="text-gray-600">{team.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <Badge variant={userRole === "admin" ? "default" : "secondary"}>{userRole}</Badge>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/teams/${params.id}/chat`}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Team Chat
                </Link>
              </Button>
              <ProtectedAction userRole={userRole} requiredPermission="canEditTeam">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/teams/${params.id}/settings`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              </ProtectedAction>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Team Boards */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Team Boards</CardTitle>
                <CardDescription>Project boards for this team</CardDescription>
              </CardHeader>
              <CardContent>
                {boards && boards.length > 0 ? (
                  <div className="grid gap-4">
                    {boards.map((board) => (
                      <div key={board.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{board.name}</h3>
                          <p className="text-sm text-muted-foreground">{board.description}</p>
                          <span className="text-xs text-muted-foreground">
                            Created {new Date(board.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/boards/${board.id}`}>Open Board</Link>
                          </Button>
                          <ProtectedAction userRole={userRole} requiredPermission="canDeleteBoard">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 bg-transparent"
                            >
                              Delete
                            </Button>
                          </ProtectedAction>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No boards created yet.</p>
                    <ProtectedAction userRole={userRole} requiredPermission="canCreateBoard">
                      <p className="text-sm text-muted-foreground mt-2">Create your first board to get started!</p>
                    </ProtectedAction>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team Members Management */}
          <div>
            <TeamMemberManagement
              teamId={params.id}
              currentUserRole={userRole}
              members={members || []}
              currentUserId={user.id}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
