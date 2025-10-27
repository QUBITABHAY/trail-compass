import AsyncStorage from "@react-native-async-storage/async-storage";
const KEY = "TRAIL_COMPASS_PINS_V1";

// TODO: Load the saved pins
export async function loadPins() {
  try {
    let pins = await AsyncStorage.getItem(KEY);
    return pins ? JSON.parse(pins) : [];
  } catch {
    return [];
  }
}

// TODO: Save the pins locally
export async function savePins(pins) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(pins));
  } catch {
    return "Unable to save";
  }
}
