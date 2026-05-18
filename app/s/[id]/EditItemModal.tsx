"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Upload, Trash2 } from "lucide-react";
import Modal from "@/app/components/modal";
import { TierItem } from "@/app/types";
import { useAppDispatch } from "@/lib/hooks";
import { baseApi } from "@/lib/api/baseApi";
import {
  useUpdateItemMutation,
  useDeleteItemImageMutation,
} from "@/lib/api/listsApi";
import { ImageKitLoader } from "@/lib/helpers";
import { S } from "@/app/content/strings";

interface Props {
  item: TierItem;
  listId: number;
  open: boolean;
  onClose: () => void;
  onDeleteRequest: (item: TierItem) => void;
}

type Screen = "edit" | "confirm-delete";

export default function EditItemModal({
  item,
  listId,
  open,
  onClose,
  onDeleteRequest,
}: Props) {
  const dispatch = useAppDispatch();
  const [screen, setScreen] = useState<Screen>("edit");
  const [name, setName] = useState(item.name ?? "");
  const [shortLabel, setShortLabel] = useState(item.short_label ?? "");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [updateItem, { isLoading: isSaving }] = useUpdateItemMutation();
  const [deleteItemImage, { isLoading: isDeletingImage }] =
    useDeleteItemImageMutation();

  useEffect(() => {
    if (open) {
      setScreen("edit");
      setName(item.name ?? "");
      setShortLabel(item.short_label ?? "");
    }
  }, [open, item]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error(S.items.nameEmpty);
      return;
    }
    if (trimmedName.length > 60) {
      toast.error(S.items.nameTooLong);
      return;
    }
    try {
      await updateItem({
        listId,
        itemId: item.id,
        name: trimmedName,
        short_label: shortLabel.trim(),
      }).unwrap();
      toast.success(S.items.updated);
      onClose();
    } catch (err: any) {
      const msg = err?.data?.error ?? "Failed to update item";
      toast.error(msg);
    }
  };

  const uploadImage = async (file: File) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.type)) {
      toast.error(S.items.imageTypeError);
      return;
    }
    if (file.size > 5 * 1_048_576) {
      toast.error(S.items.imageSizeError);
      return;
    }
    setIsUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/s/${listId}/items/${item.id}/image`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      dispatch(
        baseApi.util.invalidateTags([{ type: "List" as const, id: listId }])
      );
      toast.success(S.items.imageAdded);
    } catch (err: any) {
      toast.error(err?.message ?? S.items.imageUploadFailed);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadImage(file);
  };

  const handleRemoveImage = async () => {
    try {
      await deleteItemImage({ listId, itemId: item.id }).unwrap();
      toast.success(S.items.imageRemoved);
    } catch {
      toast.error(S.items.imageRemoveFailed);
    }
  };

  const handleConfirmDelete = () => {
    onDeleteRequest(item);
    onClose();
  };

  const rankingCount = item.rankings?.length ?? 0;

  return (
    <Modal open={open} handleClose={onClose}>
      {screen === "edit" ? (
        <div className="p-6 flex flex-col gap-4 w-full">
          <p className="text-rk-primary text-[17px] font-[500]">Edit item</p>

          {/* Image upload area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative h-24 rounded-[8px] border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
              isDragging
                ? "border-rk-accent bg-rk-accent/5"
                : "border-rk-stroke hover:border-rk-muted"
            }`}
          >
            {item.img ? (
              <>
                <Image
                  loader={ImageKitLoader}
                  src={item.img}
                  alt=""
                  fill
                  sizes="400px"
                  className="rounded-[6px] object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-[6px]">
                  <span className="text-white text-[12px] font-[500]">
                    Replace image
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-rk-muted pointer-events-none">
                <Upload size={16} />
                <span className="text-[12px]">
                  Drop image or click to upload
                </span>
              </div>
            )}
            {isUploadingImage && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-[6px]">
                <div className="w-4 h-4 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin" />
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
          />

          {item.img && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage();
              }}
              disabled={isDeletingImage}
              className="text-[12px] text-rk-muted hover:text-rk-secondary transition-colors self-start disabled:opacity-50"
            >
              {isDeletingImage ? "Removing…" : "Remove image"}
            </button>
          )}

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest">
              Name
            </label>
            <input
              className="bg-rk-row border border-rk-stroke rounded-[8px] px-3 py-2.5 text-rk-primary text-[13px] outline-none placeholder:text-rk-tertiary focus:border-rk-muted transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoFocus
            />
          </div>

          {/* Short label */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest">
              Short label{" "}
              <span className="normal-case font-normal text-rk-muted">
                (leave empty to auto-derive)
              </span>
            </label>
            <input
              className="bg-rk-row border border-rk-stroke rounded-[8px] px-3 py-2.5 text-rk-primary text-[13px] outline-none placeholder:text-rk-tertiary focus:border-rk-muted transition-colors w-24 uppercase"
              value={shortLabel}
              onChange={(e) =>
                setShortLabel(e.target.value.toUpperCase().slice(0, 3))
              }
              maxLength={3}
              placeholder="ABC"
            />
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={() => setScreen("confirm-delete")}
              className="flex items-center gap-1.5 text-[13px] text-red-400 hover:text-red-300 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              Delete item
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && (
                  <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin flex-shrink-0" />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 flex flex-col gap-4 w-full">
          <p className="text-rk-primary text-[17px] font-[500]">Delete item?</p>
          <p className="text-[13px] text-rk-secondary">
            <span className="font-[500] text-rk-primary">
              {item.name ?? "This item"}
            </span>{" "}
            will be permanently removed
            {rankingCount > 0
              ? `, along with ${rankingCount} ranking${
                  rankingCount !== 1 ? "s" : ""
                }`
              : ""}
            .
          </p>
          <p className="text-[12px] text-rk-muted">
            You&apos;ll have 5 seconds to undo.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setScreen("edit")}
              className="px-4 py-2 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 text-[13px] font-[500] bg-red-500 text-white rounded-[8px] hover:bg-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
