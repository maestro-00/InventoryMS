type Listener = () => void;

let pendingSaleCount = 0;
const listeners = new Set<Listener>();

export function getPendingSaleCount(): number {
  return pendingSaleCount;
}

export function setPendingSaleCount(count: number): void {
  if (pendingSaleCount === count) return;
  pendingSaleCount = count;
  for (const listener of listeners) listener();
}

export function subscribePendingSaleCount(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
