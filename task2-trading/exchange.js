const amqp = require("amqplib");

const buyOrders = [];
const sellOrders = [];

function sortBooks() {
  buyOrders.sort((a, b) => {
    if (b.price !== a.price) return b.price - a.price;
    return new Date(a.time) - new Date(b.time);
  });

  sellOrders.sort((a, b) => {
    if (a.price !== b.price) return a.price - b.price;
    return new Date(a.time) - new Date(b.time);
  });
}

function printBooks() {
  console.log("\n===== ORDER BOOK =====");
  console.log("BUY:", buyOrders.map(o => `${o.user}@${o.price}`));
  console.log("SELL:", sellOrders.map(o => `${o.user}@${o.price}`));
  console.log("======================\n");
}

async function start() {
  const endpoint = process.argv[2] || "amqp://localhost";

  const connection = await amqp.connect(endpoint);
  const channel = await connection.createChannel();

  const exchangeName = "trading_exchange";
  const ordersQueue = "orders_queue";

  await channel.assertExchange(exchangeName, "topic", { durable: false });
  await channel.assertQueue(ordersQueue, { durable: false });
  await channel.bindQueue(ordersQueue, exchangeName, "orders");

  console.log("Exchange is running and waiting for orders...");

  channel.consume(
    ordersQueue,
    (msg) => {
      if (!msg) return;

      const order = JSON.parse(msg.content.toString());
      console.log("\nReceived order:", order);

      sortBooks();

      if (order.side === "BUY") {
        const matchIndex = sellOrders.findIndex(sell => sell.price <= order.price);

        if (matchIndex !== -1) {
          const matchedSell = sellOrders.splice(matchIndex, 1)[0];

          const trade = {
            buyer: order.user,
            seller: matchedSell.user,
            stock: "XYZ Corp",
            quantity: 100,
            price: matchedSell.price,
            time: new Date().toISOString()
          };

          channel.publish(exchangeName, "trades", Buffer.from(JSON.stringify(trade)));
          console.log("TRADE DONE:", trade);
        } else {
          buyOrders.push(order);
          console.log("No match found. BUY order added to book.");
        }
      } else if (order.side === "SELL") {
        const matchIndex = buyOrders.findIndex(buy => buy.price >= order.price);

        if (matchIndex !== -1) {
          const matchedBuy = buyOrders.splice(matchIndex, 1)[0];

          const trade = {
            buyer: matchedBuy.user,
            seller: order.user,
            stock: "XYZ Corp",
            quantity: 100,
            price: matchedBuy.price,
            time: new Date().toISOString()
          };

          channel.publish(exchangeName, "trades", Buffer.from(JSON.stringify(trade)));
          console.log("TRADE DONE:", trade);
        } else {
          sellOrders.push(order);
          console.log("No match found. SELL order added to book.");
        }
      }

      sortBooks();
      printBooks();
      channel.ack(msg);
    },
    { noAck: false }
  );
}

start().catch((err) => {
  console.error("Error:", err.message);
});