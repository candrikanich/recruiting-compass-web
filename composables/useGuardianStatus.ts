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

  const isPending = computed(() => status.value?.pending === true);

  /**
   * True when outbound features must be disabled. Identical to `isPending` today; kept
   * distinct so the lock can diverge from the banner later (e.g. the 21-day freeze, which
   * restricts more than the pending state does) without touching every call site.
   */
  const isLocked = computed(() => isPending.value);

  const resend = async (guardianEmail?: string) => {
    await $fetchAuth("/api/guardian/resend", {
      method: "POST",
      body: guardianEmail ? { guardianEmail } : {},
    });
    await load(true);
  };

  return {
    status,
    isPending,
    isLocked,
    guardianEmailMasked: computed(() => status.value?.guardianEmailMasked ?? null),
    load,
    resend,
  };
};
