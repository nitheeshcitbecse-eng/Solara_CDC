import React, { Children } from "react";
import { Text as NativeText } from "react-native";
import { useTranslated } from "../context/LanguageContext";

// Drop-in replacement for React Native's Text that shows its words in the chosen language.
// Use <Text translate={false}> for things that must stay as they are (the brand name, language names…).

// "3 active jobs" arrives as [3, " active ", "jobs"]: translate it as one sentence.
function plainText(children) {
  const parts = Children.toArray(children);
  if (parts.length === 0 || !parts.every((part) => typeof part === "string" || typeof part === "number")) return null;
  return parts.join("");
}

function Translated({ text }) {
  return useTranslated(text);
}

export default function Text({ children, translate = true, ...props }) {
  const plain = translate ? plainText(children) : null;
  const translated = useTranslated(plain);

  if (!translate) return <NativeText {...props}>{children}</NativeText>;
  if (plain !== null) return <NativeText {...props}>{translated}</NativeText>;

  // Mixed content (nested <Text>, icons…): translate each string on its own.
  return (
    <NativeText {...props}>
      {Children.map(children, (child) => (typeof child === "string" ? <Translated text={child} /> : child))}
    </NativeText>
  );
}
