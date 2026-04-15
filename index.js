const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;

const games = {};
const points = {};
const bets = {};

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

/* ROOT */
app.get("/", (req,res)=>{
  res.send("Blackjack API running");
});

/* ADD POINTS */
app.get("/points/add",(req,res)=>{
  const user=req.query.user;
  const amt=parseInt(req.query.amount);

  if(!points[user]) points[user]=0;
  points[user]+=amt;

  res.send(`💰 ${user} now has ${points[user]} pts`);
});

/* REMOVE POINTS */
app.get("/points/remove",(req,res)=>{
  const user=req.query.user;
  const amt=parseInt(req.query.amount);

  if(!points[user]) points[user]=0;
  points[user]-=amt;

  if(points[user] < 0) points[user]=0;

  res.send(`💸 ${user} lost ${amt} pts (Now: ${points[user]})`);
});

/* CHECK POINTS */
app.get("/points",(req,res)=>{
  const user=req.query.user;
  res.send(`💳 ${user} has ${points[user] || 0} pts`);
});

/* LEADERBOARD */
app.get("/points/top",(req,res)=>{
  const sorted = Object.entries(points)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3);

  if(sorted.length===0){
    return res.send("🏆 No players yet.");
  }

  let msg="🏆 TOP 3:\n";
  sorted.forEach((p,i)=>{
    msg += `${i+1}. ${p[0]} - ${p[1]} pts\n`;
  });

  res.send(msg);
});

/* RESET LEADERBOARD (LINK ONLY) */
app.get("/points/reset",(req,res)=>{
  for(let u in points){
    points[u]=0;
  }
  res.send("🔄 Leaderboard reset!");
});

/* SET BET */
app.get("/bet",(req,res)=>{
  const user=req.query.user;
  const amt=parseInt(req.query.amount);

  if(!points[user] || points[user] < amt){
    return res.send(`❌ ${user}, not enough points.`);
  }

  bets[user]=amt;
  res.send(`🎯 ${user} bet set to ${amt}`);
});

/* START GAME */
app.get("/blackjack/start",(req,res)=>{
  const user=req.query.user;

  if(games[user] && !games[user].done){
    return res.send(`❌ ${user}, finish your current game first.`);
  }

  if(!bets[user]){
    return res.send(`❌ ${user}, set a bet first using !bet`);
  }

  const bet=bets[user];

  if(points[user] < bet){
    return res.send(`❌ ${user}, not enough points.`);
  }

  const player=[draw(),draw()];
  const dealer=[draw()];

  games[user]={player,dealer,done:false,bet};

  res.send(
    `🃏 ${user} started Blackjack (Bet: ${bet})\n` +
    `Cards: ${text(player)} (${total(player)})\n` +
    `Dealer: ${dealer[0].n}`
  );
});

/* HIT */
app.get("/blackjack/hit",(req,res)=>{
  const user=req.query.user;
  const game=games[user];

  if(!game || game.done){
    return res.send(`❌ ${user}, no active game.`);
  }

  const card=draw();
  game.player.push(card);

  const t=total(game.player);

  if(t>21){
    game.done=true;
    points[user]-=game.bet;
    delete games[user];
    return res.send(`💥 ${user} BUST! -${game.bet}`);
  }

  res.send(`👉 ${user} HIT → ${card.n} (${t})`);
});

/* STAND */
app.get("/blackjack/stand",(req,res)=>{
  const user=req.query.user;
  const game=games[user];

  if(!game || game.done){
    return res.send(`❌ ${user}, no active game.`);
  }

  while(total(game.dealer)<17){
    game.dealer.push(draw());
  }

  const p=total(game.player);
  const d=total(game.dealer);

  let result="";

  if(p===d){
    result="😐 PUSH";
  }
  else if(d>21 || p>d){
    const win=Math.floor(game.bet*1.9);
    points[user]+=win;
    result=`🎉 WIN +${win}`;
  }
  else{
    points[user]-=game.bet;
    result=`❌ LOSS -${game.bet}`;
  }

  delete games[user];

  res.send(`🏁 ${user}: ${result} (${p} vs ${d})`);
});

app.listen(PORT,"0.0.0.0",()=>{
  console.log("Server running on port",PORT);
});
