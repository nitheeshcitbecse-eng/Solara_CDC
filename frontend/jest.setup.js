/* global jest */
// Official mocks for native modules the screens use.
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("@react-native-community/netinfo", () => require("@react-native-community/netinfo/jest/netinfo-mock.js"));
jest.mock("react-native-keyboard-controller", () => require("react-native-keyboard-controller/jest"));

process.env.EXPO_PUBLIC_BACKEND_URL = "http://test.local/api/v1";
