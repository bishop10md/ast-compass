const required = ["SUPABASE_TEST_URL", "SUPABASE_TEST_ANON_KEY", "SUPABASE_TEST_USER_A_EMAIL", "SUPABASE_TEST_USER_A_PASSWORD", "SUPABASE_TEST_USER_B_EMAIL", "SUPABASE_TEST_USER_B_PASSWORD"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing non-production test variables: ${missing.join(", ")}`);
  process.exit(2);
}
const url = new URL(process.env.SUPABASE_TEST_URL);
if (/dfsvprtsdqhjrkciflsk/i.test(url.hostname) || process.env.ALLOW_PRODUCTION_RLS_TEST === "true") {
  console.error("Refusing to run: configure a disposable non-production Supabase project. Production overrides are intentionally unsupported.");
  process.exit(3);
}
console.log("Harness configuration accepted for a non-production project.");
console.log("Required matrix: A own CRUD/storage; B denied A rows/files/signed URLs/path guessing; anonymous denied authenticated data.");
console.log("Provision disposable fixtures and implement project-specific REST calls before enabling this harness in CI.");
process.exit(4);
