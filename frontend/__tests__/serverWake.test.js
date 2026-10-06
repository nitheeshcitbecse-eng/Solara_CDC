/* global jest, test, expect */
// While a request takes more than a few seconds (a sleeping free server waking up) the banner shows.
import React from "react";
import { act, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import api from "../src/api/api";
import ServerWakeBanner from "../src/Components/ServerWakeBanner";

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

test("shows the banner during slow requests only", async () => {
  jest.useFakeTimers();
  let finish;
  api.defaults.adapter = (config) => new Promise((resolve) => (finish = () => resolve({ data: { success: true }, status: 200, headers: {}, config })));

  const screen = await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ServerWakeBanner />
    </SafeAreaProvider>
  );

  // A quiet request (upload / translation) never shows it.
  let request = api.get("/quiet", { quiet: true });
  await act(async () => jest.advanceTimersByTime(10000));
  expect(screen.queryByText("Connecting to the server…")).toBeNull();
  await act(async () => finish());
  await request;

  request = api.get("/auth/profile");
  await act(async () => {}); // let axios run its request interceptors
  await act(async () => jest.advanceTimersByTime(3000));
  expect(screen.queryByText("Connecting to the server…")).toBeNull();
  await act(async () => jest.advanceTimersByTime(4000));
  expect(screen.getByText("Connecting to the server…")).toBeTruthy();

  await act(async () => finish());
  await request;
  expect(screen.queryByText("Connecting to the server…")).toBeNull();

  await screen.unmount();
  jest.useRealTimers();
});
