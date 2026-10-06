import React, { Children, useContext } from "react";
import { StyleSheet, Text as NativeText } from "react-native";
import { LanguageContext, SOURCE_LANGUAGE, useTranslated } from "../context/LanguageContext";

// Drop-in replacement for React Native's Text that shows its words in the chosen language.
// Use <Text translate={false}> for things that must stay as they are (the brand name, language names…).

const INDIAN_SCRIPT = /[ऀ-෿]/;

// "3 active jobs" arrives as [3, " active ", "jobs"]: translate it as one sentence.
function plainText(children) {
  const parts = Children.toArray(children);
  if (parts.length === 0 || !parts.every((part) => typeof part === "string" || typeof part === "number")) return null;
  return parts.join("");
}

function Translated({ text }) {
  return useTranslated(text);
}

// Translations are often longer than the English, and Indian scripts are taller: let the text wrap
// instead of running out of its box, and give the letters room so they are not cut off.
function fitted(style, text) {
  const extra = { flexShrink: 1 };
  if (INDIAN_SCRIPT.test(text)) {
    const flat = StyleSheet.flatten(style) || {};
    const fontSize = flat.fontSize || 14;
    if (flat.lineHeight && flat.lineHeight < fontSize * 1.5) extra.lineHeight = Math.round(fontSize * 1.5);
    if (flat.letterSpacing) extra.letterSpacing = 0;
  }
  return [style, extra];
}

export default function Text({ children, translate = true, style, numberOfLines, ...props }) {
  const { language } = useContext(LanguageContext);
  const plain = translate ? plainText(children) : null;
  const translated = useTranslated(plain);

  if (!translate) {
    return (
      <NativeText style={style} numberOfLines={numberOfLines} {...props}>
        {children}
      </NativeText>
    );
  }

  const shown = plain !== null ? translated : Children.toArray(children).filter((child) => typeof child === "string").join(" ");
  const adapt = language !== SOURCE_LANGUAGE || INDIAN_SCRIPT.test(shown);
  const textProps = adapt
    ? {
        style: fitted(style, shown),
        numberOfLines,
        // Single-line labels shrink a little rather than being cut off.
        ...(numberOfLines ? { adjustsFontSizeToFit: true, minimumFontScale: 0.75 } : null),
      }
    : { style, numberOfLines };

  if (plain !== null) {
    return (
      <NativeText {...props} {...textProps}>
        {translated}
      </NativeText>
    );
  }

  // Mixed content (nested <Text>, icons…): translate each string on its own.
  return (
    <NativeText {...props} {...textProps}>
      {Children.map(children, (child) => (typeof child === "string" ? <Translated text={child} /> : child))}
    </NativeText>
  );
}
