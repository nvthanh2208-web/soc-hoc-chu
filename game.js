"use strict";
const homeScreen =
  document.getElementById("homeScreen");

const learnScreen =
  document.getElementById("learnScreen");

const playScreen =
  document.getElementById("playScreen");

const learnModeButton =
  document.getElementById("learnModeButton");

const playModeButton =
  document.getElementById("playModeButton");

const homeButton =
  document.getElementById("homeButton");

const playHomeButton =
  document.getElementById("playHomeButton");
const currentNumberElement =
  document.getElementById("currentNumber");

const totalNumberElement =
  document.getElementById("totalNumber");

const letterButton =
  document.getElementById("letterButton");

const smallLetterElement =
  document.getElementById("smallLetter");

const letterImage =
  document.getElementById("letterImage");

const wordElement =
  document.getElementById("word");

const soundButton =
  document.getElementById("soundButton");

const previousButton =
  document.getElementById("previousButton");

const nextButton =
  document.getElementById("nextButton");

const statusMessage =
  document.getElementById("statusMessage");

const progressBar =
  document.getElementById("progressBar");
const learningCard =
  document.querySelector(".learningCard");

  const playScoreElement =
  document.getElementById("playScore");

const questionNumberElement =
  document.getElementById("questionNumber");

const totalQuestionsElement =
  document.getElementById("totalQuestions");

const playInstructionElement =
  document.getElementById("playInstruction");

const playSoundButton =
  document.getElementById("playSoundButton");

const answerGrid =
  document.getElementById("answerGrid");

const playFeedback =
  document.getElementById("playFeedback");

const nextQuestionButton =
  document.getElementById("nextQuestionButton");

  const TOTAL_QUESTIONS = 10;
const ANSWER_COUNT = 4;
const resultPanel =
  document.getElementById("resultPanel");

const resultScore =
  document.getElementById("resultScore");

const resultTotal =
  document.getElementById("resultTotal");

  const starEffectLayer =
  document.getElementById("starEffectLayer");

const correctSound =
  new Audio("sounds/correct.mp3");
correctSound.preload = "auto";

const wrongSound =
  new Audio("sounds/wrong.mp3");
wrongSound.preload = "auto";

let playScore = 0;
let currentQuestionNumber = 1;
let currentCorrectItem = null;
let currentChoices = [];
let questionAnswered = false;
let currentIndex = 0;
let currentAudio = null;
let playQuestionPool = [];
function stopCurrentAudio() {
  if (!currentAudio) {
    return;
  }

  currentAudio.pause();
  currentAudio.currentTime = 0;
}

function playEffectSound(audio) {
  audio.pause();
  audio.currentTime = 0;

  audio.play().catch(() => {
    // Không làm gián đoạn game nếu trình duyệt chặn âm thanh.
  });
}

function createStarEffect(button) {
  const buttonRect =
    button.getBoundingClientRect();

  const centerX =
    buttonRect.left + buttonRect.width / 2;

  const centerY =
    buttonRect.top + buttonRect.height / 2;

  const starCount = 5;

  for (let index = 0; index < starCount; index += 1) {
    const star =
      document.createElement("div");

    star.className = "flyingStar";
    star.textContent = "⭐";

    const horizontalOffset =
      (Math.random() - 0.5) * 140;

    const verticalOffset =
      (Math.random() - 0.5) * 40;

    star.style.left =
      `${centerX + horizontalOffset}px`;

    star.style.top =
      `${centerY + verticalOffset}px`;

    star.style.animationDelay =
      `${index * 0.08}s`;

    starEffectLayer.appendChild(star);

    window.setTimeout(() => {
      star.remove();
    }, 1400);
  }
}
function prepareQuestionPool() {
  playQuestionPool =
    shuffleArray(alphabet).slice(0, TOTAL_QUESTIONS);
}
function showScreen(screen) {
  homeScreen.classList.add("hidden");
  learnScreen.classList.add("hidden");
  playScreen.classList.add("hidden");

  screen.classList.remove("hidden");
}

function openLearnMode() {
  showScreen(learnScreen);
  renderCurrentLetter();
}

function openPlayMode() {
  showScreen(playScreen);

  playScore = 0;
  currentQuestionNumber = 1;
  currentCorrectItem = null;
  currentChoices = [];
  questionAnswered = false;

  playSoundButton.disabled = false;
  nextQuestionButton.textContent =
    "Câu tiếp theo →";
  prepareQuestionPool();
  createQuestion();
}

function returnHome() {
  stopCurrentAudio();
  showScreen(homeScreen);
}
function getCurrentLetter() {
  return alphabet[currentIndex];
}

function renderCurrentLetter() {
  const item = getCurrentLetter();

  currentNumberElement.textContent =
    String(currentIndex + 1);

  totalNumberElement.textContent =
    String(alphabet.length);

  letterButton.textContent =
    item.upper;

  smallLetterElement.textContent =
    item.lower;

  letterImage.src =
    item.image;

  letterImage.alt =
    item.word;

  wordElement.textContent =
    item.word;

  preloadNearbyLearningImages();

  previousButton.disabled =
    currentIndex === 0;

    const isLastLetter =
        currentIndex === alphabet.length - 1;

    nextButton.disabled = false;

    nextButton.textContent = isLastLetter
        ? "Học lại từ đầu ↻"
        : "Chữ tiếp theo →";
  statusMessage.textContent =
    `Đang học chữ ${item.upper}`;

  document.title =
    `${item.upper} - Sò học chữ cái`;
    const progressPercent =
  ((currentIndex + 1) / alphabet.length) * 100;

    progressBar.style.width =
  ` ${progressPercent}%`;
  learningCard.classList.remove("is-changing");

void learningCard.offsetWidth;

learningCard.classList.add("is-changing");
}

function preloadNearbyLearningImages() {
  const nearbyIndexes = [currentIndex - 1, currentIndex + 1];

  nearbyIndexes.forEach((index) => {
    if (index < 0 || index >= alphabet.length) {
      return;
    }

    const image = new Image();
    image.src = alphabet[index].image;
  });
}

function playCurrentSound() {
  const item = getCurrentLetter();

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  currentAudio = new Audio(item.sound);

  statusMessage.textContent =
    `Đang phát âm chữ ${item.upper}`;

  currentAudio.addEventListener("ended", () => {
    statusMessage.textContent =
      `${item.upper} như ${item.word}`;
  });

  currentAudio.addEventListener("error", () => {
    statusMessage.textContent =
      `Không thể phát âm thanh chữ ${item.upper}`;
  });

  currentAudio.play().catch(() => {
    statusMessage.textContent =
      "Hãy bấm nút Sò nghe lại để phát âm thanh.";
  });
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
  const isLastLetter =
    currentIndex === alphabet.length - 1;

  if (isLastLetter) {
    currentIndex = 0;
  } else {
    currentIndex += 1;
  }

  renderCurrentLetter();
  playCurrentSound();
}
soundButton.addEventListener(
  "click",
  playCurrentSound
);

letterButton.addEventListener(
  "click",
  playCurrentSound
);

previousButton.addEventListener(
  "click",
  showPreviousLetter
);

nextButton.addEventListener(
  "click",
  showNextLetter
);


learnModeButton.addEventListener(
  "click",
  openLearnMode
);

playModeButton.addEventListener(
  "click",
  openPlayMode
);

homeButton.addEventListener(
  "click",
  returnHome
);

playHomeButton.addEventListener(
  "click",
  returnHome
);
function shuffleArray(items) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex =
      Math.floor(Math.random() * (index + 1));

    [result[index], result[randomIndex]] =
      [result[randomIndex], result[index]];
  }

  return result;
}
function createQuestion() {
  questionAnswered = false;

  playFeedback.textContent = "";
  nextQuestionButton.disabled = true;
  nextQuestionButton.textContent = "Câu tiếp theo →";

  resultPanel.classList.add("hidden");
  answerGrid.classList.remove("hidden");

  currentCorrectItem =
    playQuestionPool[currentQuestionNumber - 1];

  const wrongChoices =
    shuffleArray(
      alphabet.filter(
        (item) => item.id !== currentCorrectItem.id
      )
    ).slice(0, ANSWER_COUNT - 1);

  currentChoices =
    shuffleArray([
      currentCorrectItem,
      ...wrongChoices
    ]);

  playScoreElement.textContent =
    String(playScore);

  questionNumberElement.textContent =
    String(currentQuestionNumber);

  totalQuestionsElement.textContent =
    String(TOTAL_QUESTIONS);

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
    const button =
      document.createElement("button");

    button.type = "button";
    button.className = "answerCard";

    const image =
      document.createElement("img");

    image.src = item.image;
    image.alt = item.word;
    image.width = 512;
    image.height = 512;
    image.loading = "lazy";
    image.decoding = "async";

    const imageWrap =
      document.createElement("div");

    imageWrap.className = "answerImageWrap";
    imageWrap.appendChild(image);

    const label =
      document.createElement("span");

    label.textContent = item.word;

    button.append(imageWrap, label);

    button.addEventListener("click", () => {
      checkPlayAnswer(button, item);
    });

    answerGrid.appendChild(button);
  });
}
function playQuestionSound() {
  if (!currentCorrectItem) {
    return;
  }

  stopCurrentAudio();

  currentAudio =
    new Audio(currentCorrectItem.sound);

  playFeedback.textContent =
    `Đang phát âm chữ ${currentCorrectItem.upper}`;

  currentAudio.addEventListener("ended", () => {
    if (!questionAnswered) {
      playFeedback.textContent =
        "Sò hãy chọn hình đúng nhé!";
    }
  });

  currentAudio.addEventListener("error", () => {
    playFeedback.textContent =
      "Không thể phát âm thanh câu hỏi.";
  });

  currentAudio.play().catch(() => {
    playFeedback.textContent =
      "Hãy bấm Sò Nghe câu hỏi để phát âm thanh.";
  });
}
function checkPlayAnswer(button, selectedItem) {
  if (questionAnswered) {
    return;
  }

  const isCorrect =
    selectedItem.id === currentCorrectItem.id;

  if (!isCorrect) {
    button.classList.add("wrong");
    stopCurrentAudio();
    playEffectSound(wrongSound);

    playFeedback.textContent =
      "Chưa đúng. Sò thử lại nhé!";

    window.setTimeout(() => {
      button.classList.remove("wrong");
    }, 500);

    return;
  }

  questionAnswered = true;
  playScore += 1;

  playScoreElement.textContent =
    String(playScore);

  button.classList.add("correct");
  stopCurrentAudio();
  playEffectSound(correctSound);
  createStarEffect(button);

  playFeedback.textContent =
    `Sò chọn đúng rồi! ${currentCorrectItem.upper} như ${currentCorrectItem.word}.`;

  disableAnswerCards();

  nextQuestionButton.disabled = false;

  if (currentQuestionNumber === TOTAL_QUESTIONS) {
    nextQuestionButton.textContent =
      "Xem kết quả →";
  } else {
    nextQuestionButton.textContent =
      "Câu tiếp theo →";
  }
}
function disableAnswerCards() {
  const buttons =
    answerGrid.querySelectorAll(".answerCard");

  buttons.forEach((button) => {
    button.disabled = true;
  });
}
function goToNextQuestion() {
  if (!questionAnswered) {
    return;
  }

  const gameFinished =
    currentQuestionNumber >= TOTAL_QUESTIONS;

  const isResultScreen =
    gameFinished &&
    answerGrid.children.length === 0;

  if (isResultScreen) {
    restartPlayMode();
    return;
  }

  if (gameFinished) {
    showPlayResult();
    return;
  }

  currentQuestionNumber += 1;
  createQuestion();
}
function showPlayResult() {
  stopCurrentAudio();

  answerGrid.innerHTML = "";
  answerGrid.classList.add("hidden");

  resultPanel.classList.remove("hidden");

  resultScore.textContent =
    String(playScore);

  resultTotal.textContent =
    String(TOTAL_QUESTIONS);

  playInstructionElement.textContent =
    "Sò đã hoàn thành thử thách!";

  playFeedback.textContent =
    getResultMessage(playScore);

  playSoundButton.disabled = true;

  nextQuestionButton.disabled = false;
  nextQuestionButton.textContent =
    "Chơi lại ↻";

  questionAnswered = true;
}
function getResultMessage(score) {
  if (score === TOTAL_QUESTIONS) {
    return "Xuất sắc! Sò đã trả lời đúng tất cả câu hỏi.";
  }

  if (score >= 8) {
    return "Rất tốt! Sò đã nhớ được nhiều chữ cái.";
  }

  if (score >= 5) {
    return "Khá tốt! Sò hãy luyện thêm một lượt nữa nhé.";
  }

  return "Sò hãy quay lại phần Học chữ rồi thử lại nhé.";
}
function restartPlayMode() {
  stopCurrentAudio();

  playScore = 0;
  currentQuestionNumber = 1;
  currentCorrectItem = null;
  currentChoices = [];
  questionAnswered = false;

  playSoundButton.disabled = false;

  nextQuestionButton.disabled = true;
  nextQuestionButton.textContent = "Câu tiếp theo →";
  prepareQuestionPool();
  createQuestion();
}
playSoundButton.addEventListener(
  "click",
  playQuestionSound
);

nextQuestionButton.addEventListener(
  "click",
  goToNextQuestion
);

showScreen(homeScreen);
renderCurrentLetter();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.warn("Không thể đăng ký Service Worker:", error);
    });
  });
}
