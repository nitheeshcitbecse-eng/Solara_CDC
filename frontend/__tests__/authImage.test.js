/* global jest, test, expect, beforeEach */
// Private photos are downloaded with the login token (React Native 0.86 drops <Image> headers on Android).
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render } from "@testing-library/react-native";
import Avatar from "../src/Components/Avatar";
import AuthImage from "../src/Components/AuthImage";

class FakeFileReader {
  readAsDataURL(blob) {
    this.result = `data:image/jpeg;base64,${blob.content}`;
    setTimeout(() => this.onload(), 0);
  }
}

beforeEach(async () => {
  global.FileReader = FakeFileReader;
  await AsyncStorage.setItem("token", "secret-token");
  global.fetch = jest.fn(async (url) => ({ ok: !url.includes("/missing"), status: url.includes("/missing") ? 404 : 200, blob: async () => ({ content: url.split("/").pop() }) }));
});

const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 30)));

test("profile photos are fetched with the login token and shown", async () => {
  const screen = await render(<Avatar userId={7} name="Ravi" hasPhoto />);
  await settle();

  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toBe("http://test.local/api/v1/users/get-photo/7");
  expect(options.headers).toEqual({ Authorization: "Bearer secret-token" });
  expect(JSON.stringify(screen.toJSON())).toContain('"uri":"data:image/jpeg;base64,7"');
  expect(screen.queryByText("R")).toBeNull(); // the photo, not the initial
  await screen.unmount();
});

test("without a photo, or when it can't load, the initial is shown", async () => {
  const noPhoto = await render(<Avatar userId={8} name="meena" hasPhoto={false} />);
  expect(noPhoto.getByText("M")).toBeTruthy();
  await noPhoto.unmount();

  const broken = await render(<AuthImage path="/admin/get-document/missing/front" style={{ width: 10, height: 10 }} />);
  await settle();
  expect(broken.getByText("Could not load the image")).toBeTruthy();
  await broken.unmount();
});
