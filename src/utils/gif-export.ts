import GIF from "gif.js";

// GIF export utility using gif.js library
export async function exportVideoAsGif(videoUrl: string): Promise<void> {
  const video = document.createElement("video");
  video.src = videoUrl;
  video.crossOrigin = "anonymous";
  video.muted = true;

  await new Promise((resolve, reject) => {
    video.onloadeddata = resolve;
    video.onerror = reject;
  });

  video.play();
  await new Promise((resolve) => setTimeout(resolve, 100));
  video.pause();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  // Set dimensions
  canvas.width = Math.min(video.videoWidth, 480);
  canvas.height = Math.floor(
    (canvas.width / video.videoWidth) * video.videoHeight,
  );

  // Create GIF encoder
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: canvas.width,
    height: canvas.height,
    workerScript: "/gif.worker.js", // We'll need to copy this to public folder
  });

  // Capture frames
  const fps = 10;
  const duration = Math.min(video.duration, 5); // Up to 5 seconds
  const frameCount = Math.floor(duration * fps);
  const delay = 1000 / fps; // Delay between frames in ms

  for (let i = 0; i < frameCount; i++) {
    video.currentTime = i / fps;

    await new Promise((resolve) => {
      video.onseeked = () => resolve(null);
      setTimeout(() => resolve(null), 500);
    });

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Add frame to GIF
    gif.addFrame(ctx, {
      copy: true,
      delay: delay,
    });
  }

  // Render the GIF
  gif.on("finished", (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video-${Date.now()}.gif`;
    a.click();
    URL.revokeObjectURL(url);
  });

  gif.render();
}
