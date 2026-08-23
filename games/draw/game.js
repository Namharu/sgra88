const setup = document.querySelector('#setup');
const game = document.querySelector('#game');
const totalInput = document.querySelector('#total');
const winnerInput = document.querySelector('#winners');
const orderedInput = document.querySelector('#ordered');
const errorBox = document.querySelector('#setupError');
const board = document.querySelector('#board');
const foundBox = document.querySelector('#found');
const summary = document.querySelector('#summary');
const winnerNumbers = document.querySelector('#winnerNumbers');
const celebration = document.querySelector('#celebration');

let settings = { total: 30, winners: 10, ordered: false };
let winningNumbers = new Set();
let foundNumbers = [];
let audioContext;
let layout = { columns: 6, rows: 5 };

function getAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  audioContext ??= new AudioContext();
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function playTone(frequency, start, duration, type = 'sine', volume = .13, endFrequency = frequency) {
  const context = getAudioContext();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const beginsAt = context.currentTime + start;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, beginsAt);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, beginsAt + duration);
  gain.gain.setValueAtTime(.001, beginsAt);
  gain.gain.exponentialRampToValueAtTime(volume, beginsAt + .015);
  gain.gain.exponentialRampToValueAtTime(.001, beginsAt + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(beginsAt);
  oscillator.stop(beginsAt + duration + .02);
}

function playMissSound() {
  playTone(210, 0, .38, 'square', .11, 105);
  playTone(105, .04, .34, 'sine', .16, 82);
}

function playWinSound() {
  [659.25, 783.99, 987.77, 1318.51].forEach((frequency, index) => {
    playTone(frequency, index * .095, .46, 'sine', .12);
    playTone(frequency * 2, index * .095, .24, 'sine', .035);
  });
}

function secureShuffle(values) {
  const result = [...values];
  const random = new Uint32Array(result.length);
  crypto.getRandomValues(random);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = random[index] % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function validate() {
  const total = Number(totalInput.value);
  const winners = Number(winnerInput.value);
  if (!Number.isInteger(total) || total < 2 || total > 100) return '참여 인원은 2명부터 100명까지 입력해 주세요.';
  if (!Number.isInteger(winners) || winners < 1 || winners >= total) return '당첨 인원은 참여 인원보다 적게 입력해 주세요.';
  settings = { total, winners, ordered: orderedInput.checked };
  return '';
}

function makeCard(number) {
  const card = document.createElement('button');
  card.className = 'card';
  card.type = 'button';
  card.dataset.number = number;
  card.setAttribute('aria-label', `${number}번 선택`);
  card.innerHTML = `<span class="card-inner"><strong>${number}</strong><span class="back"><b></b><em></em></span></span>`;
  card.addEventListener('click', () => reveal(card, number));
  return card;
}

function fitBoardToScreen() {
  if (game.hidden || !board.childElementCount) return;
  const gap = window.innerWidth <= 650 ? 4 : 12;
  const top = board.getBoundingClientRect().top;
  const availableWidth = Math.min(1100, game.clientWidth - 8);
  const availableHeight = Math.max(260, window.innerHeight - top - 20);
  const cellByWidth = (availableWidth - gap * (layout.columns - 1)) / layout.columns;
  const cellByHeight = (availableHeight - gap * (layout.rows - 1)) / layout.rows;
  const cell = Math.max(26, Math.floor(Math.min(110, cellByWidth, cellByHeight)));
  board.style.width = `${cell * layout.columns + gap * (layout.columns - 1)}px`;
  board.style.setProperty('--number-size', `${Math.max(12, Math.min(49, cell * .44))}px`);
  board.style.setProperty('--result-size', `${Math.max(10, Math.min(39, cell * .36))}px`);
}

function startRound() {
  winningNumbers = new Set(secureShuffle(Array.from({ length: settings.total }, (_, index) => index + 1)).slice(0, settings.winners));
  foundNumbers = [];
  const columns = Math.ceil(Math.sqrt(settings.total));
  const rows = Math.ceil(settings.total / columns);
  layout = { columns, rows };
  board.style.setProperty('--columns', columns);
  board.style.setProperty('--rows', rows);
  board.replaceChildren(...Array.from({ length: settings.total }, (_, index) => makeCard(index + 1)));
  foundBox.textContent = `0 / ${settings.winners}`;
  summary.hidden = true;
  setup.hidden = true;
  game.hidden = false;
  requestAnimationFrame(fitBoardToScreen);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function reveal(card, number) {
  if (card.classList.contains('revealed') || !summary.hidden) return;
  const isWinner = winningNumbers.has(number);
  const backTitle = card.querySelector('.back b');
  const backDetail = card.querySelector('.back em');
  card.classList.add('revealed', isWinner ? 'winner' : 'loser');
  card.disabled = true;
  if (isWinner) {
    playWinSound();
    foundNumbers.push(number);
    backTitle.textContent = '당첨';
    backDetail.textContent = settings.ordered ? `${foundNumbers.length}번째 당첨` : '';
    foundBox.textContent = `${foundNumbers.length} / ${settings.winners}`;
    card.classList.add('hit');
    burst();
    if (foundNumbers.length === settings.winners) window.setTimeout(finishRound, 720);
  } else {
    playMissSound();
    backTitle.textContent = '꽝';
    backDetail.textContent = '';
  }
}

function finishRound() {
  const result = settings.ordered ? foundNumbers : [...foundNumbers].sort((a, b) => a - b);
  winnerNumbers.textContent = `당첨 번호 · ${result.join(', ')}`;
  summary.hidden = false;
  burst(34);
  summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function burst(count = 18) {
  const colors = ['#ff3f88', '#fff238', '#32c7e7', '#7165ef', '#ff8b3d'];
  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement('i');
    piece.className = 'confetti';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty('--drift', `${(Math.random() - .5) * 240}px`);
    piece.style.animationDelay = `${Math.random() * .25}s`;
    celebration.append(piece);
    window.setTimeout(() => piece.remove(), 2100);
  }
}

document.querySelector('#start').addEventListener('click', () => {
  errorBox.textContent = validate();
  if (!errorBox.textContent) startRound();
});

document.querySelector('#reset').addEventListener('click', () => {
  game.hidden = true;
  setup.hidden = false;
});

document.querySelector('#replay').addEventListener('click', startRound);
window.addEventListener('resize', fitBoardToScreen);
[totalInput, winnerInput].forEach(input => input.addEventListener('keydown', event => {
  if (event.key === 'Enter') document.querySelector('#start').click();
}));
