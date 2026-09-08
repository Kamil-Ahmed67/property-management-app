import { useRef } from 'react';
import { getScrollOffset, saveScrollOffset } from '../utils/scrollMemory';
// Returns props to spread onto a ScrollView/FlatList so it restores its
// last offset on mount and keeps recording as the user scrolls.
//
// Usage:
//   const scrollProps = useScrollMemory('expense-list');
//   <ScrollView {...scrollProps}>...</ScrollView>
export function useScrollMemory(key) {
  const ref = useRef(null);
  // Restore once only. Content height keeps changing as data arrives and
  // fonts settle; re-applying on every change would yank the user around
  // mid-scroll.
  const hasRestored = useRef(false);

  function handleScroll(event) {
    saveScrollOffset(key, event.nativeEvent.contentOffset.y);
  }

  function handleContentSizeChange(width, height) {
    if (hasRestored.current) return;

    const saved = getScrollOffset(key);
    if (saved <= 0) {
      hasRestored.current = true;
      return;
    }

    // Wait until the content is actually tall enough to hold the offset,
    // otherwise scrollTo silently clamps and lands in the wrong place.
    if (height > saved) {
      ref.current?.scrollTo?.({ y: saved, animated: false });
      hasRestored.current = true;
    }
  }

  return {
    ref,
    onScroll: handleScroll,
    scrollEventThrottle: 16,
    onContentSizeChange: handleContentSizeChange,
  };
}