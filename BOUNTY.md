# Bounty and contributions

ORVYN is built in public. The most useful thing anyone can do is try to break it and tell
me exactly how.

Chapter 1 is a simulated portfolio builder: demo reference prices, simulated holdings, no
brokerage, no custody, no real money. That makes it a safe place to test the parts that
matter — the rules engine, the drift maths, the rebalance simulation, the draft store and
the screens around them.

## What you get

Rewards are per action, never tied to a simulated return.

| Action | Reward |
| --- | --- |
| A confirmed bug with a reproduction | Credit in the release notes, early access to the next chapter |
| A confirmed security or privacy issue | Credit once it is fixed, early access, and the fix prioritised |
| A merged pull request | Credit in the release notes, early access |
| A merged feature with its own tests | The same, plus a short write-up in the build log if you want one |
| Testing a release and reporting what broke | Credit as a tester, early access |

This is a credit and early access programme. No cash is promised today. If that changes,
this file will say so before anyone is asked to do the work.

Every accepted report gets credit under the name or handle you choose, or stays anonymous
if you ask. A report is not worth less because you did not post about it.

## Posting on X is optional

If you report a bug or open a pull request and want to post about it on
[X](https://x.com/orvyn_io), that is appreciated. Tag [@orvyn_io](https://x.com/orvyn_io)
and link the issue or PR so other testers can follow it.

It is not required, it does not change the reward, and it does not move a report up the
queue. Please do not post details of an unfixed security issue in public.

## What counts

- **Correctness.** Weights that do not add up, drift that does not close after a rebalance,
  a rule that is not enforced, a draft that is lost or corrupted on refresh, a figure that
  disagrees with another figure on the same screen.
- **Security and privacy.** Cross-site scripting, secrets reaching the client bundle, auth
  or session bypass, unsafe transaction handling, a dependency with a real exploit path,
  anything that exposes one person's data to another.
- **Accessibility and UX.** Keyboard traps, controls that cannot be reached, unreadable
  contrast, a layout that breaks at a real viewport size, copy that states something the
  code does not do.
- **Documentation and setup.** A command that fails on a clean machine, a step that is
  missing, a claim in the README that is no longer true.

## What is out of scope

- Reports that the app is simulated, uses reference prices, or does not place real orders.
  That is the design, and every screen says so.
- Features already listed as planned in the README or the release notes.
- Styling preferences and copy opinions without a functional problem.
- Generic scanner output with no reproduction and no demonstrated impact.
- Attacks that need a compromised device, browser extension, wallet or seed phrase.
- Outages or bugs inside third-party services (hosting, RPC providers, wallets, brokerage
  integrations). Report those upstream; tell me if ORVYN handles the failure badly.
- Denial of service with no practical impact, spam, and automated issue floods.

## Reporting a bug or a feature

Open a GitHub issue. One issue per report, with:

- the route or screen, and the commit if you know it;
- what you did, what you expected, and what happened;
- browser and operating system;
- a screenshot or a short recording if the problem is visual;
- the browser console output if there is an error.

For a feature request, describe the problem before the solution. Small fixes can go
straight to a pull request. For anything larger, open an issue first so the scope is agreed
before you spend a weekend on it.

Never paste a private key, seed phrase, API key, `.env` file, or another person's data into
an issue. Redact it. If you think a secret has leaked, say so immediately and rotate it;
do not wait for a fix.

## Reporting a security issue

Do not open a public issue for a security problem.

Use the repository's **Security** tab and choose **Report a vulnerability** if private
reporting is available. If it is not, send a direct message to
[@orvyn_io](https://x.com/orvyn_io) asking for a private channel, without the details in
the first message.

Include the impact, the smallest reproduction you have, the affected route or commit, and
whether any data other than your own test data is involved. Use a test wallet and test
data only.

I will acknowledge a security report as soon as I can, aim to fix confirmed issues before
publishing anything about them, and credit you when the fix ships unless you prefer to stay
anonymous. Please give a reasonable window to fix the issue before writing about it in
public; I will tell you when it is fixed or if I need more time.

Reports made in good faith, without touching other people's data and without disrupting the
service, will not be pursued. Do not use real funds, do not attack third-party services,
and do not test against anyone else's account.

## Pull requests

- Keep one change per pull request, and name the change in the commit message.
- Match the surrounding structure, naming and design tokens. If a pattern already exists,
  use it instead of adding a second one.
- Add or update tests when behaviour changes. The checks are:

  ```bash
  bun test
  bun run check
  bun run build
  ```

- Do not commit secrets, `.env` files, generated native folders, or large media.
- Do not add a dependency without asking first. The project prefers the platform and the
  packages already in the tree.
- By opening a pull request you agree that the contribution is licensed under the MIT
  licence in [LICENSE](./LICENSE).

If a pull request is close but not mergeable, I will say why in the thread. A closed pull
request is not a rejection of the work; it usually means the scope or timing is wrong.

## Response times

This is an early project. I read every report. Security issues come first, then regressions,
then everything else. If a report has gone quiet for a week, ping the issue or send a
message; a nudge is welcome, not rude.

## Thank you

The point of building in public is that other people can see the seams. A precise bug
report is worth more than a compliment, and a test that catches a wrong number is worth
more than a feature that looks right.
