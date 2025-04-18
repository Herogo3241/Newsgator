import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet, View, Dimensions } from 'react-native';

interface AnimatedScrollingTextProps {
  text: string;
  speed?: number; // Duration in ms for full scroll (lower = faster)
  textStyle?: object; // Optional custom text styling
}

const AnimatedScrollingText = ({ 
  text, 
  speed = 10000, 
  textStyle = {} 
}: AnimatedScrollingTextProps) => {
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Reset animation when text changes
  useEffect(() => {
    scrollAnim.setValue(0);
  }, [text]);
  
  // Start animation when we have measurements
  useEffect(() => {
    if (textWidth && containerWidth) {
      const fullWidth = textWidth + containerWidth;
      
      Animated.loop(
        Animated.timing(scrollAnim, {
          toValue: -textWidth,
          duration: speed,
          useNativeDriver: true,
          easing: (t) => t, // Linear easing for smooth scrolling
        })
      ).start();
    }
  }, [textWidth, containerWidth, speed, scrollAnim]);

  return (
    <View 
      style={styles.container}
      onLayout={(event) => {
        setContainerWidth(event.nativeEvent.layout.width);
      }}
    >
      <View style={styles.innerContainer}>
        <Animated.View 
          style={[
            styles.textContainer, 
            { transform: [{ translateX: scrollAnim }] }
          ]}
          onLayout={(event) => {
            setTextWidth(event.nativeEvent.layout.width);
          }}
        >
          <Text style={[styles.text, textStyle]}>
            {text}
          </Text>
          <Text style={[styles.text, textStyle]}>
            {text}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden', // Hide anything outside the container
    width: '150%',
  },
  innerContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  textContainer: {
    flexDirection: 'row', // Make text scroll horizontally
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    paddingRight: 20, // Space between repetitions
  },
});

export default AnimatedScrollingText;