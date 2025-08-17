"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase/client"
import { Users } from "lucide-react"

interface PresenceIndicatorProps {
  boardId: string
  currentUserId: string
}

interface PresenceUser {
  user_id: string
  full_name: string | null
  email: string
  last_seen: string
}

export default function PresenceIndicator({ boardId, currentUserId }: PresenceIndicatorProps) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    const channel = supabase.channel(`board-presence-${boardId}`)

    // Track presence
    channel
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState()
        const users: PresenceUser[] = []

        Object.keys(presenceState).forEach((userId) => {
          const presence = presenceState[userId][0] as any
          if (presence && userId !== currentUserId) {
            users.push({
              user_id: userId,
              full_name: presence.full_name,
              email: presence.email,
              last_seen: presence.last_seen,
            })
          }
        })

        setOnlineUsers(users)
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        const presence = newPresences[0] as any
        if (key !== currentUserId) {
          setOnlineUsers((prev) => [
            ...prev.filter((u) => u.user_id !== key),
            {
              user_id: key,
              full_name: presence.full_name,
              email: presence.email,
              last_seen: presence.last_seen,
            },
          ])
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setOnlineUsers((prev) => prev.filter((u) => u.user_id !== key))
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Get current user info
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user) {
            const { data: userProfile } = await supabase.from("users").select("full_name").eq("id", user.id).single()

            // Track current user's presence
            await channel.track({
              user_id: user.id,
              full_name: userProfile?.full_name || null,
              email: user.email,
              last_seen: new Date().toISOString(),
            })
          }
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [boardId, currentUserId])

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  if (onlineUsers.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Users className="h-4 w-4" />
        <span className="text-sm">Only you</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex -space-x-2">
        {onlineUsers.slice(0, 3).map((user) => (
          <Avatar key={user.user_id} className="h-8 w-8 border-2 border-white">
            <AvatarFallback className="text-xs bg-green-100 text-green-800">
              {getInitials(user.full_name, user.email)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-sm text-muted-foreground">
          {onlineUsers.length} online
          {onlineUsers.length > 3 && ` (+${onlineUsers.length - 3} more)`}
        </span>
      </div>
    </div>
  )
}
