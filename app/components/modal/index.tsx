import { X } from "lucide-react";
import { useEffect } from "react";

export default function Modal({
  handleClose,
  open,
  children,
}: {
  handleClose: any;
  open: boolean;
  children: any;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return !open ? null : (
    <>
      <div
        className="fixed inset-0 z-[998] bg-black/50 flex items-center justify-center p-3"
        onClick={handleClose}
      />
      <div
        className="max-h-[90%] z-[999] sm:w-[480px] overflow-auto rounded-[10px] fixed inset-0 m-auto mx-3 h-fit sm:mx-auto"
        style={{ backgroundColor: "#142036", border: "1px solid #1E2C44" }}
      >
        <div className="w-full relative">
          {children}

          <X
            size={16}
            className="absolute top-3 right-3 cursor-pointer text-[#6E7A92] hover:text-[#E0E6F0] transition-colors"
            onClick={handleClose}
          />
        </div>
      </div>
    </>
  );
}
