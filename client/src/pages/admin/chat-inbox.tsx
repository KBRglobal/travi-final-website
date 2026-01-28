import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Send, Loader2, User, Clock, Check, Archive, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  conversationId: string;
  senderType: string;
  senderId: string | null;
  contents: string;
  createdAt: string;
  isRead: boolean;
}

interface Conversation {
  id: string;
  visitorId: string;
  visitorName: string | null;
  visitorEmail: string | null;
  status: string;
  unreadCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  messages?: Message[];
}

export default function AdminChatInbox() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/admin/live-chat/conversations", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/live-chat/conversations?status=${statusFilter}`);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: activeConversation, isLoading: conversationLoading } = useQuery<Conversation>({
    queryKey: ["/api/admin/live-chat/conversations", selectedConversation],
    queryFn: async () => {
      const res = await fetch(`/api/admin/live-chat/conversations/${selectedConversation}`);
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return res.json();
    },
    enabled: !!selectedConversation,
    refetchInterval: 3000,
  });

  const sendMessage = useMutation({
    mutationFn: async (contents: string) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/live-chat/conversations/${selectedConversation}/messages`,
        {
          contents,
        }
      );
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/live-chat/conversations", selectedConversation],
      });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/live-chat/conversations/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/live-chat/conversations"],
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  useEffect(() => {
    if (selectedConversation) {
      apiRequest("POST", `/api/admin/live-chat/conversations/${selectedConversation}/read`, {});
    }
  }, [selectedConversation, activeConversation?.messages?.length]);

  const handleSend = () => {
    if (message.trim() && !sendMessage.isPending) {
      sendMessage.mutate(message.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getVisitorLabel = (conv: Conversation) => {
    if (conv.visitorName) return conv.visitorName;
    if (conv.visitorEmail) return conv.visitorEmail;
    return `Visitor ${conv.visitorId.substring(8, 14)}`;
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]" data-testid="admin-chat-inbox">
      <div className="border-b border-[hsl(var(--admin-border))] bg-white">
        <div className="px-6 py-4 flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-[hsl(var(--admin-text-secondary))]" />
          <div>
            <h1
              className="text-xl font-semibold text-[hsl(var(--admin-text))]"
              data-testid="text-page-title"
            >
              Live Chat Inbox
            </h1>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">
              Respond to visitor messages
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 h-[calc(100vh-140px)]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="py-3 border-b">
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="open" className="gap-1">
                    <Inbox className="w-3 h-3" />
                    Open
                  </TabsTrigger>
                  <TabsTrigger value="closed" className="gap-1">
                    <Check className="w-3 h-3" />
                    Closed
                  </TabsTrigger>
                  <TabsTrigger value="archived" className="gap-1">
                    <Archive className="w-3 h-3" />
                    Archived
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <ScrollArea className="flex-1">
              {conversationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No conversations</div>
              ) : (
                <div className="divide-y">
                  {conversations.map(conv => (
                    <button
                      key={conv.id}
                      className={cn(
                        "w-full text-left p-3 hover-elevate transition-colors",
                        selectedConversation === conv.id && "bg-accent"
                      )}
                      onClick={() => setSelectedConversation(conv.id)}
                      data-testid={`conversation-${conv.id}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm truncate">
                            {getVisitorLabel(conv)}
                          </span>
                        </div>
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="bg-[#6443F4] text-xs">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      {conv.messages?.[0] && (
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.messages[0].contents}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {conv.lastMessageAt
                          ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })
                          : "No messages"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          <Card className="lg:col-span-2 flex flex-col">
            {selectedConversation && activeConversation ? (
              <>
                <CardHeader className="py-3 border-b flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base" data-testid="text-conversation-title">
                      {getVisitorLabel(activeConversation)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Started {format(new Date(activeConversation.createdAt), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {activeConversation.status === "open" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatus.mutate({ id: activeConversation.id, status: "closed" })
                        }
                        data-testid="button-close-conversation"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Close
                      </Button>
                    )}
                    {activeConversation.status === "closed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatus.mutate({ id: activeConversation.id, status: "archived" })
                        }
                        data-testid="button-archive-conversation"
                      >
                        <Archive className="w-4 h-4 mr-1" />
                        Archive
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <ScrollArea className="flex-1 p-4">
                  {conversationLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeConversation.messages?.map(msg => (
                        <div
                          key={msg.id}
                          className={cn(
                            "max-w-[70%] p-3 rounded-lg",
                            msg.senderType === "admin"
                              ? "ml-auto bg-[#6443F4] text-white"
                              : "bg-muted"
                          )}
                          data-testid={`admin-message-${msg.id}`}
                        >
                          <p className="text-sm">{msg.contents}</p>
                          <p
                            className={cn(
                              "text-xs mt-1",
                              msg.senderType === "admin" ? "text-white/70" : "text-muted-foreground"
                            )}
                          >
                            {format(new Date(msg.createdAt), "h:mm a")}
                          </p>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {activeConversation.status === "open" && (
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your reply..."
                        className="flex-1"
                        disabled={sendMessage.isPending}
                        data-testid="input-admin-reply"
                      />
                      <Button
                        onClick={handleSend}
                        disabled={!message.trim() || sendMessage.isPending}
                        data-testid="button-send-admin-reply"
                      >
                        {sendMessage.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageCircle className="w-12 h-12 mb-4" />
                <p>Select a conversation to view messages</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
