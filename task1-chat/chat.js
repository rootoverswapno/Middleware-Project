const amqp = require("amqplib");
const readline = require("readline");

async function start() {
  const username = process.argv[2];
  const endpoint = process.argv[3] || "amqp://localhost";
  const room = process.argv[4] || "room";

  if (!username) {
    console.log("Usage: node chat.js <username> <endpoint> <room>");
    process.exit(1);
  }

  const connection = await amqp.connect(endpoint);
  const channel = await connection.createChannel();

  const exchangeName = "chat_exchange";
  await channel.assertExchange(exchangeName, "topic", { durable: false });

  const q = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(q.queue, exchangeName, room);

  console.log(`${username} joined room: ${room}`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  channel.consume(
    q.queue,
    (msg) => {
      if (msg) {
        const data = JSON.parse(msg.content.toString());
        if (data.username !== username) {
          console.log(`\n[${data.username}]: ${data.message}`);
          rl.prompt();
        }
      }
    },
    { noAck: true }
  );

  rl.prompt();

  rl.on("line", (line) => {
    const text = line.trim();

    if (text.toLowerCase() === "exit") {
      rl.close();
      return;
    }

    const payload = {
      username,
      message: text,
      time: new Date().toISOString(),
    };

    channel.publish(exchangeName, room, Buffer.from(JSON.stringify(payload)));
    rl.prompt();
  });

  rl.on("close", async () => {
    await channel.close();
    await connection.close();
    console.log("Chat closed.");
    process.exit(0);
  });
}

start().catch((err) => {
  console.error("Error:", err.message);
});