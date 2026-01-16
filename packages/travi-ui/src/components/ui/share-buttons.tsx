import { useState } from "react";
import { Share2, Copy, Check, Facebook, Twitter, Mail, MessageCircle } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonsProps {
  url?: string;
  title: string;
  description?: string;
  variant?: "icon" | "full";
  className?: string;
}

export function ShareButtons({
  url = typeof window !== "undefined" ? window.location.href : "",
  title,
  description = "",
  variant = "icon",
  className,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A%0A${encodedUrl}`,
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copied!", description: "The link has been copied to your clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const openShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], "_blank", "width=600,height=400");
  };

  // Try native share API first on mobile
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description, url });
      } catch (err) {
        // User cancelled or error
      }
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={variant === "icon" ? "icon" : "default"}
          className={className}
          onClick={hasNativeShare ? handleNativeShare : undefined}
        >
          <Share2 className="w-4 h-4" />
          {variant === "full" && <span className="ml-2">Share</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => openShare("facebook")}>
          <Facebook className="w-4 h-4 mr-2 text-blue-600" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openShare("twitter")}>
          <Twitter className="w-4 h-4 mr-2 text-sky-500" />
          Twitter / X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openShare("whatsapp")}>
          <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openShare("email")}>
          <Mail className="w-4 h-4 mr-2 text-gray-600" />
          Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyToClipboard}>
          {copied ? (
            <Check className="w-4 h-4 mr-2 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          Copy Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
