import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { randomBytes, scryptSync } from "node:crypto";

const sql = neon(process.env.DATABASE_URL);

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

const username = process.argv[2] || "Admin";
const password = process.argv[3] || "password123";
const name = process.argv[4] || "Super Admin";
// Placeholder — this account signs in with username, never email, but the
// column is NOT NULL UNIQUE so it needs some unique value.
const email = `${username.toLowerCase()}@sapilot.local`;

const [existing] = await sql`select id from users where lower(username) = lower(${username})`;
if (existing) {
  await sql`
    update users
    set password_hash = ${hashPassword(password)}, role = 'super_admin', name = ${name}
    where id = ${existing.id}`;
  console.log(`Updated existing super admin: ${username} (id ${existing.id})`);
} else {
  const [created] = await sql`
    insert into users (email, username, name, password_hash, role)
    values (${email}, ${username}, ${name}, ${hashPassword(password)}, 'super_admin')
    returning id`;
  console.log(`Created super admin: ${username} (id ${created.id})`);
}
