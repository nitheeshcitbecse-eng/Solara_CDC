/* global jest, describe, test, expect, beforeEach */
// Switching language translates <Text> and placeholders through POST /i18n/translate (mocked here).
import React from "react";
import { Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render } from "@testing-library/react-native";
import Text from "../src/Components/Text";
import SearchBox from "../src/Components/SearchBox";
import { LanguageProvider, splitForTranslation, useLanguage } from "../src/context/LanguageContext";

jest.mock("../src/api/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: { success: true, languages: [{ code: "tam_Taml", name: "Tamil", nativeName: "தமிழ்" }] } })),
    post: jest.fn((url, body) =>
      Promise.resolve({ data: { success: true, translations: Object.fromEntries(body.texts.map((text) => [text, `${body.language}:${text}`])) } })
    ),
  },
}));

function Switch() {
  const { setLanguage } = useLanguage();
  return (
    <Pressable onPress={() => setLanguage("tam_Taml")}>
      <Text translate={false}>Switch</Text>
    </Pressable>
  );
}

const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 120)));

describe("translation", () => {
  beforeEach(() => AsyncStorage.clear());

  test("translates text, mixed text and placeholders, and leaves the rest alone", async () => {
    const jobs = 3;
    const screen = await render(
      <LanguageProvider>
        <Switch />
        <Text>Find Work</Text>
        <Text>{jobs} active jobs</Text>
        <Text>
          Already have an account? <Text>Login</Text>
        </Text>
        <Text translate={false}>Solara</Text>
        <Text>owner@solara.app</Text>
        <SearchBox value="" onChangeText={() => {}} placeholder="Search jobs" />
      </LanguageProvider>
    );
    await settle();
    expect(screen.getByText("Find Work")).toBeTruthy(); // English until a language is chosen

    await fireEvent.press(screen.getByText("Switch"));
    await settle();

    expect(screen.getByText("tam_Taml:Find Work")).toBeTruthy();
    expect(screen.getByText("tam_Taml:3 active jobs")).toBeTruthy();
    expect(screen.getByText("tam_Taml:Login")).toBeTruthy();
    expect(screen.getByText("Solara")).toBeTruthy();
    expect(screen.getByText("owner@solara.app")).toBeTruthy();
    expect(screen.getByPlaceholderText("tam_Taml:Search jobs")).toBeTruthy();
    await screen.unmount();
  });

  test("in English, text typed in an Indian script is translated and English text is left alone", async () => {
    const screen = await render(
      <LanguageProvider>
        <Text>House help needed</Text>
        <Text>வீட்டு வேலைக்கு ஆள் தேவை</Text>
      </LanguageProvider>
    );
    await settle();
    expect(screen.getByText("House help needed")).toBeTruthy();
    expect(screen.getByText("eng_Latn:வீட்டு வேலைக்கு ஆள் தேவை")).toBeTruthy();
    await screen.unmount();
  });

  test("long text is translated sentence by sentence, keeping line breaks", () => {
    const text = `${"Water the plants every morning. ".repeat(10)}Trim hedges!\n\nCall 9876543210.`;
    const pieces = splitForTranslation(text);
    expect(pieces.map((piece) => piece.text).join("")).toBe(text);
    expect(pieces.filter((piece) => piece.translate).map((piece) => piece.text)).toEqual([
      ...Array(10).fill("Water the plants every morning."),
      "Trim hedges!",
      "Call 9876543210.",
    ]);
    expect(pieces.find((piece) => piece.text === "\n\n").translate).toBe(false);
  });
});
