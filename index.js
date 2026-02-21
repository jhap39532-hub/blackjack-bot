const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;

const games = {};

const cards = [
  {n:"2",v:2},{n:"3",v:3},{n:"4",v:4},{n:"5",v:5},
  {n:"6",v:6},{n:"7",v:7},{n:"8",v:8},{n:"9",v:9},
  {n:"10",v:10},{n:"J",v:10},{n:"Q",v:10},{n:"K",v:10},
  {n:"A",v:11}
];

function draw(){
  return cards[Math.floor(Math.random()*cards.length)];
}

function total(hand){
  let sum = hand.reduce((a,c)=>a+c.v,0);
  let aces = hand.filter(c=>c.n==="A").length;
  while(sum>21 && aces>0){
    sum -= 10;
    aces--;
  }
  return sum;
}

function text(hand){
  return hand.map(c=>c.n).join(" & ");
}

app.get("/", (req,res)=>{
  res.send("Blackjack API running");
});

/* START GAME */
app.get("/blackjack/start",(req,res)=>{
  const user=req.query.user;

  if(games[user] && !games[user].done){
    return res.send("❌ Finish your current game first (!hit or !stand)");
  }

  const player=[draw(),draw()];
  const dealer=[draw()];

  games[user]={player,dealer,done:false};

  res.send(
    `🃏 ${user} got ${text(player)} (Total ${total(player)}). ` +
    `Dealer shows ${dealer[0].n}. !hit or !stand`
  );
});

/* HIT */
app.get("/blackjack/hit",(req,res)=>{
  const user=req.query.user;
  const game=games[user];

  if(!game || game.done)
    return res.send("❌ Start game using !blackjack");

  const card=draw();
  game.player.push(card);

  if(total(game.player)>21){
    game.done=true;
    delete games[user];
    return res.send(`💥 BUST! Dealer wins 😈`);
  }

  res.send(`🃏 HIT ${card.n}. Total ${total(game.player)}.`);
});

/* STAND */
app.get("/blackjack/stand",(req,res)=>{
  const user=req.query.user;
  const game=games[user];

  if(!game || game.done)
    return res.send("❌ No active game.");

  while(total(game.dealer)<17){
    game.dealer.push(draw());
  }

  const p=total(game.player);
  const d=total(game.dealer);

  let message="";

  if(p===d){
    message="😐 PUSH!";
  }
  else if(d>21 || p>d){
    message="🎉 YOU WIN!";
  }
  else{
    message="❌ Dealer wins 😈";
  }

  delete games[user];
  res.send(`${message} (${p} vs ${d})`);
});

app.listen(PORT,"0.0.0.0",()=>{
  console.log("Server running on port",PORT);
});
