import React from 'react';
import { Text } from 'react-native';

const fontFamilies = {
  bold: 'SpotifyMix-Bold',
  medium: 'SpotifyMix-Medium',
  regular: 'SpotifyMix-Regular',
};

export default function CustomText({ weight = 'regular', style, children, ...props }) {
  const fontFamily = fontFamilies[weight] || fontFamilies.regular;
  return (
    <Text style={[{ fontFamily }, style]} {...props}>
      {children}
    </Text>
  );
}
