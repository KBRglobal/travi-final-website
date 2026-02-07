import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  conversationId: string;
  senderType: string;
  contents: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  visitorId: string;
  status: string;
}

function generateVisitorId(): string {
  const stored = localStorage.getItem("liveChatVisitorId");
  if (stored) return stored;

  const id = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem("liveChatVisitorId", id);
  return id;
}

interface LiveChatWidgetProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showFloatingButton?: boolean;
}

export function LiveChatWidget({
  isOpen: externalIsOpen,
  onOpenChange,
  showFloatingButton = true,
}: LiveChatWidgetProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const visitorId = generateVisitorId();

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/live-chat/conversations", conversation?.id, "messages"],
    queryFn: async () => {
      if (!conversation?.id) return [];
      const res = await fetch(`/api/live-chat/conversations/${conversation.id}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!conversation?.id && isOpen,
    refetchInterval: 3000,
  });

  const initConversation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/live-chat/conversations", {
        visitorId,
      });
      return res.json();
    },
    onSuccess: data => {
      setConversation(data);
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (contents: string) => {
      if (!conversation?.id) throw new Error("No conversation");
      const res = await apiRequest(
        "POST",
        `/api/live-chat/conversations/${conversation.id}/messages`,
        {
          contents,
          senderType: "visitor",
        }
      );
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({
        queryKey: ["/api/live-chat/conversations", conversation?.id, "messages"],
      });
    },
  });

  useEffect(() => {
    if (isOpen && !conversation) {
      initConversation.mutate();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50" data-testid="live-chat-widget">
      {isOpen && (
        <Card
          className="w-full sm:w-80 max-h-[80vh] h-96 flex flex-col shadow-xl box-border"
          role="region"
          aria-label="Live chat"
        >
          <div className="flex items-center justify-between gap-2 p-3 border-b bg-travi-purple rounded-t-lg">
            <div className="flex items-center gap-2">
              <img
                src="/logos/Mascot_for_Dark_Background.png"
                alt=""
                aria-hidden="true"
                className="w-8 h-8 object-contain"
                width={32}
                height={32}
              />
              <span className="font-medium text-white">Chat with us</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              data-testid="button-close-chat"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>

          <ScrollArea
            className="flex-1 p-3"
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
          >
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2
                  className="w-6 h-6 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="sr-only">Loading messages</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Automatic welcome message */}
                <div className="max-w-[85%] p-2 rounded-lg text-sm bg-muted">
                  <p>Welcome to Travi! How can we help you today?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Response time: up to 48 hours
                  </p>
                </div>
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={cn(
                      "max-w-[85%] p-2 rounded-lg text-sm",
                      msg.senderType === "visitor"
                        ? "ml-auto bg-travi-purple text-white"
                        : "bg-muted"
                    )}
                    data-testid={`message-${msg.id}`}
                  >
                    {msg.contents}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                aria-label="Type your message"
                className="flex-1"
                disabled={sendMessage.isPending || !conversation}
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!message.trim() || sendMessage.isPending || !conversation}
                aria-label="Send message"
                data-testid="button-send-message"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="w-4 h-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
      {!isOpen && showFloatingButton && (
        <Button
          size="icon"
          className="w-14 h-14 rounded-full shadow-lg bg-travi-purple hover:bg-travi-purple/90 ml-auto"
          onClick={() => setIsOpen(true)}
          aria-label="Open live chat"
          aria-expanded={isOpen}
          data-testid="button-open-chat"
        >
          <MessageCircle className="w-6 h-6" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
