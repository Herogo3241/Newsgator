import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  ViewStyle
} from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView
} from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AnimatedScrollingText from "./components/ui/animatedscrolltext";
import Slider from "@react-native-community/slider";
import apiConfig from "./components/api/url";
import { LinearGradient } from "expo-linear-gradient";

// Define the Article type for better type safety
type Article = {
  id: string;
  webTitle: string;
  webPublicationDate: string;
  webUrl: string;
  fields: {
    thumbnail: string;
    headline: string;
    byline: string;
  };
};

// Define route parameter types for React Navigation
type RootStackParamList = {
  NewDetails: { item: Article };
};

type NewDetailsRouteProp = RouteProp<RootStackParamList, "NewDetails">;

const SCREEN_WIDTH = Dimensions.get("window").width;

const SkeletonLoader = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Shimmer animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true
      })
    ).start();
  }, [shimmerAnim]);

  // Pulse animation (slight background pulsing)
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true
        })
      ])
    ).start();
  }, [pulseAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH]
  });

  const renderSkeletonBox = (style: ViewStyle | ViewStyle[]) => (
    <Animated.View style={[style, { opacity: pulseAnim, overflow: "hidden" }]}>
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          transform: [{ translateX }]
        }}
      >
        <LinearGradient
          colors={["transparent", "rgba(255, 255, 255, 0.35)", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            width: "100%",
            height: "100%"
          }}
        />
      </Animated.View>
    </Animated.View>
  );

  return (
    <View style={styles.skeletonContainer}>
      {renderSkeletonBox(styles.skeletonImage)}
      {renderSkeletonBox(styles.skeletonTitle)}
      {renderSkeletonBox(styles.skeletonByline)}
      {renderSkeletonBox(styles.skeletonDate)}
      {renderSkeletonBox(styles.skeletonContent)}
      {renderSkeletonBox([styles.skeletonContent, { width: "90%" }])}
      {renderSkeletonBox([styles.skeletonContent, { width: "95%" }])}
      {renderSkeletonBox([styles.skeletonContent, { width: "85%" }])}
      {renderSkeletonBox([styles.skeletonContent, { width: "80%" }])}
      {renderSkeletonBox([styles.skeletonContent, { width: "100%" }])}
      {renderSkeletonBox([styles.skeletonContent, { width: "92%" }])}
      {renderSkeletonBox([styles.skeletonContent, { width: "88%" }])}
      {renderSkeletonBox([styles.skeletonContent, { width: "84%" }])}
      {renderSkeletonBox([styles.skeletonContent, { width: "100%" }])}
      {renderSkeletonBox([styles.skeletonContent, { width: "93%" }])}
      {renderSkeletonBox([styles.skeletonContent, { width: "85%" }])}
      {renderSkeletonBox([styles.skeletonContent, { width: "97%" }])}
      {renderSkeletonBox([styles.skeletonContent, { width: "90%" }])}
      {renderSkeletonBox([styles.skeletonContent, { width: "80%" }])}
    </View>
  );
};

export default function NewsDetails() {
  const route = useRoute<NewDetailsRouteProp>();
  const { item } = route.params;

  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [summary, setSummary] = useState("");
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [sumLoading, setSumLoading] = useState(false);

  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const speechRef = useRef<void | null>(null);

  const snapPoints = useMemo(() => ["60%"], []);

  // Fetch article content when component mounts
  useEffect(() => {
    bottomSheetRef.current?.close();
    const fetchContent = async () => {
      try {
        setIsLoading(true);
        const scrapeRes = await fetch(
          `${apiConfig.GET_URL}/scrape?url=${encodeURIComponent(item.webUrl)}`
        );

        if (!scrapeRes.ok) {
          throw new Error("Failed to fetch article content.");
        }

        const scrapedData = await scrapeRes.json();
        const cleanedText = scrapedData.content.replace(/[*_#~>`]/g, "");

        setContent(cleanedText);
      } catch (err) {
        console.error("Scrape failed:", err);
        setError("Failed to load article. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();

    return () => {
      Speech.isSpeakingAsync().then((isSpeaking) => {
        if (isSpeaking) Speech.stop();
      });
    };
  }, [item.webUrl]);

  // Format the publication date for better readability
  const formattedDate = new Date(item.webPublicationDate).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  );

  // Handle speech functionality
  // Separate summary fetching from speech toggling
  const fetchSummary = async () => {
    setSumLoading(true);
    try {
      if (!summary) {
        const summarizeRes = await fetch(
          `${apiConfig.GET_URL}/api/summarize?url=${encodeURIComponent(item.webUrl)}`
        );

        if (!summarizeRes.ok) {
          throw new Error("Failed to fetch summary.");
        }

        const summaryData = await summarizeRes.json();
        setSummary(summaryData.summary);
        return summaryData.summary;
      }
      return summary;
    } catch (err) {
      console.error("Summary fetch failed:", err);
      throw new Error("Failed to fetch summary");
    }
  };

  // Toggle speech - start speaking if not speaking, or stop if speaking

  // Stop ongoing speech
  const handlePause = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    }
  };

  // "Resume" speech - actually starts new speech since resume isn't cross-platform
  const handleResume = () => {
    if (!isSpeaking && summary) {
      setIsSpeaking(true);

      // Start new speech
      Speech.speak(summary, {
        language: "en-US",
        rate: speechRate,
        onDone: () => setIsSpeaking(false),
        onError: (error) => {
          console.error("Speech error:", error);
          setIsSpeaking(false);
        },
        onStopped: () => setIsSpeaking(false)
      });
    }
  };

  // Improved toggle play function with cross-platform approach
  const togglePlay = () => {
    Speech.isSpeakingAsync().then(async (speaking) => {
      if (speaking) {
        // If currently speaking, stop it
        handlePause();
      } else {
        // If not speaking, start a new speech
        try {
          if (!summary) {
            // If we don't have a summary yet, need to fetch it first
            await fetchSummary();
          }

          // Start speech
          handleResume();
        } catch (err) {
          console.error("Speech toggle failed:", err);
          setIsSpeaking(false);
        }
      }
    });
  };

  // Function to handle summarize button click
  const toggleSummarize = async () => {
    setSumLoading(true);
    try {
      // First fetch the summary if not already available
      if (!summary) {
        await fetchSummary();
      }

      setSumLoading(false);

      // Toggle the bottom sheet
      if (isOpen) {
        bottomSheetRef.current?.close();
        setIsOpen(false);

        // Stop any ongoing speech when closing the summary
        const speaking = await Speech.isSpeakingAsync();
        if (speaking) {
          Speech.stop();
          setIsSpeaking(false);
        }
      } else {
        bottomSheetRef.current?.snapToIndex(0);
        setIsOpen(true);
      }
    } catch (err) {
      console.error("Failed to summarize:", err);
      // Maybe show an error toast here
    }
  };

  // Render the article content based on loading/error state
  const renderContent = () => {
    if (error) {
      return <SkeletonLoader />;
    }

    if (isLoading) {
      return <SkeletonLoader />;
    }

    return (
      <>
        <View style={styles.headerContainer}>
          {!imageLoaded && <View style={styles.imagePlaceholder} />}
          <Image
            source={{ uri: item.fields.thumbnail }}
            style={styles.image}
            onLoad={() => setImageLoaded(true)}
          />
          <Text style={styles.title}>{item.fields.headline}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaContainer}>
              <Text style={styles.byline}>{item.fields.byline}</Text>
              <Text style={styles.date}>{formattedDate}</Text>
            </View>

            <Pressable
              onPress={toggleSummarize}
              style={({ pressed }) => [
                styles.sumButton,
                pressed && styles.sumButtonPressed
              ]}
              accessibilityLabel={
                isSpeaking ? "Stop summarizing article" : "summarizing aloud"
              }
              accessibilityRole="button"
            >
              <Text style={styles.sumButtonText}>
                {sumLoading ? (
                  <ActivityIndicator color={"white"} />
                ) : (
                  "Summarize"
                )}
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.divider} />
        <Text style={styles.content}>{content}</Text>
      </>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      </SafeAreaView>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        onChange={(index) => {
          setIsOpen(index !== -1); // index -1 means closed
        }}
        index={-1}
        enablePanDownToClose={true}
        handleIndicatorStyle={styles.sheetIndicator}
        backgroundStyle={styles.sheetBackground}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.6}
          />
        )}
      >
        <BottomSheetView style={styles.modalContentContainer}>
          <Image
            source={{ uri: item.fields.thumbnail }}
            style={styles.modalImage}
            onLoad={() => setImageLoaded(true)}
          />
          <AnimatedScrollingText
            text={item.webTitle}
            textStyle={[styles.title, { marginTop: 20 }]}
          />
          <Text style={[styles.bylineModal, { marginTop: 10, fontSize: 16 }]}>
            {item.fields.byline}
          </Text>
          <Text style={styles.dateModal}>{formattedDate}</Text>
          <View style={styles.speechControlContainer}>
            <Pressable onPress={togglePlay} style={styles.playButton}>
              {isSpeaking ? (
                <Ionicons name="pause-circle" size={60} color="#000" />
              ) : (
                <Ionicons name="play-circle" size={60} color="#000" />
              )}
            </Pressable>

            <View style={styles.rateContainer}>
              <Text style={styles.rateLabel}>{speechRate}x</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.rateValue}>0.25x</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.0}
                  maximumValue={2.0}
                  step={0.25}
                  value={speechRate}
                  onValueChange={setSpeechRate}
                  minimumTrackTintColor="#000"
                  maximumTrackTintColor="#ccc"
                  thumbTintColor="#000"
                />
                <Text style={styles.rateValue}>2x</Text>
              </View>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff"
  },
  scrollView: {
    padding: 16,
    paddingBottom: 30
  },
  headerContainer: {
    marginBottom: 16
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8
  },
  metaContainer: {
    flex: 1
  },
  image: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    marginBottom: 16
  },
  imagePlaceholder: {
    position: "absolute",
    width: "100%",
    height: 240,
    borderRadius: 12,
    backgroundColor: "#e0e0e0"
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#222",
    letterSpacing: -0.5,
    lineHeight: 34
  },
  byline: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginBottom: 4
  },
  date: {
    fontSize: 14,
    color: "#888"
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e5e5",
    marginVertical: 16
  },
  content: {
    fontSize: 17,
    color: "#333",
    lineHeight: 26,
    letterSpacing: 0.3
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    textAlign: "center",
    marginTop: 20,
    lineHeight: 24
  },
  sumButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: "black",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  sumButtonPressed: {
    opacity: 0.8
  },
  sumButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5
  },

  // Skeleton styles
  skeletonContainer: {
    flex: 1,
    alignItems: "flex-start"
  },
  skeletonImage: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    backgroundColor: "#e0e0e0",
    marginBottom: 16
  },
  skeletonTitle: {
    width: "100%",
    height: 34,
    backgroundColor: "#e0e0e0",
    borderRadius: 6,
    marginBottom: 8
  },
  skeletonByline: {
    width: "60%",
    height: 18,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginBottom: 6
  },
  skeletonDate: {
    width: "40%",
    height: 16,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginBottom: 24
  },
  skeletonContent: {
    width: "100%",
    height: 18,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginBottom: 12
  },

  //Modal
  modalContainer: {
    flex: 1
  },
  sheetBackground: {
    backgroundColor: "#ffffff"
  },
  sheetIndicator: {
    backgroundColor: "#bbb",
    width: 40,
    height: 5,
    borderRadius: 3
  },
  modalContentContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 12,
    alignItems: "center"
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
    alignSelf: "center"
  },
  modalImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    marginBottom: 12
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#222",
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 8
  },
  bylineModal: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    textAlign: "center"
  },
  dateModal: {
    fontSize: 14,
    color: "#888",
    marginBottom: 20
  },
  speechControlContainer: {
    width: "100%",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 20
  },
  playButton: {
    marginBottom: 16
  },
  rateContainer: {
    width: "100%",
    marginTop: 4
  },
  rateLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    textAlign: "center"
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%"
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10
  },
  rateValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555"
  },
  summaryContainer: {
    width: "100%",
    maxHeight: 200,
    borderRadius: 12,
    backgroundColor: "#f8f8f8",
    padding: 16,
    marginTop: 8
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333"
  }
});
