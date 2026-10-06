/* global jest, test, expect, beforeEach */
// When the backend can't translate, the phone asks MyMemory itself.
import React from "react";
import { Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render } from "@testing-library/react-native";
import Text from "../src/Components/Text";
import { LanguageProvider, useLanguage } from "../src/context/LanguageContext";
import directTranslate from "../src/lib/directTranslate";

jest.mock("../src/api/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.reject(new Error("offline"))),
    post: jest.fn(() =>
      Promise.reject(Object.assign(new Error("503"), { response: { status: 503, data: { success: false, message: "The translation service is not available right now" } } }))
    ),
  },
}));

beforeEach(() => {
  AsyncStorage.clear();
  global.fetch = jest.fn(async (url) => {
    const params = new URL(url).searchParams;
    const [, target] = params.get("langpair").split("|");
    return { json: async () => ({ responseStatus: 200, responseData: { translatedText: `${target}:${params.get("q")} &amp; co` } }) };
  });
});

function Switch() {
  const { setLanguage } = useLanguage();
  return (
    <Pressable onPress={() => setLanguage("hin_Deva")}>
      <Text translate={false}>Switch</Text>
    </Pressable>
  );
}

test("falls back to translating on the phone when the backend can't", async () => {
  const screen = await render(
    <LanguageProvider>
      <Switch />
      <Text>Find Work</Text>
    </LanguageProvider>
  );
  await fireEvent.press(screen.getByText("Switch"));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 150)));

  expect(screen.getByText("hi:Find Work & co")).toBeTruthy();
  expect(global.fetch.mock.calls[0][0]).toContain("langpair=en|hi");
  await screen.unmount();
});

test("detects typed Indian scripts, keeps same-language text and splits long text", async () => {
  const long = "Water the plants every morning ".repeat(30).trim();
  const result = await directTranslate(["வீட்டு வேலை", "घर का काम", long], "hin_Deva");

  expect(result["வீட்டு வேலை"]).toBe("hi:வீட்டு வேலை & co");
  expect(global.fetch.mock.calls.some(([url]) => url.includes("langpair=ta|hi"))).toBe(true);
  expect(result["घर का काम"]).toBe("घर का काम"); // already Hindi: no request
  expect(global.fetch.mock.calls.filter(([url]) => url.includes("Water")).length).toBeGreaterThan(1);
});

test("leaves out texts the translator refused", async () => {
  global.fetch = jest.fn(async () => ({ json: async () => ({ responseStatus: 429, responseData: { translatedText: "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY" } }) }));
  expect(await directTranslate(["Login"], "tam_Taml")).toEqual({});
});
