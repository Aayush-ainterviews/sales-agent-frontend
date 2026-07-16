'use client'

import { Plus, MessageSquare, Trash2, Loader2 } from 'lucide-react'
import type { Conversation } from '@/lib/api'

// Left rail: list of the user's chats + "New chat". Click to open, hover to delete.
export default function ConversationSidebar({
  conversations,
  activeCid,
  loading,
  onSelect,
  onNew,
  onDelete,
}: {
  conversations: Conversation[]
  activeCid: string | null
  loading?: boolean
  onSelect: (cid: string) => void
  onNew: () => void
  onDelete: (cid: string) => void
}) {
  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <div className="p-3 shrink-0">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-secondary transition text-sm font-medium text-foreground"
        >
          <Plus className="w-4 h-4" /> New chat
        </button>
      </div>
      <div className="flex-1 overflow-auto min-h-0 px-2 pb-2 space-y-0.5">
        {loading && conversations.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
          </p>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">No chats yet.</p>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer text-sm ${
                c.id === activeCid
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 truncate">{c.title || 'New chat'}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(c.id)
                }}
                title="Delete chat"
                className="hidden group-hover:inline text-muted-foreground hover:text-red-500 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
