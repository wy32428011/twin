/**
 * useListenRef
 */
import { useRef, MutableRefObject } from "react";

export function useListenRef<T = any>(state: T): MutableRefObject<T> {
  const ref = useRef(state);
  ref.current = state;
  return ref;
}
