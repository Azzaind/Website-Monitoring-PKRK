const WebSocket = require("ws");

const publicWs = new WebSocket("ws://localhost:3000");
const adminWs = new WebSocket(
  `ws://localhost:3000?token=${encodeURIComponent(process.env.ADMIN_JWT)}`
);

function listen(name, ws) {
  ws.on("open", () => console.log(`${name}: CONNECTED`));
  ws.on("message", (data) => {
    console.log(`${name}:`, data.toString());
  });
  ws.on("error", (err) => {
    console.log(`${name} ERROR:`, err.message);
  });
  ws.on("close", (code) => {
    console.log(`${name}: CLOSED`, code);
  });
}

listen("PUBLIC", publicWs);
listen("ADMIN", adminWs);

setTimeout(() => {
  publicWs.close();
  adminWs.close();
}, 30000);
