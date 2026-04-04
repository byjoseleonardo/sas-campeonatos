const { Client } = require("pg");

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
console.log("Conectando a:", url ? url.replace(/:[^:@]+@/, ":***@") : "NO HAY URL");

const c = new Client(url);
c.connect()
  .then(() => {
    console.log("CONECTADO OK");
    return c.query("SELECT 1 as test");
  })
  .then((r) => {
    console.log("QUERY OK:", r.rows[0]);
    c.end();
  })
  .catch((e) => {
    console.error("ERROR:", e.message);
    process.exit(1);
  });
