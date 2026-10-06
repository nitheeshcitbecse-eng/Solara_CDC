/* global jest, describe, test, expect, beforeEach, afterEach */
// Renders every screen, for every kind of user, with real API responses recorded from the backend
// (backend/scripts/export_app_fixtures.py). Fails on crashes, React errors/warnings logged with
// console.error, text rendered outside <Text> (a crash on the phone), and GET calls with no response.
import React from "react";
import { act, render } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthContext } from "../src/context/AuthContext";
import fixtures from "./fixtures.json";

// ── API mock: answers from the recorded fixtures of the current role ─────────
const missing = [];
global.__ROLE__ = null;

jest.mock("../src/api/api", () => {
  const recorded = require("./fixtures.json");
  const reject = (status, message) =>
    Promise.reject(Object.assign(new Error(message), { response: { status, data: { success: false, message } } }));
  const get = jest.fn((url) => {
    const entry = global.__ROLE__ ? recorded[global.__ROLE__].responses[url] : undefined;
    if (!entry) {
      global.__MISSING__.push(url);
      return reject(404, `No recorded response for ${url}`);
    }
    return entry.status >= 400 ? reject(entry.status, entry.data.message) : Promise.resolve({ data: entry.data });
  });
  const write = jest.fn(() => Promise.resolve({ data: { success: true, message: "Done" } }));
  return { __esModule: true, default: { get, post: write, put: write, delete: write }, multipartConfig: {}, setUnauthorizedHandler: jest.fn() };
});
global.__MISSING__ = missing;

// ── Screens ──────────────────────────────────────────────────────────────────
const S = (path) => require(`../src/screens/${path}`).default;

const ids = (role, pattern) =>
  Object.keys(fixtures[role].responses)
    .map((url) => url.match(pattern))
    .filter(Boolean)
    .map((match) => Number(match[1]));

const firstJob = (role) => {
  const url = Object.keys(fixtures[role].responses).find((key) => key.startsWith("/jobs/get-job/"));
  return fixtures[role].responses[url].data.job;
};

const seekerScreens = (role) => [
  ["UserScreen", S("UserScreen")],
  ["ProfileScreen", S("ProfileScreen")],
  ["EditProfileScreen", S("EditProfileScreen")],
  ["ChangePasswordScreen", S("ChangePasswordScreen")],
  ["NotificationsScreen", S("NotificationsScreen")],
  ["MessagesScreen", S("MessagesScreen")],
  ["HelpScreen", S("HelpScreen")],
  ["VerificationScreen", S("VerificationScreen")],
  ["FindJobsScreen", S("Seeker/FindJobsScreen")],
  ["SavedJobsScreen", S("Seeker/SavedJobsScreen")],
  ["MyApplicationsScreen", S("Seeker/MyApplicationsScreen")],
  ["ApplyJobScreen", S("Seeker/FindJobs/ApplyJobScreen"), { job: firstJob(role) }],
  ["QuickSetupScreen", S("QuickSetupScreen")],
  ["PremiumSeekerSetupScreen", S("Seeker/PremiumSeekerSetupScreen")],
  ...ids(role, /^\/jobs\/get-job\/(\d+)$/).map((jobId) => [`JobDetailsScreen #${jobId}`, S("Seeker/FindJobs/JobDetailsScreen"), { jobId }]),
  ...ids(role, /^\/applications\/get-application\/(\d+)$/).map((applicationId) => [
    `ApplicationDetailsScreen #${applicationId}`,
    S("Seeker/MyApplications/ApplicationDetailsScreen"),
    { applicationId },
  ]),
  ...ids(role, /^\/messages\/get-messages\/(\d+)$/).map((conversationId) => [`ChatScreen #${conversationId}`, S("ChatScreen"), { conversationId, title: "Chat" }]),
];

const hirerScreens = (role) => [
  ["UserScreen", S("UserScreen")],
  ["ProfileScreen", S("ProfileScreen")],
  ["EditProfileScreen", S("EditProfileScreen")],
  ["NotificationsScreen", S("NotificationsScreen")],
  ["MessagesScreen", S("MessagesScreen")],
  ["HelpScreen", S("HelpScreen")],
  ["VerificationScreen", S("VerificationScreen")],
  ["ManageJobsScreen", S("Hirer/ManageJobsScreen")],
  ["AddJobScreen", S("Hirer/ManageJobs/AddJobScreen")],
  ["ViewJobsScreen", S("Hirer/ManageJobs/ViewJobsScreen")],
  ["CloseJobScreen", S("Hirer/ManageJobs/CloseJobScreen")],
  ["QuickSetupScreen", S("QuickSetupScreen")],
  ["PremiumHirerSetupScreen", S("Hirer/PremiumHirerSetupScreen")],
  ...ids(role, /^\/applications\/get-job-applicants\/(\d+)$/).map((jobId) => [
    `JobApplicantsScreen #${jobId}`,
    S("Hirer/ManageJobs/JobApplicantsScreen"),
    { jobId, jobTitle: "Job" },
  ]),
  ...ids(role, /^\/applications\/get-application\/(\d+)$/).map((applicationId) => [
    `ApplicantDetailsScreen #${applicationId}`,
    S("Hirer/ManageJobs/ApplicantDetailsScreen"),
    { applicationId },
  ]),
  ...ids(role, /^\/messages\/get-messages\/(\d+)$/).map((conversationId) => [`ChatScreen #${conversationId}`, S("ChatScreen"), { conversationId, title: "Chat" }]),
];

const adminScreens = () => [
  ["UserScreen", S("UserScreen")],
  ["ProfileScreen", S("ProfileScreen")],
  ["EditProfileScreen", S("EditProfileScreen")],
  ["NotificationsScreen", S("NotificationsScreen")],
  ["HelpScreen", S("HelpScreen")],
  ["ManageUsersScreen", S("Admin/ManageUsersScreen")],
  ["VerifyUsersScreen", S("Admin/ManageUsers/VerifyUsersScreen")],
  ["ManageSectorsScreen", S("Admin/ManageSectorsScreen")],
  ["AddSectorScreen", S("Admin/ManageSectors/AddSectorScreen")],
  ["ViewSectorsScreen", S("Admin/ManageSectors/ViewSectorsScreen")],
  ["RemoveSectorScreen", S("Admin/ManageSectors/RemoveSectorScreen")],
  ["ModerateJobsScreen", S("Admin/ModerateJobsScreen")],
  ["ReviewJobsScreen", S("Admin/ModerateJobs/ReviewJobsScreen")],
  ["ViewAllJobsScreen", S("Admin/ModerateJobs/ViewAllJobsScreen")],
  ["TakeDownJobsScreen", S("Admin/ModerateJobs/TakeDownJobsScreen")],
  ["ReportsScreen", S("Admin/ReportsScreen")],
  ["AuditLogsScreen", S("Admin/AuditLogsScreen")],
  ["ShortlistApprovalsScreen", S("Admin/ShortlistApprovalsScreen")],
  ...[["seeker", "normal"], ["seeker", "premium"], ["hirer", "normal"], ["hirer", "premium"]].map(([role, tier]) => [
    `ViewUsersScreen ${tier} ${role}`,
    S("Admin/ManageUsers/ViewUsersScreen"),
    { role, tier },
  ]),
  ...ids("admin", /^\/admin\/get-user\/(\d+)$/).map((userId) => [`UserDetailsScreen #${userId}`, S("Admin/ManageUsers/UserDetailsScreen"), { userId }]),
];

const publicScreens = () => [
  ["HomeScreen", S("HomeScreen")],
  ["ChooseTierScreen seeker", S("ChooseTierScreen"), { role: "seeker" }],
  ["ChooseTierScreen hirer", S("ChooseTierScreen"), { role: "hirer" }],
  ["LoginScreen", S("LoginScreen")],
  ["RegisterScreen normal", S("RegisterScreen"), { role: "seeker", tier: "normal" }],
  ["RegisterScreen premium", S("RegisterScreen"), { role: "hirer", tier: "premium" }],
  ["ForgotPasswordScreen", S("ForgotPasswordScreen")],
  ["ResetPasswordScreen", S("ResetPasswordScreen"), { email: "seeker@solara.app" }],
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator();
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function renderScreen(Component, params, user) {
  const auth = {
    user,
    setUser: jest.fn(),
    loading: false,
    setLoading: jest.fn(),
    error: "",
    setError: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    refreshUser: jest.fn(async () => {}),
    logout: jest.fn(),
    isConnected: true,
  };
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <AuthContext.Provider value={auth}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Under test" component={Component} initialParams={params} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}

// React Native crashes when a string is rendered outside <Text>; the test renderer doesn't, so check.
function textOutsideText(node, parentIsText = false, found = []) {
  if (node === null || node === undefined) return found;
  if (typeof node === "string" || typeof node === "number") {
    if (!parentIsText && String(node).trim() !== "") found.push(String(node));
    return found;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => textOutsideText(child, parentIsText, found));
    return found;
  }
  const isText = node.type === "Text";
  (node.children || []).forEach((child) => textOutsideText(child, isText, found));
  return found;
}

let errors;
beforeEach(() => {
  errors = [];
  missing.length = 0;
  jest.spyOn(console, "error").mockImplementation((...args) => errors.push(args.map(String).join(" ")));
  jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

async function check(role, name, Component, params) {
  global.__ROLE__ = role;
  const user = role === "public" ? null : fixtures[role].user;
  const screen = await renderScreen(Component, params, user);
  // Let data load and effects settle.
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });
  }
  const tree = screen.toJSON();
  expect(tree).toBeTruthy();
  expect({ screen: name, textOutsideText: textOutsideText(tree) }).toEqual({ screen: name, textOutsideText: [] });
  expect({ screen: name, missingResponses: [...missing] }).toEqual({ screen: name, missingResponses: [] });
  await screen.unmount();
  expect({ screen: name, errors }).toEqual({ screen: name, errors: [] });
}

const groups = {
  public: publicScreens(),
  normalSeeker: seekerScreens("normalSeeker"),
  premiumSeeker: seekerScreens("premiumSeeker"),
  normalHirer: hirerScreens("normalHirer"),
  premiumHirer: hirerScreens("premiumHirer"),
  admin: adminScreens(),
};

for (const [role, screens] of Object.entries(groups)) {
  describe(role, () => {
    test.each(screens.map(([name, Component, params]) => [name, Component, params || {}]))("%s renders cleanly", (name, Component, params) =>
      check(role, name, Component, params)
    );
  });
}

// The checks above must be able to fail: prove the detectors catch real problems.
describe("test harness", () => {
  const { View, Text } = require("react-native");

  // The v14 renderer throws like the phone does, and textOutsideText() is a second line of defence.
  test("detects text rendered outside <Text>", async () => {
    const Broken = () => (
      <View>
        <Text>fine</Text>
        {"stray text"}
      </View>
    );
    await expect(render(<Broken />)).rejects.toThrow(/must be rendered within a <Text>/);
    expect(textOutsideText({ type: "View", children: [{ type: "Text", children: ["fine"] }, "stray text"] })).toEqual(["stray text"]);
  });

  test("captures React errors", async () => {
    const Broken = () => (
      <View>
        {[1, 2].map((n) => (
          <Text>{n}</Text>
        ))}
      </View>
    );
    const screen = await render(<Broken />);
    await screen.unmount();
    expect(errors.join(" ")).toMatch(/key/);
  });
});
