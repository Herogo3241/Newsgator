import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NewsList from './NewsList';
import NewsDetail from './newsDetails'; // optional screen if you want to navigate

const Stack = createNativeStackNavigator();

const Index = () => {
  return (
<Stack.Navigator screenOptions={{headerShown: false}}>
  <Stack.Screen name="NewsList" component={NewsList} options={{ title: 'Newsgator'}}  />
  {/* Add more screens like detail view here if needed */}
  <Stack.Screen name="NewsDetail" component={NewsDetail} />
</Stack.Navigator>
  );
};

export default Index;
