export const SOCKET_EVENTS = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  ERROR: "error",
  JOIN_WORKSPACE: "workspace:join",
  LEAVE_WORKSPACE: "workspace:leave",
  JOIN_CHANNEL: "channel:join",
  LEAVE_CHANNEL: "channel:leave",
  JOIN_CONVERSATION: "conversation:join",
  LEAVE_CONVERSATION: "conversation:leave",
  MESSAGE_SENT: "message:sent",
  MESSAGE_EDITED: "message:edited",
  MESSAGE_DELETED: "message:deleted",
  MESSAGE_PINNED: "message:pinned",
  REACTION_ADDED: "reaction:added",
  REACTION_REMOVED: "reaction:removed",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  TYPING_UPDATE: "typing:update",
  PRESENCE_UPDATE: "presence:update",
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",
  READ_RECEIPT: "read:receipt",
  DELIVERY_RECEIPT: "delivery:receipt",
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_READ: "notification:read",
  NOTIFICATION_BULK: "notification:bulk",
  CALL_SIGNAL: "call:signal",
  CALL_START: "call:start",
  CALL_ACCEPT: "call:accept",
  CALL_REJECT: "call:reject",
  CALL_END: "call:end",
  CALL_INCOMING: "call:incoming",
  CALL_ACCEPTED: "call:accepted",
  CALL_REJECTED: "call:rejected",
  CALL_ENDED: "call:ended",
  CALL_MUTE: "call:mute",
  CALL_MUTED: "call:muted",
  CALL_SCREEN_START: "call:screen:start",
  CALL_SCREEN_STOP: "call:screen:stop",
  CALL_SCREEN_STARTED: "call:screen:started",
  CALL_SCREEN_STOPPED: "call:screen:stopped",
  CALL_RAISE_HAND: "call:raise-hand",
  MEETING_JOIN: "meeting:join",
  MEETING_LEAVE: "meeting:leave",
  MEETING_STARTED: "meeting:started",
  MEETING_ENDED: "meeting:ended",
  MEETING_USER_JOINED: "meeting:userJoined",
  MEETING_USER_LEFT: "meeting:userLeft",
  MEETING_PARTICIPANT: "meeting:participant",
  MEETING_MUTE: "meeting:mute",
  MEETING_CAMERA: "meeting:camera",
  MEETING_SCREEN_SHARE: "meeting:screenShare",
  MEETING_RAISE_HAND: "meeting:raiseHand",
  MEETING_CHAT: "meeting:chat",
} as const

export type UserPresence = "online" | "away" | "busy" | "offline"

export interface TypingUser {
  userId: string
  userName: string
  channelId?: string
  conversationId?: string
}

export interface PresenceData {
  userId: string
  status: UserPresence
  lastActiveAt?: string
}

export interface ReadReceiptData {
  messageId: string
  userId: string
  channelId?: string
  conversationId?: string
}

export interface CallSignalData {
  from: string
  signal: unknown
  type: string
}

export interface CallIncomingData {
  from: string
  type: "voice" | "video"
}

export interface MeetingChatMessage {
  id: string
  userId: string
  userName: string
  content: string
  createdAt: string
}
