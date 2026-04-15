const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;

const games = {};
const points = {};

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

/* ADD POINTS (MOD) */
app.get("/points/add",(req,res)=>{
  const user=req.query.user;
  const amt=parseInt(req.query.amount);

  if(!points[user]) points[user]=0;
  points[user]+=amt;

  res.send(`💰 ${user} now has ${points[user]} points`);
});

/* CHECK POINTS */
app.get("/points",(req,res)=>{
  const user=req.query.user;
  res.send(`💳 ${user} has ${points[user] || 0} points`);
});

/* TOP 3 LEADERBOARD */
app.get("/points/top",(req,res)=>{
  const sorted = Object.entries(points)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3);

  if(sorted.length===0){
    return res.send("🏆 No players yet.");
  }

  let msg="🏆 TOP PLAYERS:\n";
  sorted.forEach((p,i)=>{
    msg += `${i+1}. ${p[0]} - ${p[1]} pts\n`;
  });

  res.send(msg);
});

/* START */
app.get("/blackjack/start",(req,res)=>{
  const user=req.query.user;

  if(games[user] && !games[user].done){
    return res.send(`❌ ${user}, finish your current game first (!hit / !stand)`);
  }

  if(!points[user] || points[user] < 100){
    return res.send(`❌ ${user}, you need 100 points to play.`);
  }

  const player=[draw(),draw()];
  const dealer=[draw()];

  games[user]={player,dealer,done:false};

  res.send(
    `🃏 ${user} started Blackjack!\n` +
    `Cards: ${text(player)} (Total ${total(player)})\n` +
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
    points[user]-=100;
    delete games[user];
    return res.send(`💥 ${user} BUST! -100 pts`);
  }

  res.send(`👉 ${user} HIT → ${card.n} (Total ${t})`);
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
    result="😐 PUSH (0 pts)";
  }
  else if(d>21 || p>d){
    points[user]+=150;
    result="🎉 WIN +150 pts";
  }
  else{
    points[user]-=100;
    result="❌ LOSS -100 pts";
  }

  delete games[user];

  res.send(
    `🏁 ${user} RESULT:\n` +
    `You: ${p} | Dealer: ${d}\n` +
    `${result}`
  );
});

app.listen(PORT,"0.0.0.0",()=>{
  console.log("Server running on port",PORT);
});
