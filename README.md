# Tax for Dummies

[![Tests](https://github.com/tax-for-dummies/tax-for-dummies/actions/workflows/test.yml/badge.svg)](https://github.com/tax-for-dummies/tax-for-dummies/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Ftax-for-dummies.com)](https://tax-for-dummies.com)
[![GitHub](https://img.shields.io/badge/source-GitHub-black?logo=github)](https://github.com/tax-for-dummies/tax-for-dummies)

Free calculator for UK income tax, National Insurance, student loans, and employer NI. See the real cost of your bills after tax - covering England, Scotland, Wales, and Northern Ireland.

Updated for the 2026/27 tax year.

Live at [tax-for-dummies.com](https://tax-for-dummies.com)

## Mission

Tax policy affects everyone, but the rules are written in a way that is hard to follow. This project exists to change that.

We believe people deserve to understand exactly where their money goes. Every rate, threshold, and calculation used here comes from publicly available HMRC data - there is no proprietary logic, no hidden assumptions, and no black box. All the information is in the public domain and this project simply makes it easier to use.

We are committed to transparency. The source code is open, the methodology is visible, and anyone can inspect, question, or contribute to how the numbers are produced.

## Running locally

No build step - just serve the files:

```bash
python3 -m http.server 3000
```

Then open [http://localhost:3000](http://localhost:3000).

## Tests

```bash
cd tests
npm install
npx playwright install --with-deps
npm test
```

## Infrastructure

DNS and hosting are managed with Terraform in [`infra/`](infra/).

## License

MIT
