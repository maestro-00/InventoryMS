type Listener = () => void;

let cartActive = false;
let preparedShiftActive = false;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export function isPosLocationSwitchBlocked(): boolean {
  return cartActive || preparedShiftActive;
}

export function getPosLocationGuardState(): {
  cartActive: boolean;
  preparedShiftActive: boolean;
} {
  return { cartActive, preparedShiftActive };
}

export function setPosCartActive(active: boolean): void {
  if (cartActive === active) return;
  cartActive = active;
  emit();
}

export function setPosPreparedShiftActive(active: boolean): void {
  if (preparedShiftActive === active) return;
  preparedShiftActive = active;
  emit();
}

export function clearPosLocationGuard(): void {
  if (!cartActive && !preparedShiftActive) return;
  cartActive = false;
  preparedShiftActive = false;
  emit();
}

export function subscribePosLocationGuard(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
