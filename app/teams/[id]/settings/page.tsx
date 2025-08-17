import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import TeamSettings from "@/components/team-settings"

interface TeamSettingsPageProps {
  params: {
    id: string
  }
}

export default async function TeamSettingsPage({ params }: TeamSettingsPageProps) {
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

  // Check if user is admin of this team
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", params.id)
    .eq("user_id", user.id)
    .single()

  if (!membership || membership.role !== "admin") {
    redirect(`/teams/${params.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/teams/${params.id}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Team
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Settings</h1>
              <p className="text-gray-600">Manage {team.name} settings</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <TeamSettings team={team} />
      </main>
    </div>
  )
}
