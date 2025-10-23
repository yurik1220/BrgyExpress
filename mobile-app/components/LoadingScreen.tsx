import React from 'react';
import { View, ActivityIndicator, Text, Image } from 'react-native';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = "Loading..." }) => {
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#FAF9F6', 
      justifyContent: 'center', 
      alignItems: 'center',
      paddingHorizontal: 20
    }}>
      <Image
        source={require('../assets/images/bx-logo.png')}
        style={{ width: 80, height: 80, marginBottom: 20 }}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#023c69" style={{ marginBottom: 10 }} />
      <Text style={{ 
        color: '#023c69', 
        fontSize: 16, 
        fontFamily: 'Jakarta-Medium',
        textAlign: 'center'
      }}>
        {message}
      </Text>
    </View>
  );
};

export default LoadingScreen;
