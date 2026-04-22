const amqp = require("amqplib");

async function start() {
  const endpoint = process.argv[2] || "amqp://localhost";
  const person = process.argv[3];

  if (!person) {
    console.log("Usage: node query.js <endpoint> <person>");
    process.exit(1);
  }

  const connection = await amqp.connect(endpoint);
  const channel = await connection.createChannel();

  const exchangeName = "contact_exchange";
  await channel.assertExchange(exchangeName, "topic", { durable: false });

  const q = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(q.queue, exchangeName, "query-response");

  channel.publish(
    exchangeName,
    "query",
    Buffer.from(JSON.stringify({ person, time: new Date().toISOString() }))
  );

  console.log(`Query sent for ${person}. Waiting for response...`);

  const timeout = setTimeout(async () => {
    console.log("No response received in time.");
    await channel.close();
    await connection.close();
    process.exit(0);
  }, 10000);

  channel.consume(
    q.queue,
    async (msg) => {
      if (!msg) return;

      const data = JSON.parse(msg.content.toString());

      if (data.target === person) {
        clearTimeout(timeout);

        console.log(`Contacts for ${person} (reverse-chronological unique order):`);
        if (!data.contacts || data.contacts.length === 0) {
          console.log("No contacts found.");
        } else {
          data.contacts.forEach((name, index) => {
            console.log(`${index + 1}. ${name}`);
          });
        }

        await channel.close();
        await connection.close();
        process.exit(0);
      }
    },
    { noAck: true }
  );
}

start().catch((err) => {
  console.error("Error:", err.message);
});