type ButtonType = "primary" | "secondary" | "tertiary";

interface ButtonProps {
  cssClass?: string;
  onClick: any;
  disabled?: boolean;
  children: any;
  type: ButtonType;
}

export default function Button({
  cssClass,
  onClick,
  disabled = false,
  children,
  type,
}: ButtonProps) {
  let baseClass =
    "px-3 py-1.5 text-[13px] font-[500] rounded-[8px] hover:opacity-90 transition-opacity cursor-pointer";

  const getStyleForType = (type: ButtonType) => {
    switch (type) {
      case "primary":
        return "bg-rk-accent text-white";
      case "secondary":
        return "text-rk-secondary border border-rk-stroke hover:border-rk-secondary hover:text-rk-primary";
      case "tertiary":
        return "bg-transparent text-rk-secondary hover:text-rk-primary transition-colors cursor-pointer";
      default:
        return "";
    }
  };

  return (
    <button
      className={`${baseClass} ${getStyleForType(type)} ${cssClass}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
