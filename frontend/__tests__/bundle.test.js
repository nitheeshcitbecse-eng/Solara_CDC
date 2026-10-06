/* global jest, test, expect, beforeEach */
// The app's own texts come from the bundled translations: instant, no network. Only the rest is asked for.
import React from "react";
import { Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render } from "@testing-library/react-native";
import Text from "../src/Components/Text";
import api from "../src/api/api";
import { LanguageProvider, useLanguage } from "../src/context/LanguageContext";

jest.mock("../src/i18n/tam_Taml.json", () => ({ "Find Work": "வேலை தேடு", "Your photo *": "உங்கள் புகைப்படம் *" }));
jest.mock("../src/api/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.reject(new Error("offline"))),
    post: jest.fn((url, body) => Promise.resolve({ data: { success: true, translations: Object.fromEntries(body.texts.map((t) => [t, `live:${t}`])) } })),
  },
}));

beforeEach(() => AsyncStorage.clear());

function Switch() {
  const { setLanguage } = useLanguage();
  return (
    <Pressable onPress={() => setLanguage("tam_Taml")}>
      <Text translate={false}>Switch</Text>
    </Pressable>
  );
}

test("bundled texts show at once; only other texts are translated live", async () => {
  const screen = await render(
    <LanguageProvider>
      <Switch />
      <Text>Find Work</Text>
      <Text>Your photo *</Text>
      <Text>Mason needed in Adyar</Text>
    </LanguageProvider>
  );
  await fireEvent.press(screen.getByText("Switch"));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 100)));

  expect(screen.getByText("வேலை தேடு")).toBeTruthy();
  expect(screen.getByText("உங்கள் புகைப்படம் *")).toBeTruthy();
  expect(screen.getByText("live:Mason needed in Adyar")).toBeTruthy();
  const asked = api.post.mock.calls.flatMap(([, body]) => body.texts);
  expect(asked).toEqual(["Mason needed in Adyar"]);
  await screen.unmount();
});
