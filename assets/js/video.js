let hideOverlayTimer;
let videoContainer;
let overlay;
let video;
let isEnhanced = false;
let audioSwitch;
let switchHandle;
let switchText;
let audioLabel;
let audioLabelText;
let playIcon;
let pauseIcon;

function init() {
  videoContainer = document.getElementById("play-overlay").parentElement;
  overlay = document.getElementById("play-overlay");
  video = document.getElementById("video-player");
  audioSwitch = document.getElementById("audio-switch");
  switchHandle = document.getElementById("switch-handle");
  switchText = document.getElementById("switch-text");
  audioLabel = document.getElementById("audio-label");
  audioLabelText = audioLabel.querySelector("span");
  playIcon = document.getElementById("play-icon");
  pauseIcon = document.getElementById("pause-icon");

  videoContainer.addEventListener("mouseenter", handleVideoMouseEnter);
  videoContainer.addEventListener("mouseleave", handleVideoMouseLeave);
  video.addEventListener("ended", handleVideoEnded);
  audioSwitch.addEventListener("click", handleAudioSwitchClick);

  // used by the button in the index.html file
  window.togglePlayback = togglePlayback;
}

function handleVideoEnded() {
  playIcon.classList.remove("hidden");
  pauseIcon.classList.add("hidden");
  overlay.classList.remove("opacity-0");
}

function handleVideoMouseEnter() {
  if (!video.paused) overlay.classList.remove("opacity-0");
}

function handleVideoMouseLeave() {
  if (!video.paused) overlay.classList.add("opacity-0");
}

function handleAudioSwitchClick() {
  isEnhanced = !isEnhanced;

  const wasPlaying = !video.paused;
  video.pause();

  if (isEnhanced) {
    video.src = "/assets/videos/me_enhanced.webm";
    switchHandle.style.left = "calc(100% - 24px)";
    switchHandle.style.backgroundColor = "#000000";
    switchHandle.classList.remove("shadow-[0_0_15px_white]");
    switchText.textContent = "enhanced audio";
    switchText.classList.replace("text-zinc-500", "text-white");
    audioSwitch.classList.replace("bg-zinc-900", "bg-white");
    audioSwitch.classList.replace("border-white/10", "border-transparent");
    audioLabelText.textContent = "Enhanced Audio";
  } else {
    video.src = "/assets/videos/me.webm";
    switchHandle.style.left = "4px";
    switchHandle.style.backgroundColor = "";
    switchText.textContent = "original audio";
    switchText.classList.replace("text-white", "text-zinc-500");
    audioSwitch.classList.replace("bg-white", "bg-zinc-900");
    audioSwitch.classList.replace("border-transparent", "border-white/10");
    audioLabelText.textContent = "Original Audio";
  }

  if (wasPlaying) {
    video.load();
    video.play();
    document.getElementById("play-overlay").classList.add("opacity-0");
  }
}

function togglePlayback() {
  if (video.paused) {
    video.play();
    audioLabel.classList.remove("hidden");
    playIcon.classList.add("hidden");
    pauseIcon.classList.remove("hidden");

    hideOverlayTimer = setTimeout(() => {
      overlay.classList.add("opacity-0");
    }, 300);
  } else {
    video.pause();
    clearTimeout(hideOverlayTimer);
    playIcon.classList.remove("hidden");
    pauseIcon.classList.add("hidden");
    overlay.classList.remove("opacity-0");
  }
}

if (document.readyState === "complete") {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}
