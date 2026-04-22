const amqp = require("amqplib");

async function start() {
  const username = process.argv[2];
  const endpoint = process.argv[3] || "amqp://localhost";
  const side = (process.argv[4] || "").toUpperCase();
  const inputQuantity = Number(process.argv[5]);
  const price = Number(process.argv[6]);

  if (!username || !side || Number.isNaN(price)) {
    console.log("Usage: node sendOrder.js <username> <endpoint> <BUY|SELL> <quantity> <price>");
    process.exit(1);
  }

  if (side !== "BUY" && side !== "SELL") {
    console.log("SIDE must be BUY or SELL");
    process.exit(1);
  }

  const quantity = 100;
  if (inputQuantity !== 100) {
    console.log("Note: quantity is fixed at 100 for this assignment. Using 100.");
  }

  const connection = await amqp.connect(endpoint);
  const channel = await connection.createChannel();

  const exchangeName = "trading_exchange";
  await channel.assertExchange(exchangeName, "topic", { durable: false });

  const order = {
    id: Date.now() + "-" + Math.floor(Math.random() * 10000),
    user: username,
    side,
    quantity,
    price,
    stock: "XYZ Corp",
    time: new Date().toISOString()
  };

  channel.publish(exchangeName, "orders", Buffer.from(JSON.stringify(order)));

  console.log("Order sent:");
  console.log(order);

  await channel.close();
  await connection.close();
}

start().catch((err) => {
  console.error("Error:", err.message);
});