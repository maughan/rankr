export default function Button({
  color = "white",
  textColor = "black",
  onClick,
  children,
}) {
  return (
    <button
      className={`font-bold bg-${color} text-${textColor} rounded-sm px-4 py-2`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
