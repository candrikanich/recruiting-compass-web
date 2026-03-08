import { timingSafeEqual } from "crypto";

/**
 * Compares two secret strings in constant time to prevent timing attacks.
 *
 * Returns false for empty strings or length mismatches without revealing
 * which condition failed — the length check short-circuit is safe here
 * because an attacker already knows the expected length is non-zero, and
 * timingSafeEqual would throw on mismatched lengths anyway.
 */
export function verifySharedSecret(provided: string, expected: string): boolean {
  if (!provided || !expected || provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}
