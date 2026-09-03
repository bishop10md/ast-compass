type LogoVariant = "full" | "icon" | "compact";
type LogoTone = "light" | "dark";

type ASTCompassLogoProps = {
  variant?: LogoVariant;
  tone?: LogoTone;
  className?: string;
  decorative?: boolean;
};

export function ASTCompassLogo({ variant = "full", tone = "light", className = "", decorative = false }: ASTCompassLogoProps) {
  const icon = <svg className="ast-logo-icon" viewBox="0 0 48 48" role={decorative ? undefined : "img"} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : "AST Compass"}>
    <circle cx="24" cy="24" r="21" fill="#dcefe7" stroke="#176b5b" strokeWidth="2"/>
    <circle cx="24" cy="24" r="17.5" fill="#ffffff" stroke="#ffffff" strokeWidth="2"/>
    <path d="M24 5.5v37M5.5 24h37" stroke="#176b5b" strokeWidth="1" opacity=".55"/>
    <circle cx="15" cy="15" r="4" fill="#ffffff" stroke="#5c9b89" strokeWidth="2"/>
    <circle cx="34" cy="18" r="3" fill="#ffffff" stroke="#5c9b89" strokeWidth="2"/>
    <circle cx="33" cy="34" r="4.5" fill="#ffffff" stroke="#5c9b89" strokeWidth="2"/>
    <g transform="rotate(36 24 24)">
      <path d="M24 7l5 17H19z" fill="#d88731"/>
      <circle cx="24" cy="24" r="4.5" fill="#173f39" stroke="#ffffff" strokeWidth="2"/>
    </g>
  </svg>;

  return <span className={`ast-logo ast-logo--${variant} ast-logo--${tone} ${className}`.trim()}>
    {icon}
    {variant !== "icon" && <span className="ast-logo-copy"><b>AST Compass</b>{variant === "full" && <small>From organism to mechanism to interpretation.</small>}</span>}
  </span>;
}
