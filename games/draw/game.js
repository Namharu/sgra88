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

function startRound() {
  winningNumbers = new Set(secureShuffle(Array.from({ length: settings.total }, (_, index) => index + 1)).slice(0, settings.winners));
  foundNumbers = [];
  board.replaceChildren(...Array.from({ length: settings.total }, (_, index) => makeCard(index + 1)));
  foundBox.textContent = `0 / ${settings.winners}`;
  summary.hidden = true;
  setup.hidden = true;
  game.hidden = false;
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
    foundNumbers.push(number);
    backTitle.textContent = '당첨';
    backDetail.textContent = settings.ordered ? `${foundNumbers.length}번째 당첨` : '';
    foundBox.textContent = `${foundNumbers.length} / ${settings.winners}`;
    card.classList.add('hit');
    burst();
    if (foundNumbers.length === settings.winners) window.setTimeout(finishRound, 720);
  } else {
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
[totalInput, winnerInput].forEach(input => input.addEventListener('keydown', event => {
  if (event.key === 'Enter') document.querySelector('#start').click();
}));
