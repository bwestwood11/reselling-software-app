"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient, signOut, useSession } from "@repo/auth/client";
import { useSubscription } from "@/hooks/use-subscription";
import { uploadApi } from "@/lib/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Camera,
  Check,
  ChevronRight,
  Loader2,
  LogOut,
  Mail,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  CalendarDays,
  Zap,
  CreditCard,
  Sparkles,
  Chrome,
  Trash2,
  AlertTriangle,
} from "lucide-react";

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function formatDate(value: string | Date | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Human-readable fallback for known better-auth error codes that need extra context. */
function describeAuthError(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";
  if (error.code === "SESSION_EXPIRED") {
    return "Your session isn't recent enough for this. Sign out, sign back in, and try again.";
  }
  return error.message ?? "Something went wrong. Please try again.";
}

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free Trial",
  SIDE_HUSTLE: "Side Hustle",
  FULL_TIME: "Full-Time",
  ENTERPRISE: "Enterprise",
};

export default function ProfilePage() {
  const router = useRouter();
  const { data: sessionData, isPending: sessionLoading, refetch: refetchSession } = useSession();
  const { data: subData } = useSubscription();
  const user = sessionData?.user;
  const subscription = subData?.data;

  const { data: accountsData } = useQuery({
    queryKey: ["auth", "accounts"],
    queryFn: async () => {
      const { data } = await authClient.listAccounts();
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
  const hasPasswordLogin = accountsData?.some((a) => a.providerId === "credential") ?? true;
  const linkedProviders = (accountsData ?? []).filter((a) => a.providerId !== "credential");

  // ─── Profile (name + avatar) ────────────────────────────────────────────
  const [name, setName] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.name && !nameDirty) setName(user.name);
  }, [user?.name, nameDirty]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === user?.name) return;
    setSavingName(true);
    const { error } = await authClient.updateUser({ name: trimmed });
    setSavingName(false);
    if (error) {
      toast.error(describeAuthError(error));
      return;
    }
    await refetchSession();
    setNameDirty(false);
    toast.success("Profile updated");
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { url } = await uploadApi.uploadImage(file);
      const { error } = await authClient.updateUser({ image: url });
      if (error) {
        toast.error(describeAuthError(error));
        return;
      }
      await refetchSession();
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  // ─── Password ────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    setChangingPassword(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setChangingPassword(false);
    if (error) {
      toast.error(describeAuthError(error));
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated. You've been kept signed in on this device.");
  }

  // ─── Delete account ──────────────────────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  function closeDeleteDialog() {
    if (deletingAccount) return;
    setDeleteDialogOpen(false);
    setDeletePassword("");
    setDeleteConfirmText("");
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      toast.error('Type "DELETE" to confirm');
      return;
    }
    if (hasPasswordLogin && !deletePassword) {
      toast.error("Enter your password to confirm");
      return;
    }
    setDeletingAccount(true);
    const { error } = await authClient.deleteUser(
      hasPasswordLogin ? { password: deletePassword } : {}
    );
    setDeletingAccount(false);
    if (error) {
      toast.error(describeAuthError(error));
      return;
    }
    toast.success("Your account has been deleted");
    router.push("/login");
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (sessionLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading profile…
      </div>
    );
  }

  if (!user) return null;

  const totalCredits = subscription ? subscription.aiCredits + subscription.bonusAiCredits : 0;
  const planLabel = subscription?.plan ? (PLAN_LABELS[subscription.plan] ?? subscription.plan) : "No plan";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your account details and security.</p>
      </div>

      {/* Identity card — decorative gradient strip only; all text/avatar sit in the white
          section below it so nothing loses contrast against the gradient. */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="h-14 bg-gradient-to-r from-orange-500 to-amber-500" />
        <div className="px-6 pb-6 pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="group relative shrink-0">
                <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl bg-zinc-100 text-xl font-semibold text-zinc-500 shadow-sm ring-1 ring-zinc-200">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    initials(user.name)
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 grid place-items-center bg-black/40">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-zinc-900 text-white shadow-sm transition-transform hover:scale-105 disabled:opacity-50"
                  aria-label="Change profile photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-zinc-900">{user.name}</h2>
                  {subscription && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                      <Sparkles className="h-3 w-3" />
                      {planLabel}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-500">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                  {user.emailVerified ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      unverified
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <CalendarDays className="h-3.5 w-3.5" />
              Member since {formatDate(user.createdAt)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left column: editable settings */}
        <div className="space-y-8 lg:col-span-2">
          {/* Basic info */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-zinc-900">Basic information</h3>
            <p className="mt-1 text-sm text-zinc-500">
              This name appears across ReList — on listings you publish and in your workspace.
            </p>
            <form onSubmit={handleSaveName} className="mt-5 space-y-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameDirty(true);
                  }}
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Email address
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-500 outline-none"
                />
                <p className="mt-1.5 text-xs text-zinc-400">
                  Contact support to change the email on your account.
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingName || !name.trim() || name.trim() === user.name}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_16px_-8px_rgba(249,115,22,0.7)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {savingName ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Save changes
                </button>
              </div>
            </form>
          </section>

          {/* Security */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-zinc-400" />
              <h3 className="text-base font-semibold text-zinc-900">Security</h3>
            </div>

            {hasPasswordLogin ? (
              <>
                <p className="mt-1 text-sm text-zinc-500">
                  Choose a strong password you don&apos;t use anywhere else. Updating it signs
                  you out of every other device.
                </p>
                <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
                  <div>
                    <label
                      htmlFor="currentPassword"
                      className="mb-1.5 block text-sm font-medium text-zinc-700"
                    >
                      Current password
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="newPassword"
                        className="mb-1.5 block text-sm font-medium text-zinc-700"
                      >
                        New password
                      </label>
                      <input
                        id="newPassword"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                        placeholder="At least 8 characters"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="mb-1.5 block text-sm font-medium text-zinc-700"
                      >
                        Confirm new password
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                        placeholder="Repeat new password"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={
                        changingPassword || !currentPassword || !newPassword || !confirmPassword
                      }
                      className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {changingPassword ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="h-4 w-4" />
                      )}
                      Update password
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-zinc-50 px-4 py-3.5">
                <Chrome className="h-5 w-5 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-700">
                    Signed in with {linkedProviders[0]?.providerId ?? "a social account"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Your account doesn&apos;t use a password — manage access from your provider.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Danger zone */}
          <section className="rounded-2xl border border-red-100 bg-red-50/40 p-6">
            <h3 className="text-base font-semibold text-red-900">Danger zone</h3>
            <p className="mt-1 text-sm text-red-700/80">
              Deleting your account permanently removes your inventory, listings, and marketplace
              connections. This can&apos;t be undone.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
              <button
                onClick={() => setDeleteDialogOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete account
              </button>
            </div>
          </section>
        </div>

        {/* Right column: plan summary */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Plan
              </h3>
              <Link
                href="/settings/billing"
                className="text-xs font-medium text-orange-600 hover:text-orange-700"
              >
                Manage
              </Link>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900">{planLabel}</p>
                <p className="text-xs text-zinc-500">
                  {subscription?.isTrialing
                    ? `Trial ends ${formatDate(subscription.trialEndsAt ?? undefined)}`
                    : subscription?.isActive
                      ? "Active subscription"
                      : "No active subscription"}
                </p>
              </div>
            </div>
            {subscription && (
              <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-zinc-600">
                    <Zap className="h-3.5 w-3.5 text-orange-500" />
                    AI credits
                  </span>
                  <span className="font-semibold tabular-nums text-zinc-900">
                    {totalCredits.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600">Inventory used</span>
                  <span className="font-semibold tabular-nums text-zinc-900">
                    {subscription.inventoryUsed.toLocaleString()} /{" "}
                    {subscription.inventoryLimit.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            <Link
              href="/settings/billing"
              className="mt-4 flex items-center justify-center gap-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              View billing
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Quick links
            </h3>
            <div className="mt-3 space-y-1">
              <Link
                href="/settings/marketplaces"
                className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                Marketplace connections
                <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
              </Link>
              <Link
                href="/settings"
                className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                All settings
                <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/* Delete account confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent className="max-w-md rounded-2xl bg-white p-6 sm:max-w-md">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900">Delete your account?</h3>
              <p className="mt-1 text-sm text-zinc-500">
                This permanently deletes your inventory, listings, and marketplace connections.
                There&apos;s no undo.
              </p>
            </div>
          </div>
          <form onSubmit={handleDeleteAccount} className="mt-5 space-y-4">
            {hasPasswordLogin && (
              <div>
                <label
                  htmlFor="deletePassword"
                  className="mb-1.5 block text-sm font-medium text-zinc-700"
                >
                  Confirm your password
                </label>
                <input
                  id="deletePassword"
                  type="password"
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  placeholder="••••••••"
                />
              </div>
            )}
            <div>
              <label
                htmlFor="deleteConfirm"
                className="mb-1.5 block text-sm font-medium text-zinc-700"
              >
                Type <span className="font-mono font-semibold text-red-600">DELETE</span> to
                confirm
              </label>
              <input
                id="deleteConfirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-red-400 focus:ring-2 focus:ring-red-100"
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={deletingAccount}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  deletingAccount ||
                  deleteConfirmText.trim().toUpperCase() !== "DELETE" ||
                  (hasPasswordLogin && !deletePassword)
                }
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deletingAccount ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete my account
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
