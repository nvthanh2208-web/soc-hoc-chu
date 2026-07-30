"use strict";

const byId = (id) => document.getElementById(id);

const homeScreen = byId("homeScreen");
const learnScreen = byId("learnScreen");
const playScreen = byId("playScreen");
const learnModeButton = byId("learnModeButton");
const playModeButton = byId("playModeButton");
const homeButton = byId("homeButton");
const playHomeButton = byId("playHomeButton");
const currentNumberElement = byId("currentNumber");
const totalNumberElement = byId("totalNumber");
const letterButton = byId("letterButton");
const smallLetterElement = byId("smallLetter");
const letterImage = byId("letterImage");
const wordElement = byId("word");
const soundButton = byId("soundButton");
const previousButton = byId("previousButton");
const nextButton = byId("nextButton");
const statusMessage = byId("statusMessage");
const progressBar = byId("progressBar");
const learningCard = document.querySelector(".learningCard");
const playScoreElement = byId("playScore");
const questionNumberElement = byId("questionNumber");
const totalQuestionsElement = byId("totalQuestions");
const playInstructionElement = byId("playInstruction");
const playSoundButton = byId("playSoundButton");
const answerGrid = byId("answerGrid");
const playFeedback = byId("playFeedback");
const nextQuestionButton = byId("nextQuestionButton");
const resultPanel = byId("resultPanel");
const resultScore = byId("resultScore");
const resultTotal = byId("resultTotal");
const starEffectLayer = byId("starEffectLayer");

const TOTAL_QUESTIONS = 10;
const ANSWER_COUNT = 4;
const AUDIO_GAP_MS = 70;

let currentIndex = 0;
let playScore = 0;
let currentQuestionNumber = 1;
let currentCorrectItem = null;
let currentChoices = [];
let playQuestionPool = [];
let questionAnswered = false;
let answerBusy = false;
let activeAudio = null;
let audioSequence = 0;

const audioCache = new Map();

function getAudio(src) {
  if (!src) return null;
  if (!audioCache.has(src)) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = 1;
    audioCache.set(src, audio);
  }
  return audioCache.get(src);
}

const correctSound = getAudio("sounds/correct.mp3");
const wrongSound = getAudio("sounds/wrong.mp3");

function stopActiveAudio() {
  audioSequence += 1;
  if (!activeAudio) return;
  activeAudio.pause();
  activeAudio.currentTime = 0;
  activeAudio = null;
}

function playAudio(audio, sequenceId = audioSequence) {
  return new Promise((resolve) => {
    if (!audio || sequenceId !== audioSequence) {
      resolve(false);
      return;
    }

    if (activeAudio && activeAudio !== audio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }

    activeAudio = audio;
    audio.pause();
    audio.currentTime = 0;

    let finished = false;
    const done = (ok = true) => {
      if (finished) return;
      finished = true;
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      if (activeAudio === audio) activeAudio = null;
      resolve(ok && sequenceId === audioSequence);
    };
    const onEnded = () => done(true);
    const onError = () => done(false);

    audio.addEventListener("ended", onEnded, { once: true });
    audio.addEventListener("error", onError, { once: true });
    const promise = audio.play();
    if (promise) promise.catch(() => done(false));
  });
}

function wait(ms, sequenceId) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(sequenceId === audioSequence), ms);
  });
}

async function playFeedbackSequence(item, isCorrect, sequenceId) {
  const choiceAudio = getAudio(item.choiceSound || item.sound);
  await playAudio(choiceAudio, sequenceId);
  if (sequenceId !== audioSequence) return;
  await wait(AUDIO_GAP_MS, sequenceId);
  if (sequenceId !== audioSequence) return;
  await playAudio(isCorrect ? correctSound : wrongSound, sequenceId);
}

function preloadAudio(src) {
  const audio = getAudio(src);
  if (audio) audio.load();
}

function preloadImage(src) {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
}

function showScreen(screen) {
  homeScreen.classList.add("hidden");
  learnScreen.classList.add("hidden");
  playScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

function returnHome() {
  stopActiveAudio();
  answerBusy = false;
  showScreen(homeScreen);
}

function getCurrentLetter() {
  return alphabet[currentIndex];
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
  nextButton.textContent = isLastLetter ? "Học lại từ đầu ↻" : "Chữ tiếp theo →";
  statusMessage.textContent = `Đang học chữ ${item.upper}`;
  document.title = `${item.upper} - Sóc học chữ cái`;
  progressBar.style.width = `${((currentIndex + 1) / alphabet.length) * 100}%`;

  learningCard.classList.remove("is-changing");
  void learningCard.offsetWidth;
  learningCard.classList.add("is-changing");

  [currentIndex - 1, currentIndex + 1].forEach((index) => {
    if (index >= 0 && index < alphabet.length) preloadImage(alphabet[index].image);
  });
}

function playCurrentSound() {
  const item = getCurrentLetter();
  stopActiveAudio();
  const sequenceId = audioSequence;
  const audio = getAudio(item.sound);
  statusMessage.textContent = `Đang phát âm chữ ${item.upper}`;
  playAudio(audio, sequenceId).then((ok) => {
    if (ok) statusMessage.textContent = `${item.upper} như ${item.word.trim()}`;
  });
}

function showPreviousLetter() {
  if (currentIndex <= 0) return;
  currentIndex -= 1;
  renderCurrentLetter();
  playCurrentSound();
}

function showNextLetter() {
  currentIndex = currentIndex === alphabet.length - 1 ? 0 : currentIndex + 1;
  renderCurrentLetter();
  playCurrentSound();
}

function shuffleArray(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function prepareQuestionPool() {
  playQuestionPool = shuffleArray(alphabet).slice(0, TOTAL_QUESTIONS);
}

function openLearnMode() {
  stopActiveAudio();
  showScreen(learnScreen);
  renderCurrentLetter();
}

function openPlayMode() {
  stopActiveAudio();
  showScreen(playScreen);
  playScore = 0;
  currentQuestionNumber = 1;
  currentCorrectItem = null;
  currentChoices = [];
  questionAnswered = false;
  answerBusy = false;
  playSoundButton.disabled = false;
  nextQuestionButton.textContent = "Câu tiếp theo →";
  prepareQuestionPool();
  createQuestion();
}

function createQuestion() {
  stopActiveAudio();
  questionAnswered = false;
  answerBusy = false;
  playFeedback.textContent = "Sóc hãy chọn hình đúng nhé!";
  nextQuestionButton.disabled = true;
  nextQuestionButton.textContent = "Câu tiếp theo →";
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
  playInstructionElement.textContent = `Hãy chọn hình minh họa cho chữ ${currentCorrectItem.upper}`;
  renderAnswerChoices();

  preloadAudio(currentCorrectItem.sound);
  currentChoices.forEach((item) => preloadAudio(item.choiceSound || item.sound));
  preloadNextQuestionAssets();

  // Tự động đọc câu hỏi ngay khi mở trò chơi hoặc chuyển sang câu mới.
  // Hàm createQuestion được gọi từ thao tác bấm của người dùng nên hoạt động tốt trên iPhone.
  playQuestionSound({ automatic: true });
}

function renderAnswerChoices() {
  answerGrid.replaceChildren();
  const fragment = document.createDocumentFragment();

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
    image.loading = "eager";
    image.decoding = "async";

    const label = document.createElement("span");
    label.textContent = item.word.trim();

    imageWrap.appendChild(image);
    button.append(imageWrap, label);
    button.addEventListener("click", () => checkPlayAnswer(button, item));
    fragment.appendChild(button);
  });

  answerGrid.appendChild(fragment);
}

function setAnswerCardsDisabled(disabled) {
  answerGrid.querySelectorAll(".answerCard").forEach((button) => {
    button.disabled = disabled;
  });
}

async function checkPlayAnswer(button, selectedItem) {
  if (questionAnswered || answerBusy) return;

  answerBusy = true;
  setAnswerCardsDisabled(true);
  stopActiveAudio();
  const sequenceId = audioSequence;
  const isCorrect = selectedItem.id === currentCorrectItem.id;

  if (!isCorrect) {
    button.classList.add("wrong");
    playFeedback.textContent = `${selectedItem.upper} chưa đúng. Sóc thử lại nhé!`;
    await playFeedbackSequence(selectedItem, false, sequenceId);
    button.classList.remove("wrong");
    if (!questionAnswered) setAnswerCardsDisabled(false);
    answerBusy = false;
    return;
  }

  questionAnswered = true;
  playScore += 1;
  playScoreElement.textContent = String(playScore);
  button.classList.add("correct");
  createStarEffect(button);
  playFeedback.textContent = `Sóc chọn đúng rồi! ${currentCorrectItem.upper} như ${currentCorrectItem.word.trim()}.`;

  // Mở nút ngay lập tức; không chờ chuỗi âm thanh kết thúc.
  nextQuestionButton.disabled = false;
  nextQuestionButton.textContent = currentQuestionNumber === TOTAL_QUESTIONS
    ? "Xem kết quả →"
    : "Câu tiếp theo →";
  nextQuestionButton.scrollIntoView({ block: "nearest", behavior: "smooth" });

  // Phát âm thanh nền; người dùng có thể chuyển câu ngay.
  playFeedbackSequence(selectedItem, true, sequenceId).finally(() => {
    answerBusy = false;
  });
}

function playQuestionSound({ automatic = false } = {}) {
  if (!currentCorrectItem || answerBusy || questionAnswered) return;

  stopActiveAudio();
  const sequenceId = audioSequence;
  playFeedback.textContent = `Đang phát âm chữ ${currentCorrectItem.upper}`;

  playAudio(getAudio(currentCorrectItem.sound), sequenceId).then((ok) => {
    if (ok && !questionAnswered) {
      playFeedback.textContent = "Sóc hãy chọn hình đúng nhé!";
    } else if (!ok && automatic && !questionAnswered) {
      // Safari có thể chặn tự phát trong một số trường hợp; nút Sóc nghe vẫn dùng được.
      playFeedback.textContent = "Bấm Sóc nghe câu hỏi nếu chưa nghe rõ nhé!";
    }
  });
}

function preloadNextQuestionAssets() {
  const next = playQuestionPool[currentQuestionNumber];
  if (!next) return;
  preloadImage(next.image);
  preloadAudio(next.sound);
  preloadAudio(next.choiceSound || next.sound);
}

function createStarEffect(button) {
  const rect = button.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  for (let index = 0; index < 5; index += 1) {
    const star = document.createElement("div");
    star.className = "flyingStar";
    star.textContent = "⭐";
    star.style.left = `${centerX + (Math.random() - 0.5) * 140}px`;
    star.style.top = `${centerY + (Math.random() - 0.5) * 40}px`;
    star.style.animationDelay = `${index * 0.06}s`;
    starEffectLayer.appendChild(star);
    window.setTimeout(() => star.remove(), 1300);
  }
}

function goToNextQuestion() {
  if (!questionAnswered) return;
  stopActiveAudio();
  answerBusy = false;

  if (currentQuestionNumber >= TOTAL_QUESTIONS) {
    showPlayResult();
    return;
  }

  currentQuestionNumber += 1;
  createQuestion();
}

function createFireworks(duration = 4500) {
  const oldLayer = document.querySelector(".fireworksLayer");
  if (oldLayer) oldLayer.remove();

  const layer = document.createElement("div");
  layer.className = "fireworksLayer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  const symbols = ["⭐", "✨", "🎉", "🎊"];
  const launchBurst = () => {
    const centerX = 10 + Math.random() * 80;
    const centerY = 12 + Math.random() * 55;

    for (let index = 0; index < 16; index += 1) {
      const particle = document.createElement("span");
      particle.className = "fireworkParticle";
      particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];

      const angle = (Math.PI * 2 * index) / 16 + Math.random() * 0.25;
      const distance = 70 + Math.random() * 150;
      particle.style.left = `${centerX}%`;
      particle.style.top = `${centerY}%`;
      particle.style.setProperty("--firework-x", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--firework-y", `${Math.sin(angle) * distance}px`);
      particle.style.animationDelay = `${Math.random() * 90}ms`;
      layer.appendChild(particle);
      particle.addEventListener("animationend", () => particle.remove(), { once: true });
    }
  };

  launchBurst();
  const intervalId = window.setInterval(launchBurst, 520);
  window.setTimeout(() => {
    window.clearInterval(intervalId);
    window.setTimeout(() => layer.remove(), 1300);
  }, duration);
}

function showPlayResult() {
  stopActiveAudio();
  answerGrid.replaceChildren();
  answerGrid.classList.add("hidden");
  resultPanel.classList.remove("hidden");
  resultScore.textContent = String(playScore);
  resultTotal.textContent = String(TOTAL_QUESTIONS);
  playInstructionElement.textContent = "Sóc đã hoàn thành thử thách!";
  playFeedback.textContent = getResultMessage(playScore);
  playSoundButton.disabled = true;
  nextQuestionButton.disabled = false;
  nextQuestionButton.textContent = "Chơi lại ↻";
  questionAnswered = true;

  // Khôi phục hiệu ứng chúc mừng và âm thanh tán dương khi kết thúc.
  createFireworks(4500);
  const sequenceId = audioSequence;
  playAudio(correctSound, sequenceId);
}

function getResultMessage(score) {
  if (score === TOTAL_QUESTIONS) return "Xuất sắc! Sóc đã trả lời đúng tất cả câu hỏi.";
  if (score >= 8) return "Rất tốt! Sóc đã nhớ được nhiều chữ cái.";
  if (score >= 5) return "Khá tốt! Sóc hãy luyện thêm một lượt nữa nhé.";
  return "Sóc hãy quay lại phần Học chữ rồi thử lại nhé.";
}

function restartPlayMode() {
  openPlayMode();
}

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
  if (currentQuestionNumber >= TOTAL_QUESTIONS && resultPanel.classList.contains("hidden") === false) {
    restartPlayMode();
    return;
  }
  if (currentQuestionNumber >= TOTAL_QUESTIONS && questionAnswered) {
    showPlayResult();
    return;
  }
  goToNextQuestion();
});

showScreen(homeScreen);
renderCurrentLetter();
preloadAudio("sounds/correct.mp3");
preloadAudio("sounds/wrong.mp3");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" })
      .catch((error) => console.warn("Không thể đăng ký Service Worker:", error));
  });
}
