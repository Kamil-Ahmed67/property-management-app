import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Image, FlatList, StyleSheet, useWindowDimensions } from 'react-native';

const AUTO_SLIDE_INTERVAL = 3000;

export default function BannerSlider({ images, height }) {
  const { width } = useWindowDimensions();
  const listRef = useRef(null);
  const timerRef = useRef(null);
  const indexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // height is passed in already matching the artwork's real aspect ratio
  // (width * imageHeight/imageWidth), so "cover" below never has to crop —
  // it fits exactly on every screen width.
  const slideHeight = height;

  // Duplicate the first slide at the end. When the loop reaches this clone
  // it looks identical to slide 0, so we can silently jump back to the real
  // slide 0 without any visible backward scroll.
  const slides = images.length > 1 ? [...images, images[0]] : images;

  const goToNext = useCallback(() => {
    if (images.length <= 1) return;

    const next = indexRef.current + 1;

    if (next < slides.length) {
      indexRef.current = next;
      listRef.current?.scrollToOffset({ offset: next * width, animated: true });
      setActiveIndex(next % images.length);
      return;
    }

    // Reached the cloned first slide — snap back to the real one silently.
    indexRef.current = 0;
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setActiveIndex(0);
  }, [images.length, slides.length, width]);

  useEffect(() => {
    if (isDragging || images.length <= 1) return undefined;

    timerRef.current = setInterval(goToNext, AUTO_SLIDE_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [goToNext, isDragging, images.length]);

  // When the animated scroll to the clone finishes, jump back to the real
  // first slide on the very next frame — invisible to the user.
  function handleMomentumScrollEnd(event) {
    const offsetX = event.nativeEvent.contentOffset.x;
    const rawIndex = Math.round(offsetX / width);

    if (images.length > 1 && rawIndex === slides.length - 1) {
      indexRef.current = 0;
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      setActiveIndex(0);
      return;
    }

    indexRef.current = rawIndex;
    setActiveIndex(rawIndex % images.length);
  }

  return (
    <View style={[styles.wrap, { width, height: slideHeight }]}>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(_, index) => `banner-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => setIsDragging(true)}
        onScrollEndDrag={() => setIsDragging(false)}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={{ width, height: slideHeight }}>
            <Image
              source={item}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        )}
      />

      {/* Dots sit inside the banner, near its bottom edge */}
      {images.length > 1 && (
        <View style={styles.dotsRow}>
          {images.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#0d2d4d',
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 34,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#ffffff',
  },
});
