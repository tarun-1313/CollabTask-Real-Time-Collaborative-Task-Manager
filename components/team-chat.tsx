"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, Users } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import type { User } from "@supabase/supabase-js"

interface TeamChatProps {
  teamId: string
  currentUser: User
  initialMessages: Array<{
    id: string
    content: string
    message_type: string
    created_at: string
    user: {
      id: string
      full_name: string | null
      email: string
    }
  }>
  teamMembers: Array<{
    role: string
    users: {
      id: string
      email: string
      full_name: string | null
    }
  }>
}

interface OnlineUser {
  user_id: string
  full_name: string | null
  email: string
  last_seen: string
}

export default function TeamChat({ teamId, currentUser, initialMessages, teamMembers }: TeamChatProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Real-time message subscription
  useEffect(() => {
    const channel = supabase
      .channel(`team-chat-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `team_id=eq.${teamId}`,
        },
        async (payload) => {
          // Get the full message with user data
          const { data: newMessage } = await supabase
            .from("chat_messages")
            .select(`
              *,
              user:users (
                id,
                full_name,
                email
              )
            `)
            .eq("id", payload.new.id)
            .single()

          if (newMessage) {
            setMessages((prev) => [...prev, newMessage])

            // Show notification if message is from another user
            if (newMessage.user.id !== currentUser.id) {
              toast({
                title: `${newMessage.user.full_name || newMessage.user.email}`,
                description: newMessage.content,
                duration: 3000,
              })
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId, currentUser.id])

  // Presence tracking
  useEffect(() => {
    const presenceChannel = supabase.channel(`chat-presence-${teamId}`)

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const presenceState = presenceChannel.presenceState()
        const users: OnlineUser[] = []

        Object.keys(presenceState).forEach((userId) => {
          const presence = presenceState[userId][0] as any
          if (presence && userId !== currentUser.id) {
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
        if (key !== currentUser.id) {
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
          // Get current user profile
          const { data: userProfile } = await supabase
            .from("users")
            .select("full_name")
            .eq("id", currentUser.id)
            .single()

          // Track current user's presence
          await presenceChannel.track({
            user_id: currentUser.id,
            full_name: userProfile?.full_name || null,
            email: currentUser.email,
            last_seen: new Date().toISOString(),
          })
        }
      })

    return () => {
      supabase.removeChannel(presenceChannel)
    }
  }, [teamId, currentUser.id, currentUser.email])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isLoading) return

    setIsLoading(true)

    try {
      const { error } = await supabase.from("chat_messages").insert({
        team_id: teamId,
        user_id: currentUser.id,
        content: newMessage.trim(),
        message_type: "text",
      })

      if (error) throw error

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`

    return date.toLocaleDateString() === now.toLocaleDateString()
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

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

  const isConsecutiveMessage = (currentMsg: any, prevMsg: any) => {
    if (!prevMsg) return false
    const timeDiff = new Date(currentMsg.created_at).getTime() - new Date(prevMsg.created_at).getTime()
    return currentMsg.user.id === prevMsg.user.id && timeDiff < 5 * 60 * 1000 // 5 minutes
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      {/* Main Chat Area */}
      <div className="lg:col-span-3 flex flex-col h-full">
        <Card className="flex-1 flex flex-col h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Team Chat</span>
              <Badge variant="secondary">{messages.length} messages</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages Area */}
            <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
              <div className="space-y-4 py-4">
                {messages.map((message, index) => {
                  const prevMessage = index > 0 ? messages[index - 1] : null
                  const isConsecutive = isConsecutiveMessage(message, prevMessage)
                  const isOwnMessage = message.user.id === currentUser.id

                  return (
                    <div key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                      <div className={`flex ${isOwnMessage ? "flex-row-reverse" : "flex-row"} items-start space-x-2`}>
                        {!isConsecutive && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {getInitials(message.user.full_name, message.user.email)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
                          {!isConsecutive && (
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium">
                                {message.user.full_name || message.user.email}
                              </span>
                              <span className="text-xs text-muted-foreground">{formatTime(message.created_at)}</span>
                            </div>
                          )}
                          <div
                            className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                              isOwnMessage
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-900 border border-gray-200"
                            } ${isConsecutive ? (isOwnMessage ? "mr-10" : "ml-10") : ""}`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1"
                  maxLength={1000}
                />
                <Button type="submit" disabled={isLoading || !newMessage.trim()} size="sm">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - Team Members & Online Status */}
      <div className="lg:col-span-1">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Online Members */}
              {onlineUsers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-600 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Online ({onlineUsers.length})
                  </h4>
                  <div className="space-y-2">
                    {onlineUsers.map((user) => (
                      <div key={user.user_id} className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-green-100 text-green-800">
                            {getInitials(user.full_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.full_name || user.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Members */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">All Members ({teamMembers.length})</h4>
                <div className="space-y-2">
                  {teamMembers.map((member) => {
                    const isOnline = onlineUsers.some((u) => u.user_id === member.users.id)
                    const isCurrentUser = member.users.id === currentUser.id

                    return (
                      <div key={member.users.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback
                              className={`text-xs ${
                                isOnline
                                  ? "bg-green-100 text-green-800"
                                  : isCurrentUser
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {getInitials(member.users.full_name, member.users.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-sm">
                              {member.users.full_name || member.users.email}
                              {isCurrentUser && " (you)"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {isOnline && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                          <Badge variant="secondary" className="text-xs">
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
