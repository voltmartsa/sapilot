import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { randomBytes, scryptSync } from "node:crypto";

const sql = neon(process.env.DATABASE_URL);

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

const email = process.argv[2] || "demo.student@sapilot.co.za";
const password = process.argv[3] || "FlyDemo2026!";
const name = process.argv[4] || "Demo Student";

const [existing] = await sql`select id from users where email = ${email}`;
if (existing) {
  console.log(`Account already exists: ${email}`);
  process.exit(0);
}

const [user] = await sql`
  insert into users (email, name, password_hash)
  values (${email}, ${name}, ${hashPassword(password)})
  returning id, email, name`;

// Subscribe the demo student to all four qualifications so every bank is unlocked.
const quals = await sql`select id, short_name from qualifications`;
for (const q of quals) {
  await sql`
    insert into subscriptions (user_id, qualification_id)
    values (${user.id}, ${q.id})
    on conflict do nothing`;
}

console.log(`Created: ${user.email} (password: ${password})`);
console.log(`Subscribed to: ${quals.map((q) => q.short_name).join(", ")}`);
