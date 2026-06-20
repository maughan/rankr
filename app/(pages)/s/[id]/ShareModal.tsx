"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, RefreshCw, Link2, Users, Plus, Trash2 } from "lucide-react";
import { formatDistanceStrict } from "date-fns";

import Modal from "@/app/components/modal";
import { S } from "@/app/content/strings";
import {
  useGetShareStatsQuery,
  useEnableShareMutation,
  useDisableShareMutation,
  useUpdateShareMutation,
  useGetInvitesQuery,
  useCreateInviteMutation,
  useRevokeInviteMutation,
} from "@/lib/api/listsApi";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  listId: number;
  visibility: string;
  open: boolean;
  onClose: () => void;
}

// ── Invite link row ──────────────────────────────────────────────────────────

function InviteRow({
  invite,
  onRevoke,
  isRevoking,
}: {
  invite: { id: number; invite_url: string; created_at: string };
  onRevoke: () => void;
  isRevoking: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const age =
    formatDistanceStrict(new Date(invite.created_at), new Date()) + " ago";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(invite.invite_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0 px-3 py-2 rounded-[8px] bg-rk-row border border-rk-stroke flex flex-col gap-0.5">
        <span className="text-[11px] text-rk-muted font-mono truncate select-all">
          {invite.invite_url}
        </span>
        <span className="text-[10px] text-rk-tertiary">{age}</span>
      </div>
      <button
        onClick={handleCopy}
        title={copied ? "Copied!" : "Copy"}
        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-[8px] bg-rk-surface border border-rk-stroke hover:border-rk-muted transition-colors"
      >
        {copied ? (
          <Check size={13} className="text-green-400" />
        ) : (
          <Copy size={13} className="text-rk-muted" />
        )}
      </button>
      <button
        onClick={onRevoke}
        disabled={isRevoking}
        title={S.invites.removeLabel}
        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-[8px] border border-rk-stroke hover:border-red-900/60 hover:text-red-400 text-rk-muted transition-colors disabled:opacity-40"
      >
        {isRevoking ? (
          <div className="w-3 h-3 rounded-full border-[1.5px] border-rk-muted/30 border-t-rk-muted animate-spin" />
        ) : (
          <Trash2 size={13} />
        )}
      </button>
    </div>
  );
}

// ── Private invite panel ─────────────────────────────────────────────────────

function InvitePanel({ listId }: { listId: number }) {
  const { data: invites = [], isLoading } = useGetInvitesQuery(listId);
  const [createInvite, { isLoading: isCreating }] = useCreateInviteMutation();
  const [revokeInvite] = useRevokeInviteMutation();
  const [revokingIds, setRevokingIds] = useState<Set<number>>(new Set());

  const handleCreate = async () => {
    try {
      await createInvite(listId).unwrap();
    } catch {
      toast.error(S.invites.createFailed);
    }
  };

  const handleRevoke = async (inviteId: number) => {
    setRevokingIds((s) => new Set(s).add(inviteId));
    try {
      await revokeInvite({ listId, inviteId }).unwrap();
    } catch {
      toast.error(S.invites.revokeFailed);
    } finally {
      setRevokingIds((s) => {
        const next = new Set(s);
        next.delete(inviteId);
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-rk-muted leading-relaxed">
        {S.invites.sectionHint}
      </p>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="w-4 h-4 rounded-full border-[1.5px] border-rk-stroke border-t-rk-accent animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {invites.length === 0 && (
            <p className="text-[12px] text-rk-tertiary">{S.invites.emptyHint}</p>
          )}
          {invites.map((inv) => (
            <InviteRow
              key={inv.id}
              invite={inv}
              onRevoke={() => handleRevoke(inv.id)}
              isRevoking={revokingIds.has(inv.id)}
            />
          ))}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={isCreating}
        className="flex items-center gap-2 self-start px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
      >
        {isCreating ? (
          <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin flex-shrink-0" />
        ) : (
          <Plus size={14} />
        )}
        {S.invites.createCta}
      </button>
    </div>
  );
}

// ── Public share-link panel ──────────────────────────────────────────────────

function ShareLinkPanel({ listId, onClose }: { listId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const listKey = ["list", listId] as const;

  const { data: stats, isLoading } = useGetShareStatsQuery(listId);
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
      queryClient.invalidateQueries({ queryKey: listKey });
    } catch {
      toast.error(S.share.linkCreateFailed);
    }
  };

  const handleDisable = async () => {
    try {
      await disableShare(listId).unwrap();
      queryClient.invalidateQueries({ queryKey: listKey });
    } catch {
      toast.error(S.share.linkDisableFailed);
    }
  };

  const handleRotate = async () => {
    try {
      await updateShare({ listId, rotate: true }).unwrap();
      queryClient.invalidateQueries({ queryKey: listKey });
      setCopied(false);
      toast.success(S.share.linkRotated);
    } catch {
      toast.error(S.share.linkRotateFailed);
    }
  };

  const handleToggleAnon = async () => {
    if (!stats) return;
    try {
      await updateShare({
        listId,
        anonymous_rankings_enabled: !stats.anonymous_rankings_enabled,
      }).unwrap();
      queryClient.invalidateQueries({ queryKey: listKey });
    } catch {
      toast.error(S.share.settingsUpdateFailed);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-5 h-5 rounded-full border-[1.5px] border-rk-stroke border-t-rk-accent animate-spin" />
      </div>
    );
  }

  if (stats?.is_shareable) {
    return (
      <div className="flex flex-col gap-4">
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

        {stats.ranker_count > 0 && (
          <div className="flex items-center gap-1.5 text-[12px] text-rk-muted">
            <Users size={13} className="flex-shrink-0" />
            <span>
              {stats.ranker_count}{" "}
              {stats.ranker_count !== 1 ? "people" : "person"} stacked via this
              link
              {stats.anon_ranker_count > 0 &&
                ` · ${stats.anon_ranker_count} anonymous`}
            </span>
          </div>
        )}

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
              stats.anonymous_rankings_enabled ? "bg-rk-accent" : "bg-rk-stroke"
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
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-rk-muted leading-relaxed">
        {S.lists.shareDescription}
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
  );
}

// ── Modal shell ──────────────────────────────────────────────────────────────

export default function ShareModal({ listId, visibility, open, onClose }: Props) {
  const isPrivate = visibility === "private";

  return (
    <Modal open={open} handleClose={onClose}>
      <div className="p-6 pt-8 flex flex-col gap-5 w-full">
        <p className="text-rk-primary text-[17px] font-[500]">
          {isPrivate ? S.invites.sectionLabel : "Share stack"}
        </p>
        {open && (
          isPrivate
            ? <InvitePanel listId={listId} />
            : <ShareLinkPanel listId={listId} onClose={onClose} />
        )}
      </div>
    </Modal>
  );
}
