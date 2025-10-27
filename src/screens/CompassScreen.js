import React, { useEffect, useState } from "react";
import { View, StyleSheet, Share, Animated, Easing } from "react-native";
import {
  Appbar,
  Card,
  Text,
  Button,
  Snackbar,
  IconButton,
  Chip,
} from "react-native-paper";
import * as Location from "expo-location";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { fmt, toCardinal, nowISO } from "../utils/geo";
import { loadPins, savePins } from "../storage";

export default function CompassScreen({ navigation }) {
  const [heading, setHeading] = useState(null);
  const [coords, setCoords] = useState(null);
  const [pins, setPins] = useState([]);
  const [snack, setSnack] = useState("");
  const [bob] = useState(() => new Animated.Value(0)); // given

  // TODO(1): Ask for location permission, get initial position, and start heading watcher
  useEffect(() => {
    let headingSub = null;
    let mounted = true;

    const askForPermission = async () => {
      // TODO a) Ask for location permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status != "granted") {
        setErrorMsg("Permission Denied");
        return;
      }
      // TODO b) Get One-time position and save the coordinates
      let location = await Location.getCurrentPositionAsync({});
      setCoords(location);

      //* (GIVEN): Heading watcher (0..360 degrees)
      headingSub = await Location.watchHeadingAsync(({ trueHeading }) => {
        if (!mounted) return;
        if (typeof trueHeading === "number") setHeading(trueHeading);
      });

      // TODO c) Load saved pins
      const saved = await loadPins();
      if (mounted) setPins(saved);
    };

    askForPermission();

    // Cleaning the component
    return () => {
      mounted = false;
      headingSub?.remove?.();
    };
  }, []);

  //* (GIVEN): gentle bob animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  //* (GIVEN): Gradient orientation from heading (0° = up, clockwise)
  const pointsForHeading = (deg = 0) => {
    const rad = (deg * Math.PI) / 180;
    const vx = Math.sin(rad);
    const vy = -Math.cos(rad);
    const k = 0.45;
    const sx = 0.5 - k * vx;
    const sy = 0.5 - k * vy;
    const ex = 0.5 + k * vx;
    const ey = 0.5 + k * vy;
    const clamp = (v) => Math.max(0, Math.min(1, v));
    return {
      start: { x: clamp(sx), y: clamp(sy) },
      end: { x: clamp(ex), y: clamp(ey) },
    };
  };

  const dropPin = async () => {
    if (!coords) {
      setSnack("No GPS fix yet");
      return;
    }
    // TODO(2): push new pin {id, lat, lon, heading, ts} to state and savePins(next)
    const pin = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      lat: coords.coords.latitude,
      lon: coords.coords.longitude,
      heading: heading,
      ts: nowISO(),
    };

    const newPins = [pin, ...pins];
    setPins(newPins);
    await savePins(newPins);
    setSnack("TODO: save pin");
  };

  const copyCoords = async () => {
    if (!coords) {
      setSnack("TODO: copy coords");
      return;
    }
    // TODO(3): Clipboard.setStringAsync("lat, lon") then snackbar
    let lat = coords.latitude;
    let lon = coords.longitude;
    await Clipboard.setStringAsync(`${lat}, ${lon}`);
  };

  const shareCoords = async () => {
    if (!coords) {
      setSnack("TODO: share");
      return;
    }
    // TODO(4): Share.share with message including coords + heading + cardinal
    await Share.share({
      message: `I am here: ${coords.latitude}, ${coords.longitude} (${toCardinal(heading)}°)`,
    });
  };

  // Make DARK end point opposite heading: add 180°
  const { start, end } = pointsForHeading(((heading ?? 0) + 180) % 360);
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  return (
    <>
      <Appbar.Header>
        <Appbar.Content title="Gradient Compass" />
        <Appbar.Action
          icon="map-marker"
          onPress={() => navigation.navigate("Pins")}
        />
      </Appbar.Header>

      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content style={styles.center}>
            <Animated.View
              style={[styles.gradWrap, { transform: [{ translateY: bobY }] }]}
            >
              <LinearGradient
                start={start}
                end={end}
                colors={["#00D2FF", "#3A7BD5", "#1E3C72"]}
                style={styles.gradient}
              />
            </Animated.View>

            <Text variant="displaySmall" style={styles.headingText}>
              {heading != null ? `${Math.round(heading)}°` : "—"}
            </Text>
            <Chip>{toCardinal(heading ?? 0)}</Chip>

            <View style={styles.actionsRow}>
              <Button onPress={dropPin}>Save</Button>
              <Button onPress={copyCoords}>Copy</Button>
              <IconButton icon="share-variant" onPress={shareCoords} />
            </View>
          </Card.Content>
        </Card>
      </View>

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack("")}
        duration={1200}
      >
        {snack}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderRadius: 16 },
  center: { alignItems: "center", gap: 12, paddingVertical: 20 },
  gradWrap: {
    width: 180,
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
  },
  gradient: { flex: 1 },
  headingText: { fontWeight: "700" },
  coords: { opacity: 0.8, marginTop: 6, letterSpacing: 0.5 },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    alignItems: "center",
  },
});
