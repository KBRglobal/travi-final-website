import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Lightbulb,
  X,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  contents: string;
  timestamp: Date;
  type?: "thinking" | "suggestion" | "response" | "progress";
}

interface AIChatPanelProps {
  researchId?: string;
  researchTitle?: string;
  onSuggestionApplied?: (suggestion: string) => void;
  className?: string;
  defaultExpanded?: boolean;
}

export function AIChatPanel({
  researchId,
  researchTitle,
  onSuggestionApplied,
  className = "",
  defaultExpanded = true,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      contents: researchId
        ? `I'm analyzing "${researchTitle || "your research"}" using the Octopus System. Ask me anything about the contents, or request specific types of suggestions!
        
אני מנתח את "${researchTitle || "המחקר שלך"}" באמצעות מערכת התמנון. שאל אותי כל שאלה על התוכן, או בקש סוגים ספציפיים של הצעות!`
        : `Welcome! Paste or upload research contents above, then chat with me to refine the analysis.
        
ברוך הבא! הדבק או העלה תוכן מחקר למעלה, ואז שוחח איתי כדי לשפר את הניתוח.`,
      timestamp: new Date(),
      type: "response",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      contents: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsStreaming(true);

    const thinkingMessage: ChatMessage = {
      id: `thinking-${Date.now()}`,
      role: "assistant",
      contents: "Thinking... / חושב...",
      timestamp: new Date(),
      type: "thinking",
    };
    setMessages((prev) => [...prev, thinkingMessage]);

    try {
      const response = await fetch("/api/research-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: userMessage.contents,
          researchId,
          context: researchTitle,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            
            try {
              const data = JSON.parse(line.slice(6));
              if (data.contents) {
                fullContent += data.contents;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === thinkingMessage.id
                      ? { ...msg, contents: fullContent, type: "response" }
                      : msg
                  )
                );
              }
              if (data.done) {
                break;
              }
            } catch (e) {
              console.error("Parse error:", e);
            }
          }
        }
      }

      if (!fullContent) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === thinkingMessage.id
              ? {
                  ...msg,
                  contents: "I couldn't generate a response. Please try again. / לא הצלחתי לייצר תגובה. נסה שוב.",
                  type: "response",
                }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingMessage.id
            ? {
                ...msg,
                contents: "An error occurred. Please try again. / אירעה שגיאה. נסה שוב.",
                type: "response",
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-new",
        role: "assistant",
        contents: "Chat cleared. How can I help you? / הצ'אט נוקה. איך אני יכול לעזור?",
        timestamp: new Date(),
        type: "response",
      },
    ]);
  };

  const suggestedPrompts = [
    { label: "Extract hotels", labelHe: "חלץ מלונות", prompt: "Find all hotels mentioned and create contents suggestions for each" },
    { label: "Find attractions", labelHe: "מצא אטרקציות", prompt: "List all tourist attractions and suggest articles for each" },
    { label: "Create listicles", labelHe: "צור רשימות", prompt: "Suggest Top 10 and Best of listicle ideas from this research" },
    { label: "SEO keywords", labelHe: "מילות מפתח", prompt: "What are the best SEO keywords from this contents?" },
  ];

  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader
        className="flex flex-row items-center justify-between gap-2 pb-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-gradient-to-r from-[#6443F4] to-[#6443F4]">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <CardTitle className="text-lg">
            AI Assistant / עוזר בינה מלאכותית
          </CardTitle>
          {isStreaming && (
            <Badge variant="secondary" className="gap-1 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              clearChat();
            }}
            data-testid="button-clear-chat"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" data-testid="button-toggle-chat">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="flex-1 flex flex-col gap-3 pt-0">
          <ScrollArea
            className="flex-1 min-h-[300px] max-h-[400px] pr-3"
            ref={scrollRef}
          >
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${
                    message.role === "user" ? "flex-row-reverse" : ""
                  }`}
                  data-testid={`chat-message-${message.id}`}
                >
                  <div
                    className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-gradient-to-r from-[#6443F4] to-[#6443F4] text-white"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="w-4 h-4" />
                    ) : message.type === "thinking" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : message.type === "thinking"
                        ? "bg-muted/50 animate-pulse"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.contents}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {researchId && !isStreaming && (
            <div className="flex flex-wrap gap-1.5">
              {suggestedPrompts.map((prompt, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => {
                    setInputValue(prompt.prompt);
                    inputRef.current?.focus();
                  }}
                  data-testid={`button-prompt-${idx}`}
                >
                  <Lightbulb className="w-3 h-3" />
                  {prompt.label}
                </Button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the research... / שאל על המחקר..."
              disabled={isStreaming}
              className="flex-1"
              data-testid="input-chat-message"
            />
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isStreaming}
              className="gap-1.5 bg-[#6443F4] hover:bg-[#5339D9] text-white border-0"
              data-testid="button-send-message"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
