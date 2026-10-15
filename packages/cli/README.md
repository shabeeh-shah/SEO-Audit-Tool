# Signal audit CLI

Node.js 22.13+. Live commands send the public URL to the Signal service; they inspect server HTML and sampled resources, without browser lab or CrUX measurements. No credentials or page contents are uploaded by the CLI.

From the repository:

```sh
node packages/cli/bin/signal-audit.mjs https://your-public-site.com --output report.json
node packages/cli/bin/signal-audit.mjs --sample --json
node packages/cli/bin/signal-audit.mjs https://your-public-site.com --baseline report.json --max-drop 5 --min-score 70
```

Install a locally built package with `npm install -g ./signal-audit-0.1.0.tgz`, then use `signal-audit <url>` or `npx --no-install signal-audit <url>`.

The package is prepared for npm but is **not published**. Do not assume `npx signal-audit` from the public registry installs this project until the owner has verified the package name and published it. Build with `npm pack ./packages/cli --ignore-scripts`.

`--fail-on critical` fails on any Critical finding; `--fail-on improvement` also fails on Improvement findings. Optional findings never trigger this option. Exit codes: 0 passed, 1 threshold failed, 2 request/usage error. Baselines must match the final URL. `SIGNAL_BASE_URL` selects another Signal deployment (HTTPS, or localhost for development). The default public service is rate-limited; it is not a CI uptime guarantee. Keep uploaded CI artifacts private if URLs include private details.
