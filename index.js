const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const games = {};
const cards = [2,3,4,5,6,7,8,9,10,10,10,11];

function draw() {
  return cards[Math.floor(Math.random()*cards.length)];
}

app.get("/", (req,res)=>{
  res.send("Blackjack API running");
});

app.get("/blackjack/start", (req,res)=>{
  const user = req.query.user;
  const player = [draw(), draw()];
  const dealer = [draw()];
  games[user] = { player, dealer, done:false };

  const total = player.reduce((a,b)=>a+b,0);
  res.send(`🃏 ${user} got ${player.join(" & ")} (Total ${total}). Dealer shows ${dealer[0]}. Type !hit or !stand`);
});

app.get("/blackjack/hit", (req,res)=>{
  const user = req.query.user;
  const game = games[user];
  if(!game || game.done) return res.send("❌ Start game using !blackjack");

  const card = draw();
  game.player.push(card);
  const total = game.player.reduce((a,b)=>a+b,0);

  if(total > 21){
    game.done = true;
    return res.send(`💥 BUST! ${user} got ${card}. Total ${total}. Dealer wins 😈`);
  }

  res.send(`🃏 ${user} HIT and got ${card}. Total ${total}. Hit or Stand?`);
});

app.get("/blackjack/stand", (req,res)=>{
  const user = req.query.user;
  const game = games[user];
  if(!game || game.done) return res.send("❌ No active game.");

  let dealerTotal = game.dealer[0];
  while(dealerTotal < 17) dealerTotal += draw();

  const playerTotal = game.player.reduce((a,b)=>a+b,0);
  game.done = true;

  if(dealerTotal > 21 || playerTotal > dealerTotal)
    res.send(`🎉 ${user} WINS! ${playerTotal} vs Dealer ${dealerTotal}`);
  else
    res.send(`❌ ${user} loses. ${playerTotal} vs Dealer ${dealerTotal}`);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
