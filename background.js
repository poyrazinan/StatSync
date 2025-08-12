const GAME_ID = 21640;
const OBS_FILE = "C:\\Users\\Public\\Documents\\StatSync\\score.txt";

let state = {
  score: { won: 0, lost: 0 },
  kills: 0,
  deaths: 0,
  kda: "0.00",
  round: 0,
  phase: null,
  rank: null,
  rr: null
};

let kickChannel = "";
let kickCookie = "";
let kickChannelId = null;

function calcKDA() {
  const d = Math.max(1, state.deaths);
  state.kda = (state.kills / d).toFixed(2);
}

function writeObs() {
  const txt = `R:${state.round} ${state.phase||"-"} | ${state.score.won}-${state.score.lost} | K/D:${state.kills}/${state.deaths} KDA:${state.kda}`;
  overwolf.io.writeFileContents(OBS_FILE, txt, overwolf.io.enums.eEncoding.UTF8, true, ()=>{});
}

async function kickGraphQL(query, variables) {
  return fetch("https://kick.com/api/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cookie": `__Secure-next-auth.session-token=${kickCookie}`
    },
    body: JSON.stringify({ query, variables })
  }).then(r => r.json());
}

async function initKick() {
  const q = `query($slug: String!) { channel(slug: $slug) { id } }`;
  const data = await kickGraphQL(q, { slug: kickChannel });
  kickChannelId = data.data?.channel?.id;
  if (kickChannelId) connectKickWS();
}

function connectKickWS() {
  const ws = new WebSocket(`wss://chat.kick.com/${kickChannelId}`);
  ws.onopen = () => console.log("[Kick] Connected");
  ws.onmessage = e => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === "message") {
        handleKickCommand(msg.data.content.trim());
      }
    } catch {}
  };
  ws.onclose = () => setTimeout(connectKickWS, 5000);
}

function sendKickMessage(content) {
  const q = `mutation($input: SendMessageInput!) { sendMessage(input: $input) { id } }`;
  kickGraphQL(q, { input: { channel_id: kickChannelId, content } });
}

function handleKickCommand(cmd) {
  if (cmd === "!score") {
    sendKickMessage(`Score ${state.score.won}-${state.score.lost} | Round ${state.round} (${state.phase||"-"})`);
  }
  if (cmd === "!kda") {
    sendKickMessage(`K/D ${state.kills}/${state.deaths} | KDA ${state.kda}`);
  }
  if (cmd.startsWith("!setrank")) {
    const parts = cmd.split(" ");
    state.rank = parts[1] || null;
    state.rr = parts[2] ? Number(parts[2]) : null;
    writeObs();
    sendKickMessage(`Rank set: ${state.rank} ${state.rr!=null?`(${state.rr}RR)`:``}`);
  }
}

function onInfo(info) {
  if (info.feature === "match_info" && info.info?.match_info) {
    const mi = info.info.match_info;
    if (mi.score) state.score = JSON.parse(mi.score);
    if (mi.round_number) state.round = parseInt(mi.round_number);
    if (mi.round_phase) state.phase = mi.round_phase;
    calcKDA();
    writeObs();
  }
}

function onEvent(e) {
  e.events?.forEach(ev => {
    if (ev.name === "kill") state.kills++;
    if (ev.name === "death") state.deaths++;
    calcKDA();
    writeObs();
  });
}

function startGEP() {
  overwolf.games.events.onInfoUpdates2.addListener(onInfo);
  overwolf.games.events.onNewEvents.addListener(onEvent);
  overwolf.games.events.setRequiredFeatures(["match_info", "kill", "death"], ()=>{});
}

overwolf.settings.getStorage("kick_channel", r => kickChannel = r?.value || "");
overwolf.settings.getStorage("kick_cookie", r => {
  kickCookie = r?.value || "";
  if (kickChannel && kickCookie) initKick();
});

startGEP();
