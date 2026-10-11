# Build Your Own GPT: Batteries Included, Hype Not

> Transformers are complicated. We read the papers so you don’t have to. Tag along and see how LLMs, RAG and agents really work.

A break-it-yourself AI-literacy course for office folks: **Fix the broken bot** (~15–20 minutes, the main path) and **Learn: How a GPT works** (9 steps, ~45 minutes, the deep route). Runs offline in your browser.

> 🧪 This README describes the **preview** at https://venky3007.github.io/build-your-own-gpt/preview/

**▶ Try it live: [https://venky3007.github.io/build-your-own-gpt/](https://venky3007.github.io/build-your-own-gpt/)**

![Screenshot: the welcome screen and the peel-the-layers diagram](docs/screenshot.png)


## Two tracks, side by side

- **🔧 Fix the broken bot (~15–20 minutes; the welcome page's main button).** Pick a job (HR helper, IT helpdesk, Sales assistant or Finance checker). Your bot went live this morning and its **Shift Board** (8 real staff questions + 2 traps) is all red. Fix it in 8 levels: makes things up → doesn't know us (connect the documents) → found the retired 2019 copy → can't find it (search by meaning) → forgot the rule (context window) → botched the sum (think first) → got hijacked (prompt injection, least privilege) → no-go zones (guardrails). Each level: ticket, predict, 3-line idea, fix (with tempting wrong fixes that visibly fail), **Prompt X-ray** before/after, re-test, Monday rule. Then an **exam** (full board + 4 surprises: 13/14, "No bot gets 100%"), a **spec card** with "because" lines and risks, a **My AI habits** card (10 rules, download/print), a copy-to-clipboard brag line, and a chat with your bot.
- **📘 Learn: How a GPT works (9 steps, ~45 minutes).** The deep route, with a real tiny model trained in your browser and a **peel-the-layers diagram**.

## What's inside

| Learn step | What you build and break |
|---|---|
| 1. The Autocomplete Engine | next-token prediction and tokens |
| 2. Fuel: Training Data | training, loss and why data quality matters |
| 3. Attention, Please | attention and the context window |
| 4. Inside the Brain | the transformer, end to end: embeddings, positions, attention, feed-forward layers and softmax |
| 5. Scale It Up | scale, parameters and pretraining |
| 6. Bolt On a Library | RAG (look it up, then answer) |
| 7. Hand It Some Tools | agents, tool use and agentic RAG |
| 8. Fine-Tune the Manners | fine-tuning, RLHF and what comes after |
| 9. Ship It: Write the Spec | spotting fantasy requirements, then specifying a real one |

## Real vs simulated (honest labels)

- **Steps 1 and 2 use a real tiny transformer.** It is a character-level model with causal multi-head self-attention (about 16,000 parameters, 1 block, 2 heads, context 20) written in plain JavaScript and trained live in your browser in about 15–25 seconds on a bundled corpus of fictional office emails. You watch the real loss curve fall, the samples improve from gibberish to word-like text, and a live attention heatmap over the last few characters.
- **Everything else is scripted** to show a real mechanism safely and offline, and is labelled "Simulated for this demo" on the page. The Fix-the-broken-bot answers and chat are labelled "Simulated from your fixes".

## Privacy

**Nothing leaves your browser.** There is no server, no login, no analytics, no cookies and no cloud AI. A Content Security Policy blocks all network requests (`connect-src 'none'`); fonts and every other asset are bundled. Progress and your bot's picks are saved only in this browser's local storage, and you can reset them at any time.

## Run it locally

It's a static site. From the repository root:

```
python3 -m http.server 8000
```

then open http://localhost:8000/. (Opening `index.html` directly also works in most browsers.)

## Customising

The course name, subtitle and blurb live in one place: `assets/js/config.js`.

## Credits

Fonts: Inter, Space Grotesk and JetBrains Mono, bundled locally under the SIL Open Font License (see `assets/fonts/LICENSE-OFL.txt`). All names, companies and emails in the course are fictional.
