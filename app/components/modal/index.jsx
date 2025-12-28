import { X } from "lucide-react";

export default function Modal({ handleClose, open, children }) {
  return !open ? null : (
    <>
      <div className="fixed inset-0 z-998 bg-white opacity-40" />

      <div
        className="fixed inset-0 z-999 flex items-center justify-center"
        onClick={handleClose}
      >
        <div className="bg-black max-h-[90%] w-[90%] sm:w-[60%] rounded-sm overflow-auto relative">
          <div className="w-full relative">
            {children}

            <X
              className="absolute top-2 right-2 cursor-pointer"
              onClick={handleClose}
            />
          </div>
        </div>
      </div>
    </>
  );
}
