const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;

const games = {};
const cards = [2,3,4,5,6,7,8,9,10,10,10,11];

// Draw random card
function draw() {
  return cards[Math.floor(Math.random() * cards.length)];
}

// ✅ SOFT / HARD ACE HAND CALCULATOR
function calculateHand(hand) {
  let total = hand.reduce((a, b) => a + b, 0);
  let aceCount = hand.filter(c => c === 11).length;

  while (total > 21 && aceCount > 0) {
    total -= 10; // Ace becomes 1
    aceCount--;
  }

  return total;
}

// Test route
app.get("/", (req, res) => {
  res.send("Blackjack API running");
});

// 🃏 Start game
app.get("/blackjack/start", (req, res) => {
  const user = req.query.user;
  const player = [draw(), draw()];
  const dealer = [draw()];

  games[user] = { player, dealer, done: false };

  const total = calculateHand(player);

  res.send(
    `🃏 ${user} got ${player.join(" & ")} (Total ${total}). ` +
    `Dealer shows ${dealer[0]}. Type !hit or !stand`
  );
});

// 🃏 Hit
app.get("/blackjack/hit", (req, res) => {
  const user = req.query.user;
  const game = games[user];

  if (!game || game.done) {
    return res.send("❌ Start game using !blackjack");
  }

  const card = draw();
  game.player.push(card);

  const total = calculateHand(game.player);

  if (total > 21) {
    game.done = true;
    return res.send(`💥 BUST! ${user} got ${card}. Total ${total}. Dealer wins 😈`);
  }

  res.send(`🃏 ${user} HIT and got ${card}. Total ${total}. Hit or Stand?`);
});

// 🛑 Stand
app.get("/blackjack/stand", (req, res) => {
  const user = req.query.user;
  const game = games[user];

  if (!game || game.done) {
    return res.send("❌ No active game.");
  }

  while (calculateHand(game.dealer) < 17) {
    game.dealer.push(draw());
  }

  const playerTotal = calculateHand(game.player);
  const dealerTotal = calculateHand(game.dealer);
  game.done = true;

  if (dealerTotal > 21 || playerTotal > dealerTotal) {
    res.send(`🎉 ${user} WINS! ${playerTotal} vs Dealer ${dealerTotal}`);
  } else {
    res.send(`❌ ${user} loses. ${playerTotal} vs Dealer ${dealerTotal}`);
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
