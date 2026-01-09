import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    FlatList,
    StatusBar,
    Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeScreen } from '../components/SafeScreen';
import { RootStackParamList } from '../navigation/AppNavigator';
import { ShieldCheck, Zap, HeartHandshake } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

type WelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

interface Props {
    navigation: WelcomeScreenNavigationProp;
}

const { width } = Dimensions.get('window');

const THEME = {
    background: '#000000',
    text: '#FFFFFF',
    subtext: '#8E8E93',
    accent: '#FF3B30',
    surface: '#1C1C1E',
};

const SLIDES = [
    {
        id: '1',
        icon: ShieldCheck,
        title: 'Silent Guardian',
        description: 'Protection that respects your peace. Active only when you need it, invisible when you don’t.',
    },
    {
        id: '2',
        icon: Zap,
        title: 'Instant Response',
        description: 'Trigger a localized SOS beacon with a single, tactile gesture — because milliseconds matter.',
    },
    {
        id: '3',
        icon: HeartHandshake,
        title: 'Trusted Circle',
        description: 'Keep your family and nearby guardians informed without saying a word.',
    },
];

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
    const { theme } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatRef = useRef<FlatList>(null);

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        } else {
            navigation.navigate('Auth');
        }
    };

    const handleSkip = () => navigation.navigate('Auth');

    const onScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: false }
    );

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems[0]?.index !== null) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfigRef = { viewAreaCoveragePercentThreshold: 50 };

    const renderItem = ({ item, index }: { item: typeof SLIDES[number]; index: number }) => {
        const Icon = item.icon;
        return (
            <View style={[styles.slideContainer, { width }]}>
                <View style={styles.iconWrapper}>
                    <View style={styles.glow} />
                    <Icon size={120} color={THEME.text} strokeWidth={1} />
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
            </View>
        );
    };

    const buttonLabel = currentIndex === SLIDES.length - 1 ? 'Get Protected' : 'Continue';

    return (
        <SafeScreen style={{ flex: 1, backgroundColor: THEME.background }}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['rgba(255,59,48,0.06)', 'transparent']}
                style={styles.ambientLight}
            />

            <Animated.FlatList
                ref={flatRef}
                data={SLIDES}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                keyExtractor={(item) => item.id}
                onScroll={onScroll}
                scrollEventThrottle={16}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewConfigRef}
                contentContainerStyle={{ alignItems: 'center' }}
            />

            <View style={styles.footer}>
                <View style={styles.paginatorContainer}>
                    {SLIDES.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 24, 8],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                key={i.toString()}
                                style={[styles.dot, { width: dotWidth, opacity }]}
                            />
                        );
                    })}
                </View>

                <View style={styles.bottomRow}>
                    <TouchableOpacity onPress={handleSkip}>
                        <Text style={styles.skip}>Skip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handleNext}
                        style={[
                            styles.button,
                            currentIndex === SLIDES.length - 1 && styles.buttonActive
                        ]}
                    >
                        <Text style={styles.buttonText}>{buttonLabel}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeScreen>
    );
};

const styles = StyleSheet.create({
    ambientLight: {
        position: 'absolute',
        top: -120,
        width: width * 1.2,
        height: width * 1.2,
        borderRadius: width,
        alignSelf: 'center',
        opacity: 0.4,
    },
    slideContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    iconWrapper: {
        width: 180,
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    glow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: THEME.text,
        opacity: 0.08,
        shadowColor: THEME.text,
        shadowOpacity: 0.4,
        shadowRadius: 40,
        shadowOffset: { width: 0, height: 20 },
    },
    title: {
        fontSize: 34,
        fontWeight: '700',
        color: THEME.text,
        textAlign: 'center',
        marginBottom: 14,
        letterSpacing: 0.2,
    },
    description: {
        fontSize: 18,
        color: THEME.subtext,
        textAlign: 'center',
        lineHeight: 26,
        maxWidth: '85%',
    },
    footer: {
        width: '100%',
        paddingHorizontal: 24,
        paddingBottom: 36,
        marginTop: 12,
    },
    paginatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: THEME.text,
        marginHorizontal: 4,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    skip: {
        color: THEME.subtext,
        fontSize: 16,
        fontWeight: '600',
    },
    button: {
        paddingHorizontal: 22,
        height: 52,
        borderRadius: 26,
        backgroundColor: THEME.text,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonActive: {
        backgroundColor: THEME.accent,
    },
    buttonText: {
        color: THEME.background,
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
});
