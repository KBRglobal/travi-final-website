import { Link } from "wouter";

interface LogoProps {
  className?: string;
  variant?: "primary" | "dark-bg" | "light-bg";
  type?: "logotype" | "full" | "mascot";
  height?: number;
  linkTo?: string | null;
}

export function Logo({ 
  className = "", 
  variant = "primary", 
  type = "logotype",
  height = 32,
  linkTo = "/"
}: LogoProps) {
  const getLogoSrc = () => {
    if (type === "full") {
      if (variant === "dark-bg") return "/logos/Full_Logo_for_Dark_Background.svg";
      return "/logos/Full_Logo_for_Light_Background.svg";
    }
    if (variant === "dark-bg") return "/logos/Logotype_for_Dark_Background.svg";
    if (variant === "light-bg") return "/logos/Logotype_for_Light_Background.svg";
    return "/logos/Logotype_Primary.svg";
  };

  const logoContent = (
    <div 
      className={`flex items-center ${className}`}
      style={{ height: `${height}px` }}
      data-testid="img-logo"
    >
      <img 
        src={getLogoSrc()}
        alt="TRAVI"
        style={{ height: `${height}px`, width: "auto" }}
        className="flex-shrink-0"
      />
    </div>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="flex items-center">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}

export function Mascot({ 
  className = "", 
  variant = "light-bg",
  size = 48
}: { 
  className?: string; 
  variant?: "dark-bg" | "light-bg";
  size?: number;
}) {
  return (
    <img 
      src="/logos/Mascot_for_Dark_Background.png"
      alt="Travi the Duck mascot"
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`object-contain ${className}`}
      data-testid="img-mascot"
    />
  );
}
