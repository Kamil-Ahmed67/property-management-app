// Remembers each screen's scroll offset across mount/unmount.
//
// Screens here are swapped with conditional rendering, so leaving one
// unmounts it and every piece of its state — including scroll position —
// is thrown away. Keeping just the offset outside the component gets the
// position back on return, without keeping the whole screen alive (which
// would also freeze its data until something forces a refetch).

const offsets = new Map();

export function saveScrollOffset(key, offset) {
  offsets.set(key, offset);
}

export function getScrollOffset(key) {
  return offsets.get(key) || 0;
}

export function clearScrollOffset(key) {
  offsets.delete(key);
}

// Call on logout so a different account never inherits these positions.
export function clearAllScrollOffsets() {
  offsets.clear();
}