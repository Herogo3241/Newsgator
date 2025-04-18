import React, { useEffect, useState } from "react";
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  Image,
  Pressable,
  Animated,
  Easing,
  RefreshControl,
} from "react-native";
import apiConfig from "./components/api/url";


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

type Category = {
  id: string;
  name: string;
};

// Available news categories
const categories: Category[] = [
  { id: "all", name: "All" },
  { id: "world", name: "World" },
  { id: "politics", name: "Politics" },
  { id: "business", name: "Business" },
  { id: "technology", name: "Tech" },
  { id: "sport", name: "Sports" },
  { id: "culture", name: "Culture" },
  { id: "science", name: "Science" }
];

// Skeleton component
const SkeletonItem = () => {
  const opacity = useState(new Animated.Value(0.3))[0];

  // Animation for the skeleton loading effect
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true
        })
      ])
    );
    
    animation.start();
    
    return () => {
      animation.stop();
    };
  }, []);

  return (
    <View style={styles.article}>
      <Animated.View 
        style={[
          styles.skeletonThumbnail, 
          { opacity }
        ]} 
      />
      <View style={styles.textContent}>
        <Animated.View
          style={[
            styles.skeletonTitle,
            { opacity }
          ]}
        />
        <Animated.View
          style={[
            styles.skeletonDate,
            { opacity }
          ]}
        />
      </View>
    </View>
  );
};

export default function NewsList({navigation} : any) {

  
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const fetchTopNews = async (category: string = selectedCategory) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch today's top news
      const today = new Date().toISOString().split('T')[0];
      
      // Build the API URL based on category
      let apiUrl = `https://content.guardianapis.com/search?api-key=${apiConfig.API_KEY}&show-fields=thumbnail,headline,byline&order-by=relevance&from-date=${today}&page-size=10`;
      
      // Add section filter if not "all"
      if (category !== "all") {
        apiUrl += `&section=${category}`;
      }
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.response && data.response.results) {
        setArticles(data.response.results);
      } else {
        throw new Error("Invalid data format received");
      }
    } catch (error) {
      console.error("Failed to fetch top news:", error);
      setError("Unable to load top news. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopNews();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTopNews();
    setRefreshing(false);
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    fetchTopNews(categoryId);
  };

  const renderSkeletonLoading = () => {
    return (
      <FlatList
        contentContainerStyle={styles.listContent}
        data={Array(6).fill(0)} 
        keyExtractor={(_, index) => `skeleton-${index}`}
        renderItem={() => <SkeletonItem />}
      />
    );
  };

  const itemPress = (item: Article) => {
    navigation.navigate('NewsDetail', {item});
  };

  // Category filter item
  const renderCategoryItem = ({ item }: { item: Category }) => (
    <Pressable
      style={[
        styles.categoryItem,
        selectedCategory === item.id ? styles.selectedCategory : null
      ]}
      onPress={() => handleCategoryPress(item.id)}
    >
      <Text 
        style={[
          styles.categoryText,
          selectedCategory === item.id ? styles.selectedCategoryText : null
        ]}
      >
        {item.name}
      </Text>
    </Pressable>
  );

  // Error state display
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={() => fetchTopNews()}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.header}>TOP DAILY NEWS</Text>
      </View>

      {/* Category Filter Bar */}
      <View style={styles.categoryFilterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={renderCategoryItem}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      {/* Article feed */}
      {loading ? (
        renderSkeletonLoading()
      ) : error ? (
        renderError()
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => itemPress(item)}>
              <View style={styles.article}>
                {item.fields.thumbnail ? (
                  <Image
                    source={{ uri: item.fields.thumbnail }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.thumbnail, styles.placeholderImage]}>
                    <Text style={styles.placeholderText}>No Image</Text>
                  </View>
                )}
                <View style={styles.textContent}>
                  <Text style={styles.title}>{item.webTitle}</Text>
                  <Text style={styles.date}>
                    {new Date(item.webPublicationDate).toLocaleDateString(undefined, {
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No articles available for {
                categories.find(c => c.id === selectedCategory)?.name || 'selected category'
              }</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={["#B71C1C"]}
              tintColor="#B71C1C"
            />
          }
        />
      )}

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <Text style={styles.footerText}>Today's Top Headlines • The Guardian</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa"
  },
  topBar: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 16,
    alignItems: "center"
  },
  header: {
    // color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "serif"
  },
  // Category styles
  categoryFilterContainer: {
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  categoryList: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedCategory: {
    backgroundColor: "black",
    borderColor: "black",
  },
  categoryText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#424242",
  },
  selectedCategoryText: {
    color: "#fff",
  },
  // Article list styles
  listContent: {
    padding: 16
  },
  article: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12
  },
  placeholderImage: {
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center"
  },
  placeholderText: {
    color: "#757575",
    fontSize: 12
  },
  textContent: {
    flex: 1,
    justifyContent: "center"
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#212121",
    fontFamily: "serif",
    marginBottom: 4
  },
  date: {
    fontSize: 12,
    color: "#757575"
  },
  bottomBar: {
    backgroundColor: "black",
    paddingVertical: 10,
    alignItems: "center"
  },
  footerText: {
    color: "#fff",
    fontSize: 12
  },
  // Error handling styles
  errorContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center"
  },
  errorText: {
    fontSize: 16,
    color: "#B71C1C",
    textAlign: "center",
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: "#B71C1C",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold"
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center"
  },
  emptyText: {
    fontSize: 16,
    color: "#757575",
    textAlign: "center"
  },
  // Skeleton styles
  skeletonThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#E0E0E0"
  },
  skeletonTitle: {
    height: 16,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
    marginBottom: 8,
    width: '90%'
  },
  skeletonDate: {
    height: 10,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
    width: '40%'
  }
});