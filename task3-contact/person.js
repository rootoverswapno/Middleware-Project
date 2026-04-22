const amqp = require("amqplib");

function getInterval(speed) {
  const s = String(speed).toLowerCase();

  if (s === "fast") return 1000;
  if (s === "medium") return 2000;
  if (s === "slow") return 3000;

  const num = Number(speed);
  if (!Number.isNaN(num) && num > 0) return num;

  return 2000;
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getNextMove(x, y, width, height) {
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  const [dx, dy] = directions[randomInt(directions.length)];
  return {
    x: clamp(x + dx, 0, width - 1),
    y: clamp(y + dy, 0, height - 1)
  };
}

async function start() {
  const endpoint = process.argv[2] || "amqp://localhost";
  const person = process.argv[3];
  const speed = process.argv[4] || "medium";
  let width = Number(process.argv[5] || 10);
  let height = Number(process.argv[6] || 10);

  if (!person) {
    console.log("Usage: node person.js <endpoint> <person> <speed> <width> <height>");
    process.exit(1);
  }

  width = Math.min(Math.max(width, 1), 1000);
  height = Math.min(Math.max(height, 1), 1000);

  const connection = await amqp.connect(endpoint);
  const channel = await connection.createChannel();

  const exchangeName = "contact_exchange";
  await channel.assertExchange(exchangeName, "topic", { durable: false });

  let x = randomInt(width);
  let y = randomInt(height);

  function publishPosition() {
    const payload = {
      person,
      x,
      y,
      time: new Date().toISOString()
    };

    channel.publish(exchangeName, "position", Buffer.from(JSON.stringify(payload)));
    console.log(`${person} -> (${x}, ${y})`);
  }

  publishPosition();

  const interval = getInterval(speed);
  const timer = setInterval(() => {
    const next = getNextMove(x, y, width, height);
    x = next.x;
    y = next.y;
    publishPosition();
  }, interval);

  process.on("SIGINT", async () => {
    clearInterval(timer);
    await channel.close();
    await connection.close();
    console.log(`\n${person} stopped.`);
    process.exit(0);
  });
}

start().catch((err) => {
  console.error("Error:", err.message);
});