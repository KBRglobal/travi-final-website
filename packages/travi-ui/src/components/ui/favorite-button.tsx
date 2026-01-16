import { Heart } from "lucide-react";
import { Button } from "./button";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FavoriteButtonProps {
  id: string;
  type: "attraction" | "hotel" | "restaurant" | "event" | "district" | "article";
  title: string;
  image?: string;
  slug: string;
  variant?: "icon" | "full";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FavoriteButton({
  id,
  type,
  title,
  image,
  slug,
  variant = "icon",
  size = "md",
  className,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const isActive = isFavorite(id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    toggleFavorite({ id, type, title, image, slug });

    toast({
      title: isActive ? "Removed from favorites" : "Added to favorites",
      description: isActive
        ? `${title} has been removed from your wishlist.`
        : `${title} has been added to your wishlist.`,
    });
  };

  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  if (variant === "full") {
    return (
      <Button
        variant={isActive ? "default" : "outline"}
        onClick={handleClick}
        className={cn(
          isActive && "bg-red-500 hover:bg-red-600 border-red-500",
          className
        )}
      >
        <Heart
          className={cn(
            iconSizes[size],
            "mr-2",
            isActive && "fill-current"
          )}
        />
        {isActive ? "Saved" : "Save"}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn(
        sizeClasses[size],
        "rounded-full transition-all duration-200",
        isActive
          ? "text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100"
          : "text-muted-foreground hover:text-red-500 hover:bg-red-50",
        className
      )}
      aria-label={isActive ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={cn(
          iconSizes[size],
          "transition-transform duration-200",
          isActive && "fill-current scale-110"
        )}
      />
    </Button>
  );
}

// Counter badge for nav
export function FavoritesCount({ className }: { className?: string }) {
  const { count } = useFavorites();

  if (count === 0) return null;

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
