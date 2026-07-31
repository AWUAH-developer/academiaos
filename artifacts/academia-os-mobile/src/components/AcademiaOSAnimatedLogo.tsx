import {
  Image,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

type AcademiaOSAnimatedLogoProps = {
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

export function AcademiaOSAnimatedLogo({
  style,
  accessibilityLabel = 'AcademiaOS animated logo',
}: AcademiaOSAnimatedLogoProps) {
  return (
    <Image
      source={require('../../assets/brand/academiaos-pacman-animation.gif')}
      accessibilityLabel={accessibilityLabel}
      resizeMode="contain"
      style={[
        {
          width: '100%',
          maxWidth: 960,
          aspectRatio: 960 / 370,
          alignSelf: 'center',
        },
        style,
      ]}
    />
  );
}

export default AcademiaOSAnimatedLogo;
