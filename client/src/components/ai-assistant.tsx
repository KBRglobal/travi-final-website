import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Lightbulb,
  FileText,
  Hash,
  PenLine,
  Minimize2,
  Maximize2,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  contents: string;
  timestamp: Date;
}

interface SuggestionChip {
  icon: typeof Sparkles;
  label: string;
  prompt: string;
}

const suggestions: SuggestionChip[] = [
  {
    icon: Lightbulb,
    label: "Topic ideas",
    prompt: "Suggest 5 engaging article topics about Dubai travel for tourists",
  },
  {
    icon: FileText,
    label: "Content outline",
    prompt: "Create a contents outline for a Dubai travel guide article",
  },
  {
    icon: Hash,
    label: "SEO keywords",
    prompt: "Suggest SEO keywords for Dubai tourism contents",
  },
  {
    icon: PenLine,
    label: "Writing tips",
    prompt: "Give me tips for writing engaging travel contents",
  },
];

export function AIAssistant() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("POST", "/api/ai/assistant", { prompt });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      return data;
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        contents: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error) => {
      toast({
        title: "AI Assistant Error",
        description: error.message || "Failed to get response. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      contents: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(input.trim());
    setInput("");
  };

  const handleSuggestionClick = (prompt: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      contents: prompt,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        size="icon"
        className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg"
        onClick={() => setIsOpen(true)}
        data-testid="button-ai-assistant-open"
      >
        <Sparkles className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Card
      className={`fixed z-50 shadow-xl transition-all duration-200 ${
        isExpanded
          ? "bottom-4 right-4 left-4 top-20 md:left-auto md:w-[600px] md:h-[80vh]"
          : "bottom-6 right-6 w-[380px] h-[500px]"
      }`}
      data-testid="card-ai-assistant"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 border-b">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base">AI Assistant</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="button-ai-assistant-expand"
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            data-testid="button-ai-assistant-close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col p-0 h-[calc(100%-60px)]">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Hi! I'm your AI assistant. I can help you with contents ideas,
                writing tips, SEO optimization, and more.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.label}
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleSuggestionClick(suggestion.prompt)}
                    disabled={chatMutation.isPending}
                    data-testid={`button-suggestion-${suggestion.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <suggestion.icon className="h-3.5 w-3.5" />
                    {suggestion.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                    data-testid={`message-${message.role}-${message.id}`}
                  >
                    <p className="whitespace-pre-wrap">{message.contents}</p>
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about contents creation..."
              className="min-h-[40px] max-h-[100px] resize-none"
              rows={1}
              disabled={chatMutation.isPending}
              data-testid="input-ai-assistant-message"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
              data-testid="button-ai-assistant-send"
            >
              {chatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
