// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // The frontend spec's list pattern filters a copy of the array in useEffect([search, items])
      // and loads data with fetchItems() inside useEffect. Both set state in an effect on purpose.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // The spec's reference Alert keeps Animated.Value instances in refs created during render,
    // the standard React Native animation pattern.
    files: ["src/Components/Alert.js"],
    rules: {
      "react-hooks/refs": "off",
    },
  },
]);
