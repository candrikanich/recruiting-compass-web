import { computed } from "vue";
import { useState } from "#app";
import { useAuthFetch } from "~/composables/useAuthFetch";
import type { GuardianStatus } from "~/server/api/guardian/status.get";

/**
 * Guardian-confirmation state for the signed-in player.
 *
 * `isLocked` is the single switch every gated surface reads, so the capability matrix in
 * planning/2026-09-11-guardian-linked-signup-spec.md lives in one place rather than being
 * re-derived per component.
 */
export const useGuardianStatus = () => {
  const status = useState<GuardianStatus | null>("guardian-status", () => null);
  const loaded = useState<boolean>("guardian-status-loaded", () => false);
  const { $fetchAuth } = useAuthFetch();

  const load = async (force = false) => {
    if (loaded.value && !force) return status.value;
    try {
      status.value = await $fetchAuth<GuardianStatus>("/api/guardian/status");
    } catch {
      // Fail open: a status lookup that errors must not lock an adult out of their own
      // account. The DB gate and the server endpoints remain authoritative regardless.
      status.value = null;
    } finally {
      loaded.value = true;
    }
    return status.value;
  };

  const isPending = computed(() => status.value?.status === "pending");

  /**
   * True when outbound features must be disabled — mirrors the `locked` field from
   * server/api/guardian/status.get.ts, which is computed identically to
   * server/utils/guardianGate.ts's assertGuardianConfirmed.
   */
  const isLocked = computed(() => status.value?.locked === true);

  // "expired"/"revoked" get the same invite shape as "none": there is no live claim to
  // resend (resend()'s pending-claim lookup won't find one either), so every gated
  // surface must treat this as create-a-fresh-claim, not wait-for-the-existing-one.
  // Single source of truth — GuardianPendingBanner and GuardianLockedAction both read
  // this rather than each re-deriving it, which is how they drifted apart before.
  const hasNoGuardianYet = computed(() => {
    const currentStatus = status.value?.status;
    return (
      currentStatus === "none" ||
      currentStatus === "expired" ||
      currentStatus === "revoked"
    );
  });

  const resend = async (guardianEmail?: string) => {
    await $fetchAuth("/api/guardian/resend", {
      method: "POST",
      body: guardianEmail ? { guardianEmail } : {},
    });
    await load(true);
  };

  // `status`/`loaded` are app-level useState, so they survive a sign-out inside the same
  // SPA session. Call this from the sign-out path (stores/user.ts logout()) so the next
  // signed-in user's first load() refetches instead of reusing the previous user's cache.
  const reset = () => {
    status.value = null;
    loaded.value = false;
  };

  return {
    status,
    loaded,
    isPending,
    isLocked,
    hasNoGuardianYet,
    guardianEmailMasked: computed(() => status.value?.guardianEmailMasked ?? null),
    load,
    resend,
    reset,
  };
};
