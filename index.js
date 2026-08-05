const express = require("express");
const app = express();

const PORT = process.env.PORT || 8080;

// =========================
// DATA
// =========================

const games = {};
const points = {};

// =========================
// CARDS
// =========================

const cards = [
  { n: "2", v: 2 },
  { n: "3", v: 3 },
  { n: "4", v: 4 },
  { n: "5", v: 5 },
  { n: "6", v: 6 },
  { n: "7", v: 7 },
  { n: "8", v: 8 },
  { n: "9", v: 9 },
  { n: "10", v: 10 },
  { n: "J", v: 10 },
  { n: "Q", v: 10 },
  { n: "K", v: 10 },
  { n: "A", v: 11 }
];

function draw() {
  return cards[Math.floor(Math.random() * cards.length)];
}

// =========================
// HAND TOTAL
// Soft / Hard Ace support
// =========================

function total(hand) {

  let sum = hand.reduce((a, c) => a + c.v, 0);

  let aces = hand.filter(c => c.n === "A").length;

  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }

  return sum;
}

function handText(hand) {
  return hand.map(c => c.n).join(" & ");
}

// =========================
// HOME
// =========================

app.get("/", (req, res) => {

  res.send("Blackjack API Running");

});

// =========================
// CHECK POINTS
// =========================

app.get("/points", (req, res) => {

  const user = req.query.user;

  if (!user) {
    return res.send("Missing username");
  }

  const balance = points[user] || 0;

  res.send(`💳 ${user} has ${balance} pts`);

});

// =========================
// ADD POINTS
// Browser only
// =========================

app.get("/points/add", (req, res) => {

  const user = req.query.user;
  const amount = parseInt(req.query.amount);

  if (!user || !Number.isInteger(amount) || amount <= 0) {
    return res.send("Invalid user or amount");
  }

  points[user] = (points[user] || 0) + amount;

  res.send(
    `💰 Added ${amount} pts to ${user}. Balance: ${points[user]} pts`
  );

});

// =========================
// REMOVE POINTS
// Browser only
// =========================

app.get("/points/remove", (req, res) => {

  const user = req.query.user;
  const amount = parseInt(req.query.amount);

  if (!user || !Number.isInteger(amount) || amount <= 0) {
    return res.send("Invalid user or amount");
  }

  points[user] = Math.max(
    0,
    (points[user] || 0) - amount
  );

  res.send(
    `💸 Removed ${amount} pts from ${user}. Balance: ${points[user]} pts`
  );

});

// =========================
// TOP 3 LEADERBOARD
// =========================

app.get("/points/top", (req, res) => {

  const leaderboard = Object.entries(points)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (leaderboard.length === 0) {
    return res.send("🏆 No players yet.");
  }

  const message = leaderboard
    .map(
      ([user, balance], index) =>
        `${index + 1}. ${user} - ${balance} pts`
    )
    .join(" | ");

  res.send(`🏆 TOP 3 | ${message}`);

});

// =========================
// RESET ALL POINTS
// Browser only
// =========================

app.get("/points/reset", (req, res) => {

  for (const user in points) {
    delete points[user];
  }

  for (const user in games) {
    delete games[user];
  }

  res.send("🔄 All points and active games reset.");

});

// =========================
// START BLACKJACK
// !bj <amount>
// =========================

app.get("/blackjack/start", (req, res) => {

  const user = req.query.user;
  const bet = parseInt(req.query.bet);

  if (!user) {
    return res.send("");
  }

  const balance = points[user] || 0;

  // No points = NO CHAT RESPONSE
  if (balance <= 0) {
    return res.send("");
  }

  // Invalid bet = no response
  if (!Number.isInteger(bet) || bet <= 0) {
    return res.send("");
  }

  // Bet greater than balance
  if (bet > balance) {
    return res.send("");
  }

  // Prevent card rerolling
  if (games[user]) {
    return res.send("");
  }

  const player = [
    draw(),
    draw()
  ];

  const dealer = [
    draw()
  ];

  games[user] = {
    player,
    dealer,
    bet
  };

  const playerTotal = total(player);

  res.send(
    `🃏 ${user} | Bet: ${bet} | ` +
    `Cards: ${handText(player)} (${playerTotal}) | ` +
    `Dealer: ${dealer[0].n} | !hit or !stand`
  );

});

// =========================
// HIT
// =========================

app.get("/blackjack/hit", (req, res) => {

  const user = req.query.user;

  if (!user) {
    return res.send("");
  }

  // No points = blank
  if ((points[user] || 0) <= 0) {
    return res.send("");
  }

  const game = games[user];

  // No game = blank
  if (!game) {
    return res.send("");
  }

  const card = draw();

  game.player.push(card);

  const playerTotal = total(game.player);

  // BUST
  if (playerTotal > 21) {

    points[user] = Math.max(
      0,
      points[user] - game.bet
    );

    const balance = points[user];

    delete games[user];

    return res.send(
      `💥 ${user} HIT ${card.n} → BUST ${playerTotal}! ` +
      `-${game.bet} pts | Balance: ${balance}`
    );
  }

  res.send(
    `👉 ${user} HIT ${card.n} → ` +
    `${handText(game.player)} (${playerTotal}) | ` +
    `!hit or !stand`
  );

});

// =========================
// STAND
// =========================

app.get("/blackjack/stand", (req, res) => {

  const user = req.query.user;

  if (!user) {
    return res.send("");
  }

  // No points = blank
  if ((points[user] || 0) <= 0) {
    return res.send("");
  }

  const game = games[user];

  // No active game = blank
  if (!game) {
    return res.send("");
  }

  // Dealer draws until 17+
  while (total(game.dealer) < 17) {
    game.dealer.push(draw());
  }

  const playerTotal = total(game.player);
  const dealerTotal = total(game.dealer);

  const bet = game.bet;

  let result = "";

  // =========================
  // PUSH
  // =========================

  if (playerTotal === dealerTotal) {

    result =
      `😐 ${user} PUSH | ` +
      `${playerTotal} vs Dealer ${dealerTotal} | ` +
      `Bet returned`;

  }

  // =========================
  // PLAYER WINS
  // =========================

  else if (
    dealerTotal > 21 ||
    playerTotal > dealerTotal
  ) {

    const winnings = Math.floor(bet * 1.9);

    points[user] += winnings;

    result =
      `🎉 ${user} WINS! ` +
      `${playerTotal} vs Dealer ${dealerTotal} | ` +
      `+${winnings} pts | ` +
      `Balance: ${points[user]}`;

  }

  // =========================
  // DEALER WINS
  // =========================

  else {

    points[user] = Math.max(
      0,
      points[user] - bet
    );

    result =
      `❌ ${user} LOSES | ` +
      `${playerTotal} vs Dealer ${dealerTotal} | ` +
      `-${bet} pts | ` +
      `Balance: ${points[user]}`;

  }

  delete games[user];

  res.send(result);

});

// =========================
// SERVER
// =========================

app.listen(PORT, "0.0.0.0", () => {

  console.log(
    `Blackjack server running on port ${PORT}`
  );

});
