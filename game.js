"use strict";

/* =========================================================
   THAM CHIẾU GIAO DIỆN
========================================================= */

const homeScreen = document.getElementById("homeScreen");
const learnScreen = document.getElementById("learnScreen");
const playScreen = document.getElementById("playScreen");

const learnModeButton = document.getElementById("learnModeButton");
const playModeButton = document.getElementById("playModeButton");
const homeButton = document.getElementById("homeButton");
const playHomeButton = document.getElementById("playHomeButton");

const currentNumberElement = document.getElementById("currentNumber");
const totalNumberElement = document.getElementById("totalNumber");
const letterButton = document.getElementById("letterButton");
const smallLetterElement = document.getElementById("smallLetter");
const letterImage = document.getElementById("letterImage");
const wordElement = document.getElementById("word");
const soundButton = document.getElementById("soundButton");
const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");
const statusMessage = document.getElementById("statusMessage");
const progressBar = document.getElementById("progressBar");
const learningCard = document.querySelector(".learningCard");

const playScoreElement = document.getElementById("playScore");
const questionNumberElement = document.getElementById("questionNumber");
const totalQuestionsElement = document.getElementById("totalQuestions");
const playInstructionElement = document.getElementById("playInstruction");
const playSoundButton = document.getElementById("playSoundButton");
const answerGrid = document.getElementById("answerGrid");
const playFeedback = document.getElementById("playFeedback");
const nextQuestionButton = document.getElementById("nextQuestionButton");
const resultPanel = document.getElementById("resultPanel");
const resultScore = document.getElementById("resultScore");
const resultTotal = document.getElementById("resultTotal");
const starEffectLayer = document.getElementById("starEffectLayer");

/* =========================================================
   TRẠNG THÁI CHUNG
========================================================= */

const TOTAL_QUESTIONS = 10;
const ANSWER_COUNT = 4;

let currentIndex = 0;
let currentAudio = null;

let playScore = 0;
let currentQuestionNumber = 1;
let currentCorrectItem = null;
let currentChoices = [];
let playQuestionPool = [];
let questionAnswered = false;
let isProcessingAnswer = false;
let audioSequenceId = 0;

/* =========================================================
   ÂM THANH
========================================================= */

const correctSound = new Audio("sounds/correct.mp3");
const wrongSound = new Audio("sounds/wrong.mp3");

[correctSound, wrongSound].forEach((audio) => {
  audio.preload = "auto";
  audio.volume = 1;
  audio.load();
});

function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function playAudioSource(source) {
  return new Promise((resolve) => {
    if (!source) {
      resolve(false);
      return;
    }

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audio = typeof source === "string"
      ? new Audio(source)
      : source;

    currentAudio = audio;
    audio.preload = "auto";
    audio.volume = 1;
    audio.currentTime = 0;

    let completed = false;

    const finish = (success) => {
      if (completed) {
        return;
      }

      completed = true;
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("abort", onError);

      if (currentAudio === audio) {
        currentAudio = null;
      }

      resolve(success);
    };

    const onEnded = () => finish(true);
    const onError = () => finish(false);

    audio.addEventListener("ended", onEnded, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.addEventListener("abort", onError, { once: true });

    audio.play().catch(() => finish(false));
  });
}

function speakPraise(text) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window) || !text) {
      resolve(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = 0.92;
    utterance.pitch = 1.08;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const vietnameseVoice = voices.find(
      (voice) => voice.lang === "vi-VN"
    ) || voices.find(
      (voice) => voice.lang.toLowerCase().startsWith("vi")
    );

    if (vietnameseVoice) {
      utterance.voice = vietnameseVoice;
    }

    let completed = false;

    const finish = (success) => {
      if (completed) {
        return;
      }

      completed = true;
      resolve(success);
    };

    utterance.onend = () => finish(true);
    utterance.onerror = () => finish(false);

    window.speechSynthesis.speak(utterance);
  });
}

/* =========================================================
   HIỆU ỨNG
========================================================= */

function createStarEffect(button) {
  const buttonRect = button.getBoundingClientRect();
  const centerX = buttonRect.left + buttonRect.width / 2;
  const centerY = buttonRect.top + buttonRect.height / 2;

  for (let index = 0; index < 6; index += 1) {
    const star = document.createElement("div");
    star.className = "flyingStar";
    star.textContent = "⭐";
    star.style.left = `${centerX + (Math.random() - 0.5) * 150}px`;
    star.style.top = `${centerY + (Math.random() - 0.5) * 45}px`;
    star.style.animationDelay = `${index * 0.07}s`;
    starEffectLayer.appendChild(star);

    window.setTimeout(() => star.remove(), 1500);
  }
}

function createFireworks(duration = 4600) {
  const oldLayer = document.querySelector(".fireworksLayer");
  oldLayer?.remove();

  const layer = document.createElement("div");
  layer.className = "fireworksLayer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  const symbols = ["⭐", "✨", "🎉", "🎊"];

  const launchBurst = () => {
    const centerX = 12 + Math.random() * 76;
    const centerY = 10 + Math.random() * 55;

    for (let index = 0; index < 15; index += 1) {
      const particle = document.createElement("span");
      particle.className = "fireworkParticle";
      particle.textContent = symbols[
        Math.floor(Math.random() * symbols.length)
      ];

      const angle = (Math.PI * 2 * index) / 15 + Math.random() * 0.28;
      const distance = 70 + Math.random() * 145;

      particle.style.left = `${centerX}%`;
      particle.style.top = `${centerY}%`;
      particle.style.setProperty(
        "--firework-x",
        `${Math.cos(angle) * distance}px`
      );
      particle.style.setProperty(
        "--firework-y",
        `${Math.sin(angle) * distance}px`
      );
      particle.style.animationDelay = `${Math.random() * 90}ms`;

      layer.appendChild(particle);
      particle.addEventListener(
        "animationend",
        () => particle.remove(),
        { once: true }
      );
    }
  };

  launchBurst();
  const intervalId = window.setInterval(launchBurst, 520);

  window.setTimeout(() => {
    window.clearInterval(intervalId);
    window.setTimeout(() => layer.remove(), 1300);
  }, duration);
}

/* =========================================================
   ĐIỀU HƯỚNG MÀN HÌNH
========================================================= */

function showScreen(screen) {
  homeScreen.classList.add("hidden");
  learnScreen.classList.add("hidden");
  playScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

function returnHome() {
  audioSequenceId += 1;
  stopCurrentAudio();
  isProcessingAnswer = false;
  showScreen(homeScreen);
}

/* =========================================================
   CHẾ ĐỘ HỌC
========================================================= */

function getCurrentLetter() {
  return alphabet[currentIndex];
}

function openLearnMode() {
  audioSequenceId += 1;
  stopCurrentAudio();
  showScreen(learnScreen);
  renderCurrentLetter();
}

function renderCurrentLetter() {
  const item = getCurrentLetter();

  currentNumberElement.textContent = String(currentIndex + 1);
  totalNumberElement.textContent = String(alphabet.length);
  letterButton.textContent = item.upper;
  smallLetterElement.textContent = item.lower;
  letterImage.src = item.image;
  letterImage.alt = item.word.trim();
  wordElement.textContent = item.word.trim();

  previousButton.disabled = currentIndex === 0;

  const isLastLetter = currentIndex === alphabet.length - 1;
  nextButton.disabled = false;
  nextButton.textContent = isLastLetter
    ? "Học lại từ đầu ↻"
    : "Chữ tiếp theo →";

  statusMessage.textContent = `Đang học chữ ${item.upper}`;
  document.title = `${item.upper} - Sóc học chữ cái`;

  const progressPercent = ((currentIndex + 1) / alphabet.length) * 100;
  progressBar.style.width = `${progressPercent}%`;

  learningCard.classList.remove("is-changing");
  void learningCard.offsetWidth;
  learningCard.classList.add("is-changing");

  [currentIndex - 1, currentIndex + 1].forEach((index) => {
    if (index >= 0 && index < alphabet.length) {
      const image = new Image();
      image.src = alphabet[index].image;
    }
  });
}

async function playCurrentSound() {
  const item = getCurrentLetter();
  audioSequenceId += 1;
  stopCurrentAudio();

  statusMessage.textContent = `Đang phát âm chữ ${item.upper}`;
  const played = await playAudioSource(item.sound);

  statusMessage.textContent = played
    ? `${item.upper} như ${item.word.trim()}`
    : `Không thể phát âm thanh chữ ${item.upper}`;
}

function showPreviousLetter() {
  if (currentIndex <= 0) {
    return;
  }

  currentIndex -= 1;
  renderCurrentLetter();
  playCurrentSound();
}

function showNextLetter() {
  currentIndex = currentIndex === alphabet.length - 1
    ? 0
    : currentIndex + 1;

  renderCurrentLetter();
  playCurrentSound();
}

/* =========================================================
   CHẾ ĐỘ CHƠI
========================================================= */

function shuffleArray(items) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [
      result[randomIndex],
      result[index]
    ];
  }

  return result;
}

function prepareQuestionPool() {
  playQuestionPool = shuffleArray(alphabet).slice(0, TOTAL_QUESTIONS);
}

function openPlayMode() {
  audioSequenceId += 1;
  stopCurrentAudio();
  showScreen(playScreen);

  playScore = 0;
  currentQuestionNumber = 1;
  currentCorrectItem = null;
  currentChoices = [];
  questionAnswered = false;
  isProcessingAnswer = false;

  playSoundButton.disabled = false;
  nextQuestionButton.textContent = "Câu tiếp theo →";

  prepareQuestionPool();
  createQuestion();
}

function createQuestion() {
  audioSequenceId += 1;
  stopCurrentAudio();

  questionAnswered = false;
  isProcessingAnswer = false;
  playFeedback.textContent = "";
  nextQuestionButton.disabled = true;
  nextQuestionButton.textContent = "Câu tiếp theo →";
  playSoundButton.disabled = false;

  resultPanel.classList.add("hidden");
  answerGrid.classList.remove("hidden");

  currentCorrectItem = playQuestionPool[currentQuestionNumber - 1];

  const wrongChoices = shuffleArray(
    alphabet.filter((item) => item.id !== currentCorrectItem.id)
  ).slice(0, ANSWER_COUNT - 1);

  currentChoices = shuffleArray([currentCorrectItem, ...wrongChoices]);

  playScoreElement.textContent = String(playScore);
  questionNumberElement.textContent = String(currentQuestionNumber);
  totalQuestionsElement.textContent = String(TOTAL_QUESTIONS);
  playInstructionElement.textContent =
    `Hãy chọn hình minh họa cho chữ ${currentCorrectItem.upper}`;

  renderAnswerChoices();

  window.setTimeout(() => {
    playQuestionSound();
  }, 250);
}

function renderAnswerChoices() {
  answerGrid.innerHTML = "";

  currentChoices.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answerCard";

    const imageWrap = document.createElement("div");
    imageWrap.className = "answerImageWrap";

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = item.word.trim();
    image.width = 512;
    image.height = 512;
    image.loading = "lazy";
    image.decoding = "async";

    const label = document.createElement("span");
    label.textContent = item.word.trim();

    imageWrap.appendChild(image);
    button.append(imageWrap, label);

    button.addEventListener("click", () => {
      handlePlayAnswer(button, item);
    });

    answerGrid.appendChild(button);
  });
}

function setAnswerCardsDisabled(disabled) {
  answerGrid.querySelectorAll(".answerCard").forEach((button) => {
    button.disabled = disabled;
  });
}

async function playQuestionSound() {
  if (!currentCorrectItem || isProcessingAnswer || questionAnswered) {
    return;
  }

  const sequenceId = ++audioSequenceId;
  isProcessingAnswer = true;
  setAnswerCardsDisabled(true);
  playSoundButton.disabled = true;
  playFeedback.textContent = `Đang phát âm chữ ${currentCorrectItem.upper}`;

  const played = await playAudioSource(currentCorrectItem.sound);

  if (sequenceId !== audioSequenceId) {
    return;
  }

  playFeedback.textContent = played
    ? "Sóc hãy chọn hình đúng nhé!"
    : "Không thể phát âm thanh câu hỏi.";

  setAnswerCardsDisabled(false);
  playSoundButton.disabled = false;
  isProcessingAnswer = false;
}

async function handlePlayAnswer(button, selectedItem) {
  if (questionAnswered || isProcessingAnswer || !currentCorrectItem) {
    return;
  }

  const sequenceId = ++audioSequenceId;
  const isCorrect = selectedItem.id === currentCorrectItem.id;

  isProcessingAnswer = true;
  setAnswerCardsDisabled(true);
  playSoundButton.disabled = true;
  button.classList.add("is-speaking");
  playFeedback.textContent = `Đang phát âm chữ ${selectedItem.upper}`;

  await playAudioSource(selectedItem.sound);
  await wait(170);

  button.classList.remove("is-speaking");

  if (sequenceId !== audioSequenceId) {
    return;
  }

  if (!isCorrect) {
    button.classList.add("wrong");
    playFeedback.textContent =
      `${selectedItem.upper} chưa đúng. Sóc thử lại nhé!`;

    await playAudioSource(wrongSound);

    if (sequenceId !== audioSequenceId) {
      return;
    }

    await wait(180);
    button.classList.remove("wrong");
    setAnswerCardsDisabled(false);
    playSoundButton.disabled = false;
    isProcessingAnswer = false;
    return;
  }

  questionAnswered = true;
  playScore += 1;
  playScoreElement.textContent = String(playScore);

  button.classList.add("correct");
  createStarEffect(button);
  playFeedback.textContent =
    `Sóc chọn đúng rồi! ${currentCorrectItem.upper} như ${currentCorrectItem.word.trim()}.`;

  await speakPraise("Giỏi quá! Bé chọn đúng rồi!");
  await wait(140);

  if (sequenceId !== audioSequenceId) {
    return;
  }

  await playAudioSource(correctSound);

  if (sequenceId !== audioSequenceId) {
    return;
  }

  nextQuestionButton.disabled = false;
  nextQuestionButton.textContent = currentQuestionNumber === TOTAL_QUESTIONS
    ? "Xem kết quả →"
    : "Câu tiếp theo →";

  playSoundButton.disabled = false;
  isProcessingAnswer = false;
}

function goToNextQuestion() {
  if (!questionAnswered || isProcessingAnswer) {
    return;
  }

  if (currentQuestionNumber >= TOTAL_QUESTIONS) {
    showPlayResult();
    return;
  }

  currentQuestionNumber += 1;
  createQuestion();
}

async function showPlayResult() {
  const sequenceId = ++audioSequenceId;
  stopCurrentAudio();

  isProcessingAnswer = true;
  questionAnswered = true;

  answerGrid.innerHTML = "";
  answerGrid.classList.add("hidden");
  resultPanel.classList.remove("hidden");

  resultScore.textContent = String(playScore);
  resultTotal.textContent = String(TOTAL_QUESTIONS);
  playInstructionElement.textContent = "Sóc đã hoàn thành thử thách!";
  playFeedback.textContent = getResultMessage(playScore);

  playSoundButton.disabled = true;
  nextQuestionButton.disabled = true;
  nextQuestionButton.textContent = "Chơi lại ↻";

  createFireworks(4700);
  await speakPraise("Xuất sắc! Bé đã hoàn thành thử thách. Chúc mừng bé!");
  await wait(160);

  if (sequenceId === audioSequenceId) {
    await playAudioSource(correctSound);
  }

  if (sequenceId === audioSequenceId) {
    nextQuestionButton.disabled = false;
    isProcessingAnswer = false;
  }
}

function getResultMessage(score) {
  if (score === TOTAL_QUESTIONS) {
    return "Xuất sắc! Sóc đã trả lời đúng tất cả câu hỏi.";
  }

  if (score >= 8) {
    return "Rất tốt! Sóc đã nhớ được nhiều chữ cái.";
  }

  if (score >= 5) {
    return "Khá tốt! Sóc hãy luyện thêm một lượt nữa nhé.";
  }

  return "Sóc hãy quay lại phần Học chữ rồi thử lại nhé.";
}

function restartPlayMode() {
  openPlayMode();
}

/* =========================================================
   SỰ KIỆN
========================================================= */

soundButton.addEventListener("click", playCurrentSound);
letterButton.addEventListener("click", playCurrentSound);
previousButton.addEventListener("click", showPreviousLetter);
nextButton.addEventListener("click", showNextLetter);
learnModeButton.addEventListener("click", openLearnMode);
playModeButton.addEventListener("click", openPlayMode);
homeButton.addEventListener("click", returnHome);
playHomeButton.addEventListener("click", returnHome);
playSoundButton.addEventListener("click", playQuestionSound);
nextQuestionButton.addEventListener("click", () => {
  const isResultScreen = !resultPanel.classList.contains("hidden");

  if (isResultScreen) {
    restartPlayMode();
  } else {
    goToNextQuestion();
  }
});

showScreen(homeScreen);
renderCurrentLetter();

/* =========================================================
   SERVICE WORKER
========================================================= */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js", {
      scope: "./",
      updateViaCache: "none"
    }).catch((error) => {
      console.warn("Không thể đăng ký Service Worker:", error);
    });
  });
}
