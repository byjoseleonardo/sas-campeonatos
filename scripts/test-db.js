require("dotenv/config");
const { Client } = require("pg");

const urls = {
  DIRECT_URL: process.env.DIRECT_URL,
  DATABASE_URL: process.env.DATABASE_URL,
};

async function testConnection(name, url) {
  if (!url) { console.log(name, "-> NO DEFINIDA"); return; }
  const clean = url.replace(/:[^:@]+@/, ":***@");
  console.log(`\n--- ${name} ---`);
  console.log("URL:", clean);

  const c = new Client({
    connectionString: url.split("?")[0],
    ssl: { rejectUnauthorized: false },
  });

  try {
    await c.connect();
    const r = await c.query("SELECT 1 as test");
    console.log("RESULTADO:", r.rows[0]);
    console.log("CONECTADO OK");
    await c.end();
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}

(async () => {
  await testConnection("DIRECT_URL", urls.DIRECT_URL);
  await testConnection("DATABASE_URL", urls.DATABASE_URL);
})();
