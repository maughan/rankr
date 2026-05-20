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
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return !open ? null : (
    <>
      <div className="fixed inset-0 z-[998] bg-black/50" />

      <div
        className="fixed inset-0 z-[999] flex items-center justify-center px-4"
        onClick={handleClose}
      >
        <div
          className="max-h-[90%] w-full sm:w-[480px] overflow-auto relative rounded-[10px]"
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
      </div>
    </>
  );
}
