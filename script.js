let provider;
let signer;
let contract;
let token;
let user;
let chart;

const contractAddress = "0x47e8BDfA9682fDC2E04B58f9a69673c116fDa404";
const tokenAddress = "0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

const abi = [
  "function currentEpoch() view returns(uint256)",
  "function downlineCount(address) view returns(uint256)",
  "function epochTotalWeight() view returns(uint256)",
  "function pendingReward(address) view returns(uint256)",
  "function getTRCPriceUSD() view returns(uint256)",
  "function totalWeight() view returns(uint256)",
  "function rewardPool() view returns(uint256)",
  "function users(address) view returns(address,uint8,uint256,uint256,uint256,uint256,uint256)",
  "function register(address)",
  "function joinLevel1()",
  "function joinLevel2()",
  "function joinLevel3()",
  "function joinLevel4()",
  "function joinLevel5()",
  "function joinLevel6()",
  "function claimReward()"
  
  "event Registered(address indexed user,address indexed referrer)",
  "event LevelJoined(address indexed user,uint8 level,uint256 amount)",
  "event RewardClaimed(address indexed user,uint256 amount)",
  "event EMAUpdated(uint256 price)"
];

const tokenABI = [
  "function approve(address,uint256) returns(bool)"
];

function human(v){
  return Number(ethers.utils.formatUnits(v,18)).toFixed(4);
}

function usd(v){
  return Number(ethers.utils.formatUnits(v,18)).toFixed(4);
}

function initChart(){
  const ctx = document.getElementById("priceChart").getContext("2d");
  chart = new Chart(ctx,{
    type:"line",
    data:{
      labels:["Start"],
      datasets:[{
        label:"TRC Price USD",
        data:[0],
        tension:0.4
      }]
    }
  });
}

async function connectWallet(){
  await window.ethereum.request({method:'eth_requestAccounts'});
  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
  user = await signer.getAddress();

  document.getElementById("wallet").innerText = user;

  contract = new ethers.Contract(contractAddress,abi,signer);
  token = new ethers.Contract(tokenAddress,tokenABI,signer);

  loadData();
  setInterval(loadData,10000);
  listenEvents(); // ✅ activate event listeners
}

async function loadData(){
  try{
    const price = await contract.getTRCPriceUSD();
    document.getElementById("price").innerText = "$"+usd(price);

    if(chart){
      chart.data.labels.push(new Date().toLocaleTimeString());
      chart.data.datasets[0].data.push(usd(price));
      if(chart.data.labels.length>20){
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
      }
      chart.update();
    }

    document.getElementById("epoch").innerText =
      await contract.currentEpoch();

    document.getElementById("downline").innerText =
      await contract.downlineCount(user);

    document.getElementById("pending").innerText =
      human(await contract.pendingReward(user));

    document.getElementById("rewardPool").innerText =
      human(await contract.rewardPool());

    document.getElementById("epochWeight").innerText =
      await contract.epochTotalWeight();

    const u = await contract.users(user);

    document.getElementById("level").innerText = u[1];
    document.getElementById("baseWeight").innerText = u[2];
    document.getElementById("tempWeight").innerText = u[3];

    document.getElementById("totalWeight").innerText =
      await contract.totalWeight();

  }catch(e){
    console.log(e);
  }
}

async function handleTx(tx){
  try{
    const sent = await tx;
    document.getElementById("status").innerHTML =
      `<a href="https://polygonscan.com/tx/${sent.hash}" target="_blank">View TX</a>`;
    await sent.wait();
    loadData();
  }catch(e){
    document.getElementById("status").innerText = "Failed";
  }
}

async function register(){
  const ref = document.getElementById("ref").value;
  handleTx(contract.register(ref));
}

async function approveTRC(){
  const amount = document.getElementById("approveAmount").value;
  const value = ethers.utils.parseUnits(amount,18);
  handleTx(token.approve(contractAddress,value));
}

async function joinLevel(l){
  if(l==1) handleTx(contract.joinLevel1());
  if(l==2) handleTx(contract.joinLevel2());
  if(l==3) handleTx(contract.joinLevel3());
  if(l==4) handleTx(contract.joinLevel4());
  if(l==5) handleTx(contract.joinLevel5());
  if(l==6) handleTx(contract.joinLevel6());
}

async function claimReward(){
  handleTx(contract.claimReward());
}

// EVENTS
function listenEvents() {
  // Registered
  contract.on("Registered", (userAddr, referrer) => {
    if(userAddr.toLowerCase() === user.toLowerCase()){
      document.getElementById("status").innerText =
        `Registered successfully with referrer: ${referrer}`;
      loadData();
    }
  });

  // LevelJoined
  contract.on("LevelJoined", (userAddr, level, amount) => {
    if(userAddr.toLowerCase() === user.toLowerCase()){
      document.getElementById("status").innerText =
        `Joined Level ${level} successfully with ${human(amount)} TRC`;
      loadData();
    }
  });

  // RewardClaimed
  contract.on("RewardClaimed", (userAddr, amount) => {
    if(userAddr.toLowerCase() === user.toLowerCase()){
      document.getElementById("status").innerText =
        `Reward claimed: ${human(amount)} TRC`;
      loadData();
    }
  });

  // EMAUpdated (optional, updates chart)
  contract.on("EMAUpdated", (price) => {
    if(chart){
      chart.data.labels.push(new Date().toLocaleTimeString());
      chart.data.datasets[0].data.push(usd(price));
      if(chart.data.labels.length>20){
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
      }
      chart.update();
    }
  });
}

window.onload = initChart;
