// Check OS for keyboard shortcut display
export const checkOS = (os?: string) => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const platform = navigator.platform;
  if (os === "Win") return platform.startsWith("Win");
  if (os === "Linux") return platform.startsWith("Linux");
  if (os === "Mac") return platform.startsWith("Mac");
  return false;
};
