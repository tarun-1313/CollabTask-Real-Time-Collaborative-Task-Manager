import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import TeamChat from "@/components/team-chat"

interface TeamChatPageProps {
  params: {
    id: string
  }
}

export default async function TeamChatPage({ params }: TeamChatPageProps) {
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
      users (
        id,
        email,
        full_name
      )
    `)
    .eq("team_id", params.id)

  // Get recent chat messages
  const { data: messages } = await supabase
    .from("chat_messages")
    .select(`
      *,
      user:users (
        id,
        full_name,
        email
      )
    `)
    .eq("team_id", params.id)
    .order("created_at", { ascending: true })
    .limit(50)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/teams/${params.id}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Team
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{team.name} Chat</h1>
                <p className="text-gray-600">Team communication</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">{members?.length || 0} members</div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-0 h-[calc(100vh-80px)]">
        <TeamChat teamId={params.id} currentUser={user} initialMessages={messages || []} teamMembers={members || []} />
      </main>
    </div>
  )
}
