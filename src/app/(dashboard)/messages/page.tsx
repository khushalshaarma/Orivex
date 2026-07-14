"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatHeader } from "@/components/chat/chat-header"
import { MessageList } from "@/components/chat/message-list"
import { MessageComposer } from "@/components/chat/message-composer"
import { ThreadPanel } from "@/components/chat/thread-panel"
import { CreateChannelModal } from "@/components/chat/create-channel-modal"
import { NewConversationModal } from "@/components/chat/new-conversation-modal"
import { VoiceCallUI } from "@/components/chat/voice-call"
import { VideoCallUI } from "@/components/chat/video-call"
import { useSocket } from "@/features/chat/socket/provider"
import { SOCKET_EVENTS } from "@/features/chat/socket/types"
import { useActiveWorkspace } from "@/hooks/use-workspace"
import { useChannelMessages, useConversationMessages, useMessageActions } from "@/hooks/use-messages"
import type { Message } from "@/hooks/use-messages"
import { MessageSquare } from "lucide-react"

interface ChannelSummary { id: string; name: string; slug: string; description?: string; type: string; archived: boolean; icon?: string; color?: string; _count?: { members: number; messages: number } }
interface ConversationSummary { id: string; members: { id: string; name: string | null; image: string | null; email?: string | null }[]; messages?: { content: string; createdAt: string; senderId: string; type: string }[]; _count?: { messages: number } }

export default function MessagesPage() {
  const { data: session } = useSession()
  const { workspace } = useActiveWorkspace()
  const { socket, connected } = useSocket()
  const wsId = workspace?.id

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [channels, setChannels] = useState<ChannelSummary[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [channelModalOpen, setChannelModalOpen] = useState(false)
  const [convModalOpen, setConvModalOpen] = useState(false)
  const [members, setMembers] = useState<{ id: string; name: string | null; image: string | null }[]>([])
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({})

  const [threadMessage, setThreadMessage] = useState<Message | null>(null)
  const [threadOpen, setThreadOpen] = useState(false)

  const { messages: channelMessages, loading: channelLoading, sendMessage: sendChannelMsg, mutate: mutateChannel } = useChannelMessages(activeChannelId)
  const { messages: convMessages, loading: convLoading, sendMessage: sendConvMsg, mutate: mutateConv } = useConversationMessages(activeConversationId)
  const { editMessage, deleteMessage, addReaction: reactToMessage } = useMessageActions()

  const messages = activeChannelId ? channelMessages : activeConversationId ? convMessages : []
  const loading = activeChannelId ? channelLoading : activeConversationId ? convLoading : false
  const mutateMessages = activeChannelId ? mutateChannel : activeConversationId ? mutateConv : (() => {})

  const [callState, setCallState] = useState<{ type: "voice" | "video"; direction: "incoming" | "outgoing"; peerId: string } | null>(null)

  const sendMessage = useCallback(async (content: string, fileUrls?: string[]) => {
    if (activeChannelId) {
      const msg = await sendChannelMsg(content, fileUrls)
      if (socket && activeChannelId) {
        socket.emit("message:sent", { channelId: activeChannelId, message: msg })
      }
      return msg
    }
    if (activeConversationId) {
      const msg = await sendConvMsg(content, fileUrls)
      if (socket && activeConversationId) {
        socket.emit("message:sent", { conversationId: activeConversationId, message: msg })
      }
      return msg
    }
    return Promise.reject(new Error("No active conversation"))
  }, [activeChannelId, activeConversationId, sendChannelMsg, sendConvMsg, socket])

  const loadChannels = useCallback(async () => {
    if (!wsId) return
    try {
      const res = await fetch(`/api/channels?workspaceId=${wsId}`)
      const json = await res.json()
      if (json.success) {
        setChannels(json.data.filter((c: ChannelSummary) => !c.name.startsWith("_")))
      }
    } catch {}
  }, [wsId])

  const loadConversations = useCallback(async () => {
    if (!wsId) return
    try {
      const res = await fetch(`/api/conversations?workspaceId=${wsId}`)
      const json = await res.json()
      if (json.success) setConversations(json.data)
    } catch {}
  }, [wsId])

  const loadMembers = useCallback(async () => {
    if (!wsId) return
    try {
      const res = await fetch(`/api/workspace/${wsId}/members`)
      const json = await res.json()
      if (json.data) {
        setMembers(json.data.map((m: { user: { id: string; name: string | null; image: string | null } }) => m.user))
      }
    } catch {}
  }, [wsId])

  useEffect(() => {
    if (!wsId) return
    const init = async () => {
      await Promise.all([
        loadChannels(),
        loadConversations(),
        loadMembers(),
      ])
    }
    init()
  }, [wsId, loadChannels, loadConversations, loadMembers])

  useEffect(() => {
    if (!socket) return

    function handleNewMessage(msg: Message) {
      const isForActiveChannel = activeChannelId && msg.channelId === activeChannelId
      const isForActiveConv = activeConversationId && msg.conversationId === activeConversationId
      if (isForActiveChannel || isForActiveConv) {
        mutateMessages()
      }
      if (msg.channelId && msg.channelId !== activeChannelId) {
        setUnreadMap((prev) => ({ ...prev, [msg.channelId!]: (prev[msg.channelId!] ?? 0) + 1 }))
      }
      if (msg.conversationId && msg.conversationId !== activeConversationId) {
        setUnreadMap((prev) => ({ ...prev, [msg.conversationId!]: (prev[msg.conversationId!] ?? 0) + 1 }))
      }
      loadConversations()
    }

    function handleEdited(data: { channelId?: string; conversationId?: string; messageId: string; content: string; edited: boolean }) {
      const isTarget = (data.channelId && data.channelId === activeChannelId) || (data.conversationId && data.conversationId === activeConversationId)
      if (isTarget) mutateMessages()
    }

    function handleDeleted(data: { channelId?: string; conversationId?: string; messageId: string }) {
      const isTarget = (data.channelId && data.channelId === activeChannelId) || (data.conversationId && data.conversationId === activeConversationId)
      if (isTarget) mutateMessages()
    }

    function handleReaction() {
      mutateMessages()
    }

    function handleCallIncoming(data: { from: string; type: "voice" | "video" }) {
      setCallState({ type: data.type, direction: "incoming", peerId: data.from })
    }

    function handleCallAccepted() {
      setCallState((prev) => prev ? { ...prev, direction: "outgoing" } : null)
    }

    function handleCallEnded() {
      setCallState(null)
    }

    socket.on(SOCKET_EVENTS.MESSAGE_SENT, handleNewMessage)
    socket.on(SOCKET_EVENTS.MESSAGE_EDITED, handleEdited)
    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, handleDeleted)
    socket.on(SOCKET_EVENTS.REACTION_ADDED, handleReaction)
    socket.on("call:incoming", handleCallIncoming)
    socket.on("call:accepted", handleCallAccepted)
    socket.on("call:ended", handleCallEnded)

    if (activeChannelId) {
      socket.emit("channel:join", activeChannelId)
    }
    if (activeConversationId) {
      socket.emit("conversation:join", activeConversationId)
    }

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_SENT, handleNewMessage)
      socket.off(SOCKET_EVENTS.MESSAGE_EDITED, handleEdited)
      socket.off(SOCKET_EVENTS.MESSAGE_DELETED, handleDeleted)
      socket.off(SOCKET_EVENTS.REACTION_ADDED, handleReaction)
      socket.off("call:incoming", handleCallIncoming)
      socket.off("call:accepted", handleCallAccepted)
      socket.off("call:ended", handleCallEnded)
    }
  }, [socket, activeChannelId, activeConversationId, mutateMessages, loadConversations])

  const handleChannelSelect = useCallback((id: string) => {
    setActiveChannelId(id)
    setActiveConversationId(null)
    setUnreadMap((prev) => ({ ...prev, [id]: 0 }))
    if (socket) {
      if (activeConversationId) socket.emit("conversation:leave", activeConversationId)
      socket.emit("channel:join", id)
    }
  }, [socket, activeConversationId])

  const handleConversationSelect = useCallback((id: string) => {
    setActiveConversationId(id)
    setActiveChannelId(null)
    setUnreadMap((prev) => ({ ...prev, [id]: 0 }))
    if (socket) {
      if (activeChannelId) socket.emit("channel:leave", activeChannelId)
      socket.emit("conversation:join", id)
    }
  }, [socket, activeChannelId])

  function refreshLists() {
    loadChannels()
    loadConversations()
  }

  function handleStartCall(type: "voice" | "video") {
    const targetMember = activeConversationId
      ? conversations.find((c) => c.id === activeConversationId)?.members[0]
      : null
    if (!targetMember) return
    setCallState({ type, direction: "outgoing", peerId: targetMember.id })
    socket?.emit("call:start", { to: targetMember.id, type })
  }

  const activeTitle = activeChannelId
    ? channels.find((c) => c.id === activeChannelId)?.name ?? "Channel"
    : activeConversationId
      ? conversations.find((c) => c.id === activeConversationId)?.members[0]?.name ?? "Direct Message"
      : "Select a conversation"

  const activeType = activeChannelId ? "channel" as const : "direct" as const
  const onlineCount = activeChannelId
    ? channels.find((c) => c.id === activeChannelId)?._count?.members
    : undefined

  return (
    <div className="flex h-full overflow-hidden -mx-4 -mb-4 md:-mx-6 md:-mb-6" style={{ marginTop: "-1rem" }}>
      <CreateChannelModal
        open={channelModalOpen}
        onOpenChange={setChannelModalOpen}
        onCreated={refreshLists}
        workspaceId={wsId ?? null}
      />
      <NewConversationModal
        open={convModalOpen}
        onOpenChange={setConvModalOpen}
        onCreated={refreshLists}
        members={members}
        currentUserId={session?.user?.id ?? ""}
        workspaceId={wsId}
      />

      {callState && (
        callState.type === "voice" ? (
          <VoiceCallUI
            direction={callState.direction}
            peerId={callState.peerId}
            onEnd={() => {
              socket?.emit("call:end", { to: callState.peerId })
              setCallState(null)
            }}
            onAccept={() => socket?.emit("call:accept", { to: callState.peerId })}
            onReject={() => { socket?.emit("call:reject", { to: callState.peerId }); setCallState(null) }}
          />
        ) : (
          <VideoCallUI
            direction={callState.direction}
            peerId={callState.peerId}
            onEnd={() => {
              socket?.emit("call:end", { to: callState.peerId })
              setCallState(null)
            }}
            onAccept={() => socket?.emit("call:accept", { to: callState.peerId })}
            onReject={() => { socket?.emit("call:reject", { to: callState.peerId }); setCallState(null) }}
          />
        )
      )}

      <ChatSidebar
        channels={channels}
        conversations={conversations}
        activeChannelId={activeChannelId}
        activeConversationId={activeConversationId}
        unreadMap={unreadMap}
        onChannelSelect={handleChannelSelect}
        onConversationSelect={handleConversationSelect}
        onCreateChannel={() => setChannelModalOpen(true)}
        onNewConversation={() => setConvModalOpen(true)}
        online={connected}
      />

      <div className="flex flex-1 flex-col min-w-0">
        {!activeChannelId && !activeConversationId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-zinc-500 dark:text-zinc-400">Select a conversation</h3>
              <p className="text-sm text-zinc-400 mt-1">Choose a channel or DM from the sidebar</p>
            </div>
          </div>
        ) : (
          <>
            <ChatHeader
              title={activeTitle}
              type={activeType}
              channelId={activeChannelId}
              conversationId={activeConversationId}
              onlineCount={onlineCount}
              onVoiceCall={activeConversationId ? () => handleStartCall("voice") : undefined}
              onVideoCall={activeConversationId ? () => handleStartCall("video") : undefined}
            />

            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col min-w-0">
                <MessageList
                  messages={messages}
                  loading={loading}
                  sessionUserId={session?.user?.id ?? ""}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                  onReact={reactToMessage}
                  onThreadClick={(m) => { setThreadMessage(m); setThreadOpen(true) }}
                />

                <MessageComposer
                  onSend={sendMessage}
                  channelId={activeChannelId}
                  conversationId={activeConversationId}
                />
              </div>

              {threadOpen && threadMessage && (
                <ThreadPanel
                  parentMessage={threadMessage}
                  open={threadOpen && !!threadMessage}
                  onClose={() => setThreadOpen(false)}
                  onReact={reactToMessage}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
