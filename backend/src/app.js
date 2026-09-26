 require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express = require("express")
const async = require('async');
const cartela = require('./cartela.json');
const BingoBord=require("../Models/BingoBord")
const crypto = require('crypto');
const Transaction = require("../Models/Transaction");
const jwt=require('jsonwebtoken')
const cors = require("cors")
//const TelegramBot = require('node-telegram-bot-api');
const bcrypt = require('bcryptjs');
const { deductWallet } = require('../controllers/walletController');
const cookieParser = require('cookie-parser');
const authRoutes = require('../routes/authRoutes');
const leaderboardRoutes = require("../routes/leaderboardRoutes");

const adminsRoutes = require("../routes/admins");
const userRoutes = require('../routes/userRoutes');
const walletRoutes = require("../routes/walletRoutes");
const alluserRoutes = require('../routes/alluserRoutes');
const authRoutessignup= require('../routes/signupauthRoutes');
const gameHistoryRoutes = require("../routes/gameHistory");
const depositRoutes = require('../routes/depositRoutes');
const adminRoutes = require('../routes/admin');
const authRouter = require('../routes/auth');
const reportRoutes = require('../routes/reportRoutes');
const transactionRoutes = require("../routes/transactionRoutes");
const transactionRoutesd = require("../routes/transaction");
const path = require('path');
const secretkey=process.env.JWT_SECRET;
const refreshKey=process.env.JwT_PRIVATE;


const bodyParser=require("body-parser")
const saveHistoryRoutes = require("../routes/saveHistory"); // adjust path


//const workoutrouter=require("./src/Routes/Users");

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser());
app.use("/manifest.json", express.static("public/manifest.json"));
const http=require("http");


const server=http.createServer(app);
//to be exported  


app.use(bodyParser.json());
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3000",
      "http://167.235.140.218",
      "http://adeyebingo.com",
      "http://adeyebingo.com",
      "http://www.adeyebingo.com",
      "http://www.adeyebingo.com",
      "http://api.adeyebingo.com",
       "http://new.adeyebingo.com",
      "https://new.adeyebingo.com",
      "http://www.new.adeyebingo.com",
      "https://www.new.adeyebingo.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});


const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'http://167.235.140.218',
  'http://adeyebingo.com',
  'https://adeyebingo.com',
  'http://www.adeyebingo.com',
  'https://www.adeyebingo.com',
  
  // ADD THESE TWO LINES:
  'http://api.adeyebingo.com',    // ← ADD THIS (HTTP)
  'https://api.adeyebingo.com',   // ← YOU ALREADY HAVE THIS
  'http://new.adeyebingo.com',
  'https://new.adeyebingo.com',
  'http://www.new.adeyebingo.com',
  'https://www.new.adeyebingo.com'
  // ... rest of your origins
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));






// backend/routes/adminRoutes.js

const router = express.Router();

// Example: fetch all transactions with pagination

function parseInitData(initData) {
  return Object.fromEntries(new URLSearchParams(initData));
}
function serializeInitData(initDataObject) {
  return Object.keys(initDataObject)
    .filter((key) => key !== "hash")
    .sort()
    .map((key) => `${key}=${initDataObject[key]}`)
    .join("\n");
}
function verifyTelegramInitData(initData, botToken) {
  const parsed = parseInitData(initData);
  const receivedHash = parsed.hash;
  if (!receivedHash) return null;

  const dataCheckString = serializeInitData(parsed);
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const expectedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (receivedHash !== expectedHash) return null;

  // Optional: check auth_date (e.g., not older than 1 hour)
  const authDate = parseInt(parsed.auth_date, 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 3600) return null; // expired

  return parsed;
}

// Enable handling of OPTIONS requests (for preflight)
// Automatically handle OPTIONS requests

/* const createToken=(_id)=>{
 return   jwt.sign({_id}, process.env.JWT_SECRET,{expiresIn:'3d'})
} */


 // your setup



// adjust path if your model is elsewhere


 // Your cartela data




// =========================================================================
// !!! CRITICAL: Add the necessary modules/dependencies here if not globally available !!!
// Assuming BingoBord model and cartela data ('cart') are available globally/imported.

// Define the players you want to inject
// Define the players you want to inject
const forcedPlayersData = [
    { username: 'amanu', clientId: 'tg_amanu_fake' },
    
    { username: 'soloman', clientId: '200003x' },
 
    
    // --- NEW PLAYERS ---
    { username: 'adisu', clientId: '200014x' },
    { username: 'mesi', clientId: '200015x' },
    { username: 'ruth', clientId: '200016x' },
    { username: 'markose', clientId: '2000787x' },
    { username: 'yosi', clientId: '200019x' },
    { username: 'sisco', clientId: '200020x' },
    { username: 'yaredo', clientId: '200021x' },
    { username: 'derara', clientId: '200017x' },
    { username: 'suura', clientId: '200018x' },
    { username: 'ermii', clientId: 'client-tariku-bot' },
    { username: 'salim', clientId: 'client-cita-bot' },
    { username: 'admas', clientId: 'client-chkuni-bot' },
    {username: "telila_65432",clientId: '200037x'},
    {username: "medi_4563",clientId: '200035x'},
    {username: "redwan_45655",clientId: '200034x'},
     {username: "tsegihshmuze",clientId: '200033x'},
     {username: "jemal_76545",clientId: '200032x'},
     {username: "kida_25133",clientId: '200031x'},
     {username: "ali_987630",clientId: '200030x'},



      { username: "wonde_ty4", clientId: '2000455x' },
    { username: "turi_su", clientId: '2000967x' },
    { username: "alexsuckss", clientId: '200033x' },
    { username: "jamiks", clientId: '200059x' },
    { username: "habiboo", clientId: '2000345x' },
    { username: "fitse_23434", clientId: '200035sx' },
    { username: "maamokacha", clientId: '200037sx' },
    { username: "fillimoon", clientId: '2000337x' },
    { username: "sabirlove2", clientId: '200037fx' },
    { username: "burabu_3456", clientId: '200037bx' },
    { username: "mastushewa", clientId: '200037gx' },
    { username: "gerekirkose", clientId: '200037jx' },
     //greae
    { username: "kibrom_98766", clientId: '20003011' },
   { username: "mesfin_turo", clientId: '2000311' },
    { username: "mulatu_7546", clientId: '2000321' },
     { username: "teme_abo", clientId: '2000331' },
      { username: "filaman_454595", clientId: '2000341' },
       { username: "ermi_adama", clientId: '2000351' },
        { username: "buzaman_5454", clientId: '2001372' },
         { username: "musat_5474", clientId: '2002372' },
          { username: "alex_dere2", clientId: '2003372' },
           { username: "doc_eremi", clientId: '2004372' },
            { username: "biruk_mec", clientId: '2005372' },
             { username: "gramachew", clientId: '2006372' }
           
    
];
// Note: clientId must be unique strings for the game logic to work correctly.
const NUM_CARTELAS_PER_PLAYER = 1;

/**
 * Inserts predefined players into a room, assigns random cartelas,
 * deducts their stake, and updates the room state to force the countdown.
 * @param {string} rId - The room ID (also the stake amount).
 * @param {string} initiatorClientId - The clientId of the player who triggered this action.
 */

async function processNextBotCartelaSequential(rId, player) {
    const room = rooms[rId];
    const stake = Number(rId);
    const clientId = player.clientId;

    // 1. Check if bot is already fully injected
    const currentCartelas = room.playerCartelas[clientId]?.length || 0;
    if (currentCartelas >= NUM_CARTELAS_PER_PLAYER) {
        return 'COMPLETEds';
    }

    // --- CRITICAL FIX: Use try/catch over the entire async block ---
    try {
        const user = await BingoBord.findOne({ username: player.username });

        if (!user) {
            console.error(`[INJECT ERROR] User ${player.username} not found in DB.`);
            return 'ERROR';
        }

        // 2. Initial Setup (if first cartela) & Funds Check
        if (!(room.players[clientId])) {
            room.players[clientId] = player.username;
            room.playerCartelas[clientId] = room.playerCartelas[clientId] || [];
        }

        if (user.Wallet < stake) {
            console.error(`[INJECT ERROR] User ${player.username} has insufficient wallet (${user.Wallet}) for 1 ticket.`);
            return 'SKIPPED'; 
        }

        // 3. Select one unique cartela
        let cartelaIndex;
        // Generate a random, unique cartela index (1 to 75)
        do {
            cartelaIndex = Math.floor(Math.random() * 75) + 1;
        } while (room.selectedIndexes.includes(cartelaIndex));

        // --- THE FIX: Use updateOne to bypass full document validation ---
        // This atomically decrements the wallet directly in the database.
        const updateResult = await BingoBord.updateOne(
            { _id: user._id, Wallet: { $gte: stake } }, // Find by ID AND ensure funds are still sufficient
            { $inc: { Wallet: -stake } }              // Decrement the Wallet
        );

        if (updateResult.modifiedCount === 0) {
            // This happens if the user's wallet was just updated below the stake by another concurrent process
            console.error(`[INJECT FAILED] ${player.username}: Concurrency error or insufficient funds on final check.`);
            return 'SKIPPED'; 
        }
        
        // Update the local user object for correct logging/future checks
        user.Wallet -= stake; 

        // Update Room State (after successful DB deduction)
        room.playerCartelas[clientId].push(cartelaIndex);
        room.selectedIndexes.push(cartelaIndex);
        
        console.log(`[INJECT SUCCESS] ${player.username} selected cartela #${cartelaIndex} (Total: ${room.playerCartelas[clientId].length}/${NUM_CARTELAS_PER_PLAYER}).`);

        // 4. Broadcast Update
        const totalCartelas = room.selectedIndexes.length;
        io.to(rId).emit("updateSelectedCartelas", {
            selectedIndexes: room.selectedIndexes,
        });
        io.to(rId).emit("playerCount", { totalPlayers: totalCartelas });
        
        return 'SUCCESS';

    } catch (error) {
        // Log the full stack trace for any other unexpected errors
        console.error(`[INJECT FAILED] Error processing ${player.username}:`, error);
        return 'ERROR';
    }
}

function startInjectionMonitor(rId, initiatorClientId) {
    const room = rooms[rId];
    if (!room) return;
    if (room.activeGame) return;

    if (room.injectInterval) clearTimeout(room.injectInterval);

    const activeBots = forcedPlayersData.filter(player => player.clientId !== initiatorClientId);
    let currentBotIndex = 0;
    const DELAY_MS = 400;
    const MAX_CYCLES = activeBots.length * 2; // e.g., try each bot twice
    let cycleCount = 0;

    const runInjectionCycle = async () => {
        // Cleanup check
        if (!rooms[rId] || rooms[rId].activeGame) {
            room.injectInterval = null;
            return;
        }

        const maxBotCartelas = activeBots.length * NUM_CARTELAS_PER_PLAYER;
        const currentBotCartelas = activeBots.reduce((sum, bot) => sum + (room.playerCartelas[bot.clientId]?.length || 0), 0);

        // Stop if all bots succeeded OR max cycles reached
        if (currentBotCartelas >= maxBotCartelas || cycleCount >= MAX_CYCLES) {
            if (cycleCount >= MAX_CYCLES) {
                console.log(`[INJECT MONITOR] Room ${rId} stopped after ${MAX_CYCLES} cycles. Some bots may have failed.`);
            }
            room.injectInterval = null;
            // Optionally force-start countdown if enough players have cartelas
            const playersWithCartela = Object.values(room.playerCartelas).filter(arr => arr.length > 0).length;
            if (!room.timer && playersWithCartela >= 2) {
                startCountdown(rId, 35);
            }
            return;
        }

        // Countdown check (same as before)
        const playersWithCartela = Object.values(room.playerCartelas).filter(arr => arr.length > 0).length;
        if (!room.timer && playersWithCartela >= 2) {
            startCountdown(rId, 30);
        }

        // Inject next bot
        const botToInject = activeBots[currentBotIndex];
        if (botToInject) {
            const botCartelaCount = room.playerCartelas[botToInject.clientId]?.length || 0;
            if (botCartelaCount < NUM_CARTELAS_PER_PLAYER) {
                await processNextBotCartelaSequential(rId, botToInject);
            }
            currentBotIndex = (currentBotIndex + 1) % activeBots.length;
        } else {
            currentBotIndex = (currentBotIndex + 1) % activeBots.length;
        }

        cycleCount++;
        room.injectInterval = setTimeout(runInjectionCycle, DELAY_MS);
    };

    room.injectInterval = setTimeout(runInjectionCycle, DELAY_MS);
}
    function startRoomMonitor() {
    // Run this check every 5 seconds
    setInterval(() => {
        // Iterate through all currently existing rooms
        for (const rId in rooms) {
            const room = rooms[rId];
            if (!room) continue;

            // 1. Check if the game is already in progress or starting
            if (room.activeGame || room.timer !== null) {
                // Game is running or counting down, no action needed
                continue;
            }

            // 2. Check for human players with cartelas
            // Filter out clients that are in the forcedPlayersData list (i.e., bots)
            const humanPlayersWithCartela = Object.keys(room.playerCartelas).filter(clientId => {
                const isBot = forcedPlayersData.some(bot => bot.clientId === clientId);
                const hasCartela = room.playerCartelas[clientId] && room.playerCartelas[clientId].length > 0;
                return !isBot && hasCartela;
            }).length;

            // 3. If NO human players have selected a cartela, and the room is idle,
            if (humanPlayersWithCartela === 0) {
                // Check if the bot injection monitor is already running.
                if (room.injectInterval) {
                    // Bot injection is already in progress, just let it run.
                    continue;
                }
                
                // Select a random bot to be the "initiator"
                const initiatorBot = forcedPlayersData[Math.floor(Math.random() * forcedPlayersData.length)];
                
               // console.log(`[AUTO-START] Room ${rId} is idle. Forcing start via bot ${initiatorBot.username}.`);
                
                // Call the original injection function to force the room state to start the process.
                // This will kick off the countdown when the first bot buys its ticket.
                startInjectionMonitor(rId, initiatorBot.clientId);
            }
        }
    }, 3000); // Check every 5 seconds (adjust as needed)
}

// =========================================================================
const rooms = {}; // rooms = { roomId: { players, selectedIndexes, playerCartelas, ... } }
const socketIdToClientId = new Map();
const clientIdToSocketId = new Map();
const authenticatedSockets = new Map();
 startRoomMonitor();
io.on("connection", (socket) => {
  //console.log("New connection:", socket.id);
// Add this block inside your main io.on("connection", (socket) => { ... });

// --- SPINNER GAME HANDLER ---
// --- AUTHENTICATION ---
socket.on("authenticate", async ({ initData }) => {
  if (!initData) {
    socket.emit("auth_error", { message: "Missing initData" });
    return;
  }

  const verified = verifyTelegramInitData(
    initData,
    process.env.BOT_TOKEN
  );

  if (!verified) {
    socket.emit("auth_error", {
      message: "Invalid or expired initData"
    });
    return;
  }

  try {
    const userData = JSON.parse(verified.user);

    const telegramId = userData.id;
    const username = userData.username || userData.first_name;

    const user = await BingoBord.findOne({ telegramId });

    if (!user) {
      socket.emit("auth_error", {
        message: "User not registered. Use /start on Telegram."
      });
      return;
    }

    // Stable ID for this Telegram user
    const clientId = `tg_${user.telegramId}`;

    // Store authentication information
    authenticatedSockets.set(socket.id, {
      telegramId: user.telegramId,
      username: user.username,
      clientId
    });

    // Connect stable player ID to the NEW socket
    clientIdToSocketId.set(clientId, socket.id);

    // Tell frontend authentication succeeded
    socket.emit("auth_success", {
      message: "Authenticated",
      user: {
        username: user.username,
        wallet: user.Wallet
      }
    });

    console.log(
      `✅ Socket ${socket.id} authenticated as ${user.username}`
    );

  } catch (err) {
    console.error("Authentication error:", err);

    socket.emit("auth_error", {
      message: "Server error"
    });
  }
});
  // --- JOIN ROOM ---
  socket.on("joinRoom", ({ roomId }) => {   // <-- only roomId from client
  const auth = authenticatedSockets.get(socket.id);
  if (!auth) {
    socket.emit("error", { message: "Not authenticated. Please authenticate first." });
    return;
  }

  const { telegramId, username, clientId } = auth;
  const rId = String(roomId);
  socket.join(rId);

  // Store mappings (optional for backwards compatibility)
  socketIdToClientId.set(socket.id, clientId);
  clientIdToSocketId.set(clientId, socket.id);

  if (!rooms[rId]) {
    rooms[rId] = {
      players: {},
      selectedIndexes: [],
      playerCartelas: {},
      timer: null,
      calledNumbers: [],
      timerInterval: null,
      numberInterval: null,
      injectInterval: null,
      alreadyWon: [],
      totalAward: 0,
      gameId: null,
    };
    console.log(`Room created: ${rId}`);
  }

  // Use clientId as key
  rooms[rId].players[clientId] = username;

  if (!rooms[rId].playerCartelas[clientId]) {
    rooms[rId].playerCartelas[clientId] = [];
  }
  const myCartelas = rooms[rId].playerCartelas[clientId];

  socket.emit("currentGameState", {
    calledNumbers: rooms[rId].calledNumbers,
    myCartelas,
    selectedIndexes: rooms[rId].selectedIndexes,
    lastNumber: rooms[rId].calledNumbers.slice(-1)[0] || null,
    timer: rooms[rId].timer,
    totalAward: rooms[rId].totalAward,
    totalPlayers: Object.values(rooms[rId].playerCartelas).reduce((sum, arr) => sum + arr.length, 0),
    activeGame: rooms[rId].activeGame || false,
    gameId: rooms[rId].gameId || null
  });

  const activePlayers = Object.values(rooms[rId].playerCartelas).reduce((sum, arr) => sum + arr.length, 0);
  io.to(rId).emit("playerCount", { totalPlayers: activePlayers });
});
// --- CHECK PLAYER STATUS ---
socket.on("checkPlayerStatus", ({ roomId }) => {   // no clientId from client
  const auth = authenticatedSockets.get(socket.id);
  if (!auth) {
    socket.emit("playerStatus", { inGame: false });
    return;
  }
  const { clientId } = auth;
  const room = rooms[String(roomId)];

  if (!room || !room.activeGame || !room.playerCartelas[clientId] || room.playerCartelas[clientId].length === 0) {
    socket.emit("playerStatus", { inGame: false });
    return;
  }

  const selectedCartelas = room.playerCartelas[clientId];
  socket.emit("playerStatus", { inGame: true, selectedCartelas });
});
  // --- SELECT CARTELA ---
  socket.on("selectCartela", async ({ roomId, cartelaIndex }) => {
  const auth = authenticatedSockets.get(socket.id);
  if (!auth) {
    socket.emit("cartelaRejected", { message: "Not authenticated" });
    return;
  }
  const { clientId, username } = auth;
  const rId = String(roomId);

  if (!rooms[rId] || rooms[rId].selectedIndexes.includes(cartelaIndex)) {
    socket.emit("cartelaRejected", {
      message: "Cartela already taken or room not found",
    });
    return;
  }

  try {
    // Get username from rooms (it should match auth.username)
    const roomUsername = rooms[rId].players[clientId];
    if (!roomUsername) {
      socket.emit("cartelaRejected", { message: "User not found in room" });
      return;
    }

    const user = await BingoBord.findOne({ username: roomUsername });
    const stake = Number(rId);

    if (!user || user.Wallet < stake) {
      socket.emit("cartelaRejected", { message: "Insufficient balance or user not found" });
      return;
    }

    if (!rooms[rId].playerCartelas[clientId])
      rooms[rId].playerCartelas[clientId] = [];
    const userCartelas = rooms[rId].playerCartelas[clientId];

    if (rooms[rId].activeGame || (rooms[rId].timer !== null && rooms[rId].timer <= 4)) {
      socket.emit("cartelaRejected", {
        message: "The game is about to start or is already active. Cartela selection is closed."
      });
      return;
    }

    if (userCartelas.length >= 6) {
      socket.emit("cartelaRejected", { message: "You can only select up to 6 cartelas" });
      return;
    }

    // Deduct wallet
    user.Wallet -= stake;
    await user.save();

    userCartelas.push(cartelaIndex);
    rooms[rId].selectedIndexes.push(cartelaIndex);

    socket.emit("cartelaAccepted", { cartelaIndex, Wallet: user.Wallet });
    io.to(rId).emit("updateSelectedCartelas", {
      selectedIndexes: rooms[rId].selectedIndexes,
    });

    if (userCartelas.length === 1) {
      startInjectionMonitor(rId, clientId);
    }
  } catch (err) {
    console.error("Error selecting cartela:", err);
    socket.emit("cartelaRejected", { message: "Server error" });
  }
});


  // --- CALL NUMBER ---
  socket.on("callNumber", ({ roomId, number }) => {
    if (!rooms[roomId]) return;
    const room = rooms[roomId];
    if (!room.calledNumbers.includes(number)) room.calledNumbers.push(number);

    io.to(roomId).emit("numberCalled", number);
    io.to(roomId).emit(
      "currentCalledNumbers",
      room.calledNumbers.slice(-5).reverse()
    );
    io.to(roomId).emit("updateSelectedCartelas", {
      selectedIndexes: room.selectedIndexes,
    });

    checkWinners(roomId, number);
  });



  // --- DISCONNECT ---
// --- DISCONNECT ---
// --- DISCONNECT ---
// --- DISCONNECT ---
socket.on("disconnect", () => {
  const clientId = socketIdToClientId.get(socket.id);

  authenticatedSockets.delete(socket.id);

  if (!clientId) return;

  socketIdToClientId.delete(socket.id);

  console.log(
    `⚠️ ${clientId} disconnected. Waiting 15 seconds for refresh...`
  );

  setTimeout(() => {

    // Check whether this SAME player has connected with a NEW socket
    const currentSocketId = clientIdToSocketId.get(clientId);

    if (currentSocketId && currentSocketId !== socket.id) {
      console.log(
        `✅ ${clientId} reconnected with new socket. Keeping player/cartela.`
      );
      return;
    }

    // Remove stale socket mapping
    if (currentSocketId === socket.id) {
      clientIdToSocketId.delete(clientId);
    }

    // Player did not reconnect within 15 seconds
    for (const roomId in rooms) {
      const room = rooms[roomId];

      if (!room || !room.players[clientId]) continue;

      if (!room.activeGame) {
        delete room.playerCartelas[clientId];
        delete room.players[clientId];

        console.log(
          `🗑️ ${clientId} removed from room ${roomId} after timeout`
        );
      }

      const activePlayers = Object.values(room.playerCartelas)
        .reduce((sum, arr) => sum + arr.length, 0);

      io.to(roomId).emit("playerCount", {
        totalPlayers: activePlayers
      });

      break;
    }

  }, 15000);
});
});

function resetRoom(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  // Clear all intervals
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
  if (room.numberInterval) {
    clearInterval(room.numberInterval);
    room.numberInterval = null;
  }
if (room.injectInterval) {
        clearTimeout(room.injectInterval);
        room.injectInterval = null;
    }
  // Reset room state but keep players
  room.activeGame = false;
  room.selectedIndexes = [];
  room.calledNumbers = [];
  room.alreadyWon = [];
  room.totalAward = 0;
  room.gameId = null;
  room.timer = null;

  // Reset player cartelas but keep players
  for (const clientId in room.playerCartelas) {
    room.playerCartelas[clientId] = [];
  }

  io.to(roomId).emit("roomAvailable");
  io.to(roomId).emit("resetRoom");
}


// ================= GAME FUNCTIONS =================
function startNumberGenerator(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  
  // SAFETY: Don't start a second timer if one is already running
  if (room.numberInterval) return; 

  const playersWithCartela = Object.values(room.playerCartelas).filter(
    (arr) => arr.length > 0
  ).length;
  
  if (playersWithCartela < 1) return;
  if (!Array.isArray(room.calledNumbers)) room.calledNumbers = [];
  
  const numbers = Array.from({ length: 75 }, (_, i) => i + 1);
  
  // Fisher-Yates shuffle algorithm
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }

  // MOVED LOG: Now it shows the real random order in your PM2 logs
 // console.log(`[Room ${roomId}] REAL Shuffled numbers:`, numbers);
  
  room.numberInterval = setInterval(() => {
    try {
      if (!rooms[roomId]) {
        clearInterval(room.numberInterval);
        return;
      }

      if (room.calledNumbers.length >= 75) {
        clearInterval(room.numberInterval);
        room.numberInterval = null;
        checkWinners(roomId, room.calledNumbers.slice(-1)[0]);

        if (room.alreadyWon.length === 0) {
          console.log(`No winner in room ${roomId} after all numbers. Resetting room.`);
          resetRoom(roomId);
        }
        return;
      }
      
      const nextNumber = numbers[room.calledNumbers.length];
      room.calledNumbers.push(nextNumber);
      
      io.to(roomId).emit("numberCalled", nextNumber);
      io.to(roomId).emit("currentCalledNumbers", [...room.calledNumbers].slice(-5).reverse());
      
      checkWinners(roomId, nextNumber);
      
    } catch (error) {
      console.error(`Error in number generator for room ${roomId}:`, error);
      clearInterval(room.numberInterval);
      room.numberInterval = null;
    }
  }, 3000);
}
function generateGameId() {
  let newGameId;
  let isUnique = false;
  while (!isUnique) {
    newGameId = Math.floor(Math.random() * 90000) + 10000;
    let idExists = false;
    for (const roomId in rooms) {
      if (rooms[roomId].gameId === newGameId) {
        idExists = true;
        break;
      }
    }
    if (!idExists) {
      isUnique = true;
    }
  }
  return newGameId;
}
function startCountdown(roomId, seconds) {
  if (!rooms[roomId]) return;
  let timeLeft = seconds;
  if (rooms[roomId].timer) return;
  rooms[roomId].timer = timeLeft;
  rooms[roomId].timerInterval = setInterval(async () => {
    timeLeft -= 1;
    rooms[roomId].timer = timeLeft;
    io.to(roomId).emit("startCountdown", timeLeft);
    const totalCartelas = Object.values(rooms[roomId].playerCartelas).reduce(
      (sum, arr) => sum + arr.length,
      0
    );
    rooms[roomId].totalAward = totalCartelas * Number(roomId) * 0.8;
    io.to(roomId).emit("awardUpdate", { totalAward: rooms[roomId].totalAward });
    if (timeLeft <= 0) {
      clearInterval(rooms[roomId].timerInterval);
      rooms[roomId].timer = null;
      const room = rooms[roomId];
      
      // ✅ Corrected loop to send myCartelas
      for (const clientId in room.playerCartelas) {
        const socketId = clientIdToSocketId.get(clientId);
        if (socketId) {
            const myCartelas = room.playerCartelas[clientId] || [];
            if (myCartelas.length > 0) {
                io.to(socketId).emit("myCartelas", myCartelas);
            }
        }
      }
        room.gameId =generateGameId();
      room.activeGame = true;
      io.to(roomId).emit("activeGameStatus", { activeGame: true ,gameId: room.gameId  });

      const totalCartelas = Object.values(room.playerCartelas).reduce(
        (sum, arr) => sum + arr.length,
        0
      );
      room.totalAward = totalCartelas * Number(roomId) * 0.8;
      io.to(roomId).emit("gameStarted", {
        totalAward: room.totalAward,
        //totalPlayers: Object.keys(room.players).length,
        totalPlayers: totalCartelas,
         gameId: room.gameId ,
      });
    console.log("game id is ",room.gameId);
      startNumberGenerator(roomId);
    }
  }, 1000);
}

// --- WIN LOGIC ---
function findWinningPattern(cartelaData, calledNumbers) {
  if (!cartelaData) return null;
  for (let i = 0; i < 5; i++) {
    if (cartelaData[i].every((num) => calledNumbers.includes(num) || num === "*"))
      return cartelaData[i];
    const col = cartelaData.map((row) => row[i]);
    if (col.every((num) => calledNumbers.includes(num) || num === "*"))
      return col;
  }
  const diag1 = [0, 1, 2, 3, 4].map((i) => cartelaData[i][i]);
  const diag2 = [0, 1, 2, 3, 4].map((i) => cartelaData[i][4 - i]);
  if (diag1.every((num) => calledNumbers.includes(num) || num === "*"))
    return diag1;
  if (diag2.every((num) => calledNumbers.includes(num) || num === "*"))
    return diag2;
  const corners = [
    cartelaData[0][0],
    cartelaData[0][4],
    cartelaData[4][0],
    cartelaData[4][4],
  ];
  if (corners.every((num) => calledNumbers.includes(num) || num === "*"))
    return corners;
  const innerCorners = [
    cartelaData[1][1],
    cartelaData[1][3],
    cartelaData[3][1],
    cartelaData[3][3],
  ];
  if (innerCorners.every((num) => calledNumbers.includes(num) || num === "*"))
    return innerCorners;
  return null;
}

async function saveGameHistory(username, roomId, stake, outcome,  gameId ) {
  try {
    const user = await BingoBord.findOne({ username });
    if (!user) return;
    user.gameHistory.push({
      roomId: Number(roomId),
      stake: Number(stake),
      outcome,
      timestamp: new Date(),
      gameId,
    });
    await user.save();
  } catch (err) {
    console.error("Failed to save game history:", err);
  }
}


async function checkWinners(roomId, calledNumber) {
  const room = rooms[roomId];
  if (!room) return;

  const winners = [];
  const stakeAmount = Number(roomId);

  for (const clientId in room.playerCartelas) {
    const cartelas = room.playerCartelas[clientId];
    if (!cartelas || cartelas.length === 0) continue;

    const username = room.players[clientId];
    if (!username) continue;

    for (const cartelaIndex of cartelas) {
      if (!cartela[cartelaIndex]) continue;
      const key = clientId + "-" + cartelaIndex;
      if (room.alreadyWon.includes(key)) continue;

      const pattern = findWinningPattern(cartela[cartelaIndex].cart, room.calledNumbers);
      if (pattern) {
        winners.push({ clientId, cartelaIndex, pattern, winnerName: username });
        room.alreadyWon.push(key);
      }
    }
  }

  if (winners.length > 0) {
    if (room.numberInterval) {
      clearInterval(room.numberInterval);
      room.numberInterval = null;
    }

    const awardPerWinner = Math.floor(room.totalAward / winners.length);
    const winnerUsernames = new Set();

    // ✅ Emit winners immediately
    io.to(roomId).emit("winningPattern", winners);
 setTimeout(() => {
      if (rooms[roomId]) {
        resetRoom(roomId);
      }
    }, 6000);
   // io.to(roomId).emit("roomAvailable");
//io.to(roomId).emit("resetRoom");
    // ✅ Update winners in parallel
   (async () => {
  // Update winners
  // REPLACE your winner update block with this:
await Promise.all(winners.map(async (winner) => {
    await BingoBord.updateOne(
        { username: winner.winnerName },
        { 
            $inc: { Wallet: awardPerWinner, coins: 1 }, // Updates balance instantly
            $push: {
                gameHistory: {
                    $each: [{
                        roomId: Number(roomId),
                        stake: Number(awardPerWinner),
                        outcome: "win",
                        timestamp: new Date(),
                        gameId: room.gameId || Date.now()
                    }],
                    $slice: -50 // CRITICAL: This trims the 10,000 items down to 50!
                }
            }
        }
    ).catch(err => console.error("Winner update failed:", err));
    winnerUsernames.add(winner.winnerName);
}));

  // Update losers
await Promise.all(Object.entries(room.players).map(async ([clientId, username]) => {
    if (!winnerUsernames.has(username)) {
      await BingoBord.updateOne(
        { username },
        {
          $push: {
            gameHistory: {
              $each: [{ // Use $each to allow for $slice
                roomId: Number(roomId),
                stake: Number(stakeAmount),
                outcome: "loss",
                timestamp: new Date(),
                gameId: room.gameId || Date.now(), // Fallback if gameId is missing
              }],
              $slice: -50 // ⚡ This keeps history small and fast!
            }
          }
        }
      ).catch(err => console.error(`Error updating loser ${username}:`, err.message));
    }
}));
})();


  }
   

    // ✅ Delay backend reset only
   
}

 app.get('/', (req, res) => {
  res.json({ message: 'Hello, world! ass i know ' }); // Sends a JSON response
});
  const verfyuser = async (req, res, next) => {
    const accesstoken = req.cookies.accesstoken;
  
    if (!accesstoken) {
      // Renew the token
      const renewToken = (req, res, next) => {
        // Logic to renew the token if expired
        const newToken = jwt.sign({ username: req.username, role: req.role }, secretkey, { expiresIn: '1h' });
        res.cookie('accesstoken', newToken, { httpOnly: false });
        next(); // Proceed to next middleware
      };
      
      // Let renewToken handle the response or call next()
    } else {
      jwt.verify(accesstoken, secretkey, (err, decoded) => {
        if (err) {
          return res.json({ valid: false, message: "Invalid token" });
        } else {
          req.username = decoded.username;
          req.role=decoded.role;
          next(); // Proceed to the next middleware
        }
      });
    }
  };

  app.get('/api', (req, res) => {
    res.send('API is working!');
  });
  // Helper to generate a unique username (copied from bot)
const generateUniqueUsername = async (baseName) => {
  let username = baseName;
  let attempt = 0;
  while (attempt < 5) {
    const existing = await BingoBord.findOne({ username });
    if (!existing) return username;
    username = `${baseName}_${Math.floor(1000 + Math.random() * 9000)}`;
    attempt++;
  }
  return `${baseName}_${Date.now()}`;
};
  // ========== TELEGRAM INITDATA VERIFICATION ENDPOINT ==========
app.post("/api/verify-init-data", async (req, res) => {
  const { initData } = req.body;
  if (!initData) {
    return res.status(400).json({ error: "Missing initData" });
  }

  const verified = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!verified) {
    return res.status(403).json({ error: "Invalid or expired initData" });
  }

  try {
    const userData = JSON.parse(verified.user);
    const telegramId = userData.id;       // number
    const username = userData.username || userData.first_name;

    // Try to find user by telegramId (as number)
    let user = await BingoBord.findOne({ telegramId: Number(telegramId) });

    if (!user) {
      // Auto‑create user with default values
      const finalUsername = await generateUniqueUsername(username);
      user = new BingoBord({
        telegramId: Number(telegramId),
        username: finalUsername,
        phoneNumber: `telegram_${telegramId}`,   // temporary, bot will update later
        Wallet: 7,          // default starting balance
        gameHistory: [],
        referredBy: null,
        referralBonusPaid: false,
      });
      await user.save();
      console.log(`[AUTH] Auto‑created user for telegramId ${telegramId} (${finalUsername})`);
    }

    return res.json({
      success: true,
      user: {
        telegramId: user.telegramId,
        username: user.username,
        wallet: user.Wallet
      }
    });
  } catch (err) {
    console.error("InitData user parse error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
  app.get('/api/test-endpoint', (req, res) => {
  res.json({ message: "API is working!" });
});
app.use("/api", leaderboardRoutes);
  app.use('/auth', authRoutes);
app.use('/user', userRoutes);

app.use('/api', reportRoutes);
app.use('/auth', authRoutessignup);
app.use('/api', gameHistoryRoutes);
app.use('/api', depositRoutes);
app.use("/api/admins", adminsRoutes);
app.use('/api', alluserRoutes);

app.use("/api/transactions", transactionRoutes);
app.use("/api/gameHistory", gameHistoryRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api", transactionRoutesd);
app.use('/admin', adminRoutes);

app.use('/auth', authRouter);
app.post("/deleteuser",async(req,res)=>{
    const{username}=req.body
  
    
    try{
        //const check=await BingoBord.findOne({username:username})
  
      const existinguser=await BingoBord.findOne({username})
      console.log(username);
      if(!existinguser){
        return res.status(404).json({ success: false, message: "User not found" });
      }
      await BingoBord.deleteOne({ username });

      res.status(200).json({ success: true, message: "User successfully deleted" });
  
    }
    catch(e){
      console.error("Error during user deletion:", e);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  
  })
  app.post("/updatewallete", async (req, res) => { 
    const {tempuser,incaamount} = req.body;
  
    
    try {
        // Find if the player already exists
        const check = await BingoBord.findOne({ username: tempuser });
        console.log("user is ",check);
          
        if (check) {
         // Retrieve the last gameId from gameHistory if it exists, otherwise start from 0
             // Increment gameId
            
            const filter = { username:  tempuser };
            const update = {
                $inc: { Wallet: incaamount}// Deduct from Wallet
               
                
                } // Push new game history entry
           
  
            const result = await BingoBord.updateOne(filter, update);
            if (result.matchedCount === 0) {
                console.log("No documents matched the filter.");
            } else if (result.modifiedCount === 0) {
                console.log("Document was found, but no updates were made.");
            } else {
                console.log("Document updated successfully.");
            }
            return res.json("updated");
          }// Send response after successful update
        else {
            // If player does not exist, insert data and respond
            await BingoBord.insertMany([data]); // Ensure collection is defined correctly here
            return res.json("notexist");
        }
    } catch (e) {
        console.error("Database error:", e); // Log the error
        if (!res.headersSent) { // Ensure response is sent only once
            res.json("fail");
        }
    }
  });


// routes/admin.js

// Register Admin (only once)



// API: Receive SMS message (TeleBirr or CBE) and store transaction

app.get("/admin/transactions-list", async (req, res) => {
  try {
    const transactions = await Transaction.find({ method: "depositpend" })
      .sort({ createdAt: -1 })
      .limit(300); // latest 50
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});
app.get("/admin/pending-withdrawals",  async (req, res) => {
  try {
    const pendingWithdrawals = await Transaction.find({ method: "withdrawal"}).sort({ createdAt: -1 });
    res.json(pendingWithdrawals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/admin/deposit",  async (req, res) => {
  try {
    const pendingdeposit = await Transaction.find({ method: "deposit"}).sort({ createdAt: -1 });
    res.json(pendingdeposit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/admin/confirm-withdrawal", async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.INTERNAL_API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
    const { withdrawalId } = req.body;
  try {
    const transaction = await Transaction.findOne({withdrawalId});
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }
    
else{
 await Transaction.deleteOne({withdrawalId});
    res.status(200).json({ success: true, message: "Withdrawal confirmed successfully." });
}
    

    // Check again for sufficient funds just in case
    

   
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
app.post("/admin/confirm-depo", async (req, res) => {
  const {depositId} = req.body;
  try {
    const transaction = await Transaction.findOne({depositId});
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }
    
else{
 await Transaction.deleteOne({depositId});
    res.status(200).json({ success: true, message: "Withdrawal confirmed successfully." });
}
    

    // Check again for sufficient funds just in case
    

   
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/admin/reject-withdrawal",  async (req, res) => {
  const { transactionId } = req.body;
  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }
    if (transaction.status !== "pending") {
      return res.status(400).json({ message: "Transaction is not pending." });
    }

    // Update the transaction status to 'rejected'
    transaction.status = "rejected";
    transaction.rawMessage = `Withdrawal rejected by admin at ${new Date().toLocaleString()}`;
    await transaction.save();

    res.json({ message: "Withdrawal rejected successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

const getUsernameFromToken = (req, res, next) => {
  const accessToken = req.headers.authorization && req.headers.authorization.split(' ')[1];
//console.log(accessToken);
  if (!accessToken) {
    return res.status(401).json({ valid: false, message: 'Access token not provided' });
  }
  

  jwt.verify(accessToken, secretkey, (err, decoded) => {
    if (err) {
      return res.status(403).json({ valid: false, message: 'Invalid access token' });
    }
    
    // Attach username to the request object
    req.username = decoded.username;
    req.role=decoded.role;
   
    next();
  });
};


app.post("/useracess",getUsernameFromToken,(req,res)=>{
  res.json({ valid: true, username: req.username ,role:req.role, phoneNumber:req.phoneNumber});
  //console.log("hay",req.username,req.role);
})
app.post("/loginacess",getUsernameFromToken,(req,res)=>{
 
  res.json({ valid: true, username: req.username,role:req.role,phoneNumber:req.phoneNumber });
}
) 
app.post("/depositcheckB", async (req, res) => {
  const { initData } = req.body;   // ← CHANGE: read initData, not telegramId
  if (!initData) {
    return res.status(401).json({ error: "Missing authentication" });
  }
  const verified = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!verified) {
    return res.status(403).json({ error: "Invalid authentication" });
  }
  const userData = JSON.parse(verified.user);
  const telegramId = userData.id;   // ← REAL user, not from request body

  const user = await BingoBord.findOne({ telegramId });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ wallet: user.Wallet });
});
app.post('/update-wallet', async (req, res) => {
  const { initData, amount } = req.body;   // ✅ read initData, not telegramId
  if (!initData) return res.status(401).json({ error: "Missing authentication" });
  const verified = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!verified) return res.status(403).json({ error: "Invalid" });
  const userData = JSON.parse(verified.user);
  const telegramId = userData.id;   // ✅ REAL user

  const user = await BingoBord.findOne({ telegramId });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.Wallet + amount < 0) {
    return res.status(402).json({ error: "Insufficient funds" });
  }
  user.Wallet += amount;
  await user.save();
  res.json({ wallet: user.Wallet });
});
app.get("/dashboard", verfyuser, async (req, res) => {
  console.log("Dashboard route hit");
  try {
    const user = await BingoBord.find({});
    console.log("All users are:", user);
    return res.json({ valid: true, user: user });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ valid: false, message: "Error fetching users" });
  }
});
/* app.get("/dashboard",verfyuser,async(req,res)=>{
  //const{username,password}=req.body
     
     const user=await BingoBord.find({})
     console.log("all users are", user);
    return  res.json({valid:true ,user:user});
    
}) */
app.post("/updateplayer", async (req, res) => { 
  const { username,stake,numberofplayer,profit,awardforagent,totalcash,venderaward,winerAward,percent } = req.body;

  const data = {
      username: username,
      numberofplayer:numberofplayer,
      profit:profit,
      stake: stake,
      totalcash: totalcash,
      venderaward: venderaward,
      winerAward:winerAward,
      awardforagent:awardforagent,
      percent:percent
  };

  try {
      // Find if the player already exists
      const check = await BingoBord.findOne({ username: username });
     // console.log("user is ",check);
        console.log("winer awared is ",winerAward);
      if (check) {
       // Retrieve the last gameId from gameHistory if it exists, otherwise start from 0
let depo1 = (check.gameHistory.length > 0) 
? check.gameHistory[check.gameHistory.length - 1].gameId + 1 
: 1;
        console.log( check.gameId);
           depo1 =depo1+1;// Increment gameId
          const PayeForVendor = venderaward;
          
          const waletdeuction = -venderaward;
          const filter = { username:  username };
          const update = {
              $inc: { Wallet: waletdeuction }, // Deduct from Wallet
             
              $push: { 
                  gameHistory: { 
                      gameId: depo1,
                      stake: stake,
                      numberofplayer:numberofplayer,
                      profit:profit,
                      awardforagen:awardforagent, 
                      PayeForVendor: PayeForVendor, 
                      winerAward: winerAward,
                      totalcash: totalcash,
                      percent:percent,
                      timestamp: new Date()
                  } 
              } // Push new game history entry
          };

          const result = await BingoBord.updateOne(filter, update);
          if (result.matchedCount === 0) {
              console.log("No documents matched the filter.");
          } else if (result.modifiedCount === 0) {
              console.log("Document was found, but no updates were made.");
          } else {
              console.log("Document updated successfully.");
          }
          return res.json("updated"); // Send response after successful update
      } else {
          // If player does not exist, insert data and respond
          await BingoBord.insertMany([data]); // Ensure collection is defined correctly here
          return res.json("notexist");
      }
  } catch (e) {
      console.error("Database error:", e); // Log the error
      if (!res.headersSent) { // Ensure response is sent only once
          res.json("fail");
      }
  }
});
app.post("/api/spin", async (req, res) => {
  const { initData, stake } = req.body;
  if (!initData) return res.status(401).json({ error: "Missing authentication" });
  const verified = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!verified) return res.status(403).json({ error: "Invalid authentication" });
  const userData = JSON.parse(verified.user);
  const user = await BingoBord.findOne({ telegramId: userData.id });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.Wallet < stake) {
    return res.status(400).json({ error: "Insufficient balance", newBalance: user.Wallet, winAmount: 0 });
  }

  // Deduct stake
  user.Wallet -= stake;

  // --- Determine win amount (you can set your own probabilities) ---
  let winAmount = 0;
  
  // else winAmount = 0

  user.Wallet += winAmount;
  await user.save();

  res.json({ winAmount, newBalance: user.Wallet });
});
app.post("/login", async (req, res) => {
  const { username, password, } = req.body;

  try {
    const user = await BingoBord.login(username, password); // your login logic
    const token = createToken(user._id);

    return res.status(200).json({ username, token }); // send one response and return
  } catch (error) {
    return res.status(400).json({ error: error.message }); // only sent if error occurs
  }
});

// Add this near the end of your file, after all handlers but before the listen block
setInterval(() => {
    const roomCount = Object.keys(rooms).length;
    const activeInjections = Object.values(rooms).filter(r => r.injectInterval).length;
    const totalCartelas = Object.values(rooms).reduce((sum, r) => sum + r.selectedIndexes.length, 0);
    console.log(`[MONITOR] Rooms: ${roomCount}, Active injections: ${activeInjections}, Total cartelas: ${totalCartelas}`);
}, 60000);

app.post("/gameid",async(req,res)=>{
 
  const lastGame = await GameIdCounter.findOne().sort({ gameId: -1 }); // Sort by gameId in descending order

  if (lastGame) {
      return lastGame.gameId; // Return the gameId of the last game
  } else {
      throw new Error("No games found.");
  }

})
const port = process.env.PORT || 3001;

if (!process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0') {
    // This block ONLY runs on the first CPU Core (Core 0)
    server.listen(port, '0.0.0.0', () => {
        console.log(`MASTER CORE (0): Server and Bot connected on port ${port}`);
    });
} else {
    // This block runs on Cores 1, 2, and 3
    // We don't call server.listen here to avoid "Port in Use" or "Telegram Conflict" errors
    console.log(`WORKER CORE (${process.env.NODE_APP_INSTANCE}): Handling game logic and DB.`);
}