// React Native's FormData accepts a file descriptor `{ uri, name, type }` and streams the
// file from disk. TypeScript's DOM typings (pulled in by Expo's tsconfig) only know the web
// overloads, so we add the React Native one through interface merging.
interface FormData {
  append(name: string, value: { uri: string; name: string; type: string }): void;
}
