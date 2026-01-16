import { Link } from "wouter";
import logotypePrimary from "@assets/Logotype_Primary_1765497703861.png";
import logotypeDark from "@assets/Logotype_for_Dark_Background_1765497703861.png";
import logotypeLight from "@assets/Logotype_for_Light_Background_1765497703861.png";
import fullLogoDark from "@assets/Full_Logo_for_Dark_Background_1765497703860.png";
import fullLogoLight from "@assets/Full_Logo_for_Light_Background_1765497703861.png";
import mascotDark from "@assets/Mascot_for_Dark_Background_1765497703861.png";
import mascotLight from "@assets/Mascot_for_Light_Background_1765497703861.png";

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
      return variant === "dark-bg" ? fullLogoDark : fullLogoLight;
    }
    if (type === "mascot") {
      return variant === "dark-bg" ? mascotDark : mascotLight;
    }
    if (variant === "dark-bg") return logotypeDark;
    if (variant === "light-bg") return logotypeLight;
    return logotypePrimary;
  };

  const logoImg = (
    <img 
      src={getLogoSrc()} 
      alt="TRAVI" 
      style={{ height: `${height}px` }}
      className={`object-contain ${className}`}
      data-testid="img-logo"
    />
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="flex items-center">
        {logoImg}
      </Link>
    );
  }

  return logoImg;
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
      src={variant === "dark-bg" ? mascotDark : mascotLight} 
      alt="TRAVI Mascot" 
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`object-contain ${className}`}
      data-testid="img-mascot"
    />
  );
}
