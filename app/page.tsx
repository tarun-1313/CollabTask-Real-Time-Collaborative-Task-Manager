import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, Users, MessageSquare, BarChart3 } from "lucide-react"
import Link from "next/link"

export default async function Home() {
  // If Supabase is not configured, show setup message
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Check if user is already logged in
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-foreground">TaskFlow</span>
          </div>
          <div className="space-x-4">
            <Link href="/auth/login">
              <Button
                variant="outline"
                className="border-input bg-background hover:bg-accent hover:text-accent-foreground"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Collaborate. Organize. <span className="text-blue-600">Achieve.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            The ultimate real-time task management platform for teams. Create boards, assign tasks, chat with your team,
            and track progress all in one place.
          </p>
          <div className="space-x-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-4 text-lg border-input bg-background hover:bg-accent hover:text-accent-foreground"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-card rounded-xl p-8 shadow-lg border">
            <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-3">Kanban Boards</h3>
            <p className="text-muted-foreground">
              Visualize your workflow with drag-and-drop Kanban boards. Move tasks through customizable columns and
              track progress in real-time.
            </p>
          </div>

          <div className="bg-card rounded-xl p-8 shadow-lg border">
            <div className="bg-green-100 dark:bg-green-900 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-3">Team Collaboration</h3>
            <p className="text-muted-foreground">
              Assign tasks, set deadlines, and collaborate with team members. Role-based permissions keep your projects
              organized and secure.
            </p>
          </div>

          <div className="bg-card rounded-xl p-8 shadow-lg border">
            <div className="bg-purple-100 dark:bg-purple-900 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-3">Real-time Chat</h3>
            <p className="text-muted-foreground">
              Built-in team chat keeps communication flowing. Discuss tasks, share updates, and stay connected with your
              team.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-card rounded-2xl p-12 mt-20 text-center shadow-xl border">
          <BarChart3 className="h-16 w-16 text-blue-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-card-foreground mb-4">Ready to boost your team's productivity?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of teams already using TaskFlow to manage their projects efficiently.
          </p>
          <Link href="/auth/sign-up">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg">
              Get Started Free
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t">
        <div className="text-center text-muted-foreground">
          <p>&copy; 2024 TaskFlow. Built for teams that get things done.</p>
        </div>
      </footer>
    </div>
  )
}
