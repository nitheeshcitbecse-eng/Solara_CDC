// Metro turns static asset imports into a numeric asset id that <Image>, expo-image,
// expo-audio and expo-asset all accept.
declare module '*.jpg' {
  const assetId: number;
  export default assetId;
}

declare module '*.png' {
  const assetId: number;
  export default assetId;
}

declare module '*.wav' {
  const assetId: number;
  export default assetId;
}
