const amqp = require("amqplib");

const currentPositions = new Map();
const contacts = new Map();

function ensureContactList(name) {
  if (!contacts.has(name)) contacts.set(name, []);
}

function addEncounter(a, b, time) {
  ensureContactList(a);
  ensureContactList(b);

  contacts.get(a).push({ person: b, time });
  contacts.get(b).push({ person: a, time });
}

function getLatestUniqueContacts(name) {
  const events = contacts.get(name) || [];
  const sorted = [...events].sort((a, b) => new Date(b.time) - new Date(a.time));

  const seen = new Set();
  const result = [];

  for (const item of sorted) {
    if (!seen.has(item.person)) {
      seen.add(item.person);
      result.push(item.person);
    }
  }

  return result;
}

async function start() {
  const endpoint = process.argv[2] || "amqp://localhost";
  let width = Number(process.argv[3] || 10);
  let height = Number(process.argv[4] || 10);

  width = Math.min(Math.max(width, 1), 1000);
  height = Math.min(Math.max(height, 1), 1000);

  const connection = await amqp.connect(endpoint);
  const channel = await connection.createChannel();

  const exchangeName = "contact_exchange";

  await channel.assertExchange(exchangeName, "topic", { durable: false });

  await channel.assertQueue("position_queue", { durable: false });
  await channel.assertQueue("query_queue", { durable: false });

  await channel.bindQueue("position_queue", exchangeName, "position");
  await channel.bindQueue("query_queue", exchangeName, "query");

  console.log(`Tracker is running on board ${width}x${height}`);

  channel.consume("position_queue", (msg) => {
    if (!msg) return;

    const data = JSON.parse(msg.content.toString());
    const { person, x, y, time } = data;

    currentPositions.set(person, { x, y, time });

    for (const [other, pos] of currentPositions.entries()) {
      if (other !== person && pos.x === x && pos.y === y) {
        console.log(`CONTACT: ${person} met ${other} at (${x}, ${y})`);
        addEncounter(person, other, time);
      }
    }

    channel.ack(msg);
  });

  channel.consume("query_queue", (msg) => {
    if (!msg) return;

    const data = JSON.parse(msg.content.toString());
    const target = data.person;

    const result = {
      target,
      contacts: getLatestUniqueContacts(target),
      time: new Date().toISOString()
    };

    channel.publish(exchangeName, "query-response", Buffer.from(JSON.stringify(result)));
    console.log(`Query handled for ${target}:`, result.contacts);

    channel.ack(msg);
  });
}

start().catch((err) => {
  console.error("Error:", err.message);
});