"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, RefreshCw, Link2, Users } from "lucide-react";

import Modal from "@/app/components/modal";
import {
  useGetShareStatsQuery,
  useEnableShareMutation,
  useDisableShareMutation,
  useUpdateShareMutation,
} from "@/lib/api/listsApi";

interface Props {
  listId: number;
  open: boolean;
  onClose: () => void;
}

export default function ShareModal({ listId, open, onClose }: Props) {
  const { data: stats, isLoading } = useGetShareStatsQuery(listId, {
    skip: !open,
  });

  const [enableShare, { isLoading: isEnabling }] = useEnableShareMutation();
  const [disableShare, { isLoading: isDisabling }] = useDisableShareMutation();
  const [updateShare, { isLoading: isUpdating }] = useUpdateShareMutation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!stats?.share_url) return;
    await navigator.clipboard.writeText(stats.share_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnable = async () => {
    try {
      await enableShare(listId).unwrap();
    } catch {
      toast.error("Failed to create share link.");
    }
  };

  const handleDisable = async () => {
    try {
      await disableShare(listId).unwrap();
    } catch {
      toast.error("Failed to disable sharing.");
    }
  };

  const handleRotate = async () => {
    try {
      await updateShare({ listId, rotate: true }).unwrap();
      setCopied(false);
      toast.success("Share link rotated.");
    } catch {
      toast.error("Failed to rotate link.");
    }
  };

  const handleToggleAnon = async () => {
    if (!stats) return;
    try {
      await updateShare({
        listId,
        anonymous_rankings_enabled: !stats.anonymous_rankings_enabled,
      }).unwrap();
    } catch {
      toast.error("Failed to update settings.");
    }
  };

  return (
    <Modal open={open} handleClose={onClose}>
      <div className="p-6 pt-8 flex flex-col gap-5 w-[360px] md:w-full">
        <p className="text-rk-primary text-[17px] font-[500]">Share list</p>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 rounded-full border-[1.5px] border-rk-stroke border-t-rk-accent animate-spin" />
          </div>
        ) : stats?.is_shareable ? (
          <div className="flex flex-col gap-4">
            {/* Share URL row */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 px-3 py-2 rounded-[8px] bg-rk-row border border-rk-stroke text-[12px] text-rk-muted font-mono truncate select-all">
                {stats.share_url}
              </div>
              <button
                onClick={handleCopy}
                title={copied ? "Copied!" : "Copy link"}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-[8px] bg-rk-surface border border-rk-stroke hover:border-rk-muted transition-colors"
              >
                {copied ? (
                  <Check size={14} className="text-green-400" />
                ) : (
                  <Copy size={14} className="text-rk-muted" />
                )}
              </button>
            </div>

            {/* Ranker count */}
            {stats.ranker_count > 0 && (
              <div className="flex items-center gap-1.5 text-[12px] text-rk-muted">
                <Users size={13} className="flex-shrink-0" />
                <span>
                  {stats.ranker_count} person
                  {stats.ranker_count !== 1 ? "s" : ""} ranked via this link
                  {stats.anon_ranker_count > 0 &&
                    ` · ${stats.anon_ranker_count} anonymous`}
                </span>
              </div>
            )}

            {/* Anonymous rankings toggle */}
            <div className="flex items-center justify-between py-3 border-t border-rk-stroke">
              <div>
                <p className="text-[13px] text-rk-primary font-[500]">
                  Anonymous rankings
                </p>
                <p className="text-[11px] text-rk-tertiary mt-0.5">
                  Anyone with the link can submit
                </p>
              </div>
              <button
                onClick={handleToggleAnon}
                disabled={isUpdating}
                aria-checked={stats.anonymous_rankings_enabled}
                role="switch"
                className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 disabled:opacity-50 ${
                  stats.anonymous_rankings_enabled
                    ? "bg-rk-accent"
                    : "bg-rk-stroke"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    stats.anonymous_rankings_enabled
                      ? "translate-x-5"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Rotate / Disable */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRotate}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-[500] text-rk-muted border border-rk-stroke rounded-[8px] hover:border-rk-muted hover:text-rk-secondary transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isUpdating ? (
                  <div className="w-3 h-3 rounded-full border-[1.5px] border-rk-muted/30 border-t-rk-muted animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                Rotate link
              </button>

              <button
                onClick={handleDisable}
                disabled={isDisabling}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-[500] text-red-400 border border-red-900/40 rounded-[8px] hover:border-red-700/60 hover:text-red-300 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDisabling && (
                  <div className="w-3 h-3 rounded-full border-[1.5px] border-red-400/30 border-t-red-400 animate-spin flex-shrink-0" />
                )}
                Disable
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-rk-muted leading-relaxed">
              Create a link so anyone can view the community aggregate.
              Optionally let them submit anonymous rankings too.
            </p>
            <button
              onClick={handleEnable}
              disabled={isEnabling}
              className="flex items-center gap-2 self-start px-4 py-2.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {isEnabling ? (
                <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin flex-shrink-0" />
              ) : (
                <Link2 size={14} />
              )}
              Create share link
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
