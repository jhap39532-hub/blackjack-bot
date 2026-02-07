const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;

// Card deck with names + values
const cards = [
  { name: "2", value: 2 },
  { name: "3", value: 3 },
  { name: "4", value: 4 },
  { name: "5", value: 5 },
  { name: "6", value: 6 },
  { name: "7", value: 7 },
  { name: "8", value: 8 },
  { name: "9", value: 9 },
  { name: "10", value: 10 },
  { name: "J", value: 10 },
  { name: "Q", value: 10 },
  { name: "K", value: 10 },
  { name: "A", value: 11 }
];

const games = {};

// Draw random card
function draw() {
  return cards[Math.floor(Math.random() * cards.length)];
}

// Calculate hand with soft/hard Ace
function calculateHand(hand) {
  let total = hand.reduce((a, c) => a + c.value, 0);
  let aceCount = hand.filter(c => c.name === "A").length;

  while (total > 21 && aceCount > 0) {
    total -= 10; // Ace becomes 1
    aceCount--;
  }

  return total;
}

// Convert hand to readable text
function handText(hand) {
  return hand.map(c => c.name).join(" & ");
}

// Test route
app.get("/", (req, res) => {
  res.send("Blackjack API running");
});

// 🃏 Start
app.get("/blackjack/start", (req, res) => {
  const user = req.query.user;

  const player = [draw(), draw()];
  const dealer = [draw()];

  games[user] = { player, dealer, done: false };

  const total = calculateHand(player);

  res.send(
    `🃏 ${user} got ${handText(player)} (Total ${total}). ` +
    `Dealer shows ${dealer[0].name}. Type !hit or !stand`
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
    return res.send(
      `💥 BUST! ${user} got ${card.name}. Total ${total}. Dealer wins 😈`
    );
  }

  res.send(
    `🃏 ${user} HIT and got ${card.name}. Total ${total}. Hit or Stand?`
  );
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
    res.send(
      `🎉 ${user} WINS! ${playerTotal} vs Dealer ${dealerTotal}`
    );
  } else {
    res.send(
      `❌ ${user} loses. ${playerTotal} vs Dealer ${dealerTotal}`
    );
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
