require("dotenv/config");
const { Client } = require("pg");

async function test(name, url) {
  console.log(`\n--- ${name} ---`);
  const c = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await c.connect();
    const r = await c.query("SELECT 1 as test");
    console.log("OK:", r.rows[0]);
    await c.end();
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}

(async () => {
  await test("DIRECT", "postgresql://postgres:F86bWtVtN84yGoEm@db.cbewrmpizccdhgqxugjk.supabase.co:5432/postgres");
  await test("POOLER_5432", "postgresql://postgres.cbewrmpizccdhgqxugjk:F86bWtVtN84yGoEm@aws-1-sa-east-1.pooler.supabase.com:5432/postgres");
  await test("POOLER_6543", "postgresql://postgres.cbewrmpizccdhgqxugjk:F86bWtVtN84yGoEm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres");
})();
