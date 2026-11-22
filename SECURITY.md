# Security policy

Do not open a public issue for a security problem.

Use the repository's **Security** tab and choose **Report a vulnerability**. If private
reporting is not available, send a direct message to [@orvyn_io](https://x.com/orvyn_io)
asking for a private channel. Do not put the details in the first message.

Include the impact, the smallest reproduction you have, the affected route or commit, and
whether any data other than your own test data is involved. Use a test wallet and test data
only.

## Scope

In scope:

- cross-site scripting, injection or anything that runs untrusted code;
- secrets or server-only values reaching the browser bundle;
- authentication, session or transaction-handling bypass;
- a dependency with a reachable exploit path;
- anything that exposes one person's data to another.

Out of scope:

- reports that the app is simulated, uses reference prices or does not place orders;
- third-party services, wallets, RPC providers and brokerage integrations;
- attacks that need a compromised device, browser extension or seed phrase;
- denial of service with no practical impact and automated scanner output without a
  reproduction.

## What to expect

I read every report. Security reports come first. I will acknowledge as soon as I can, aim
to fix confirmed issues before publishing anything about them, and credit you when the fix
ships unless you prefer to stay anonymous. Please give a reasonable window to fix the issue
before writing about it in public; I will tell you when it is fixed or if I need more time.

Reports made in good faith, without touching other people's data and without disrupting the
service, will not be pursued. Do not use real funds or attack third-party services.

The contributor terms and the non-security bounty are in [BOUNTY.md](./BOUNTY.md).
