/**
 * useEffectOnce
 * @description run only while mount.
 */
import { EffectCallback, useEffect } from "react";

export function useEffectOnce(effect: EffectCallback) {
  useEffect(effect, []);
}
