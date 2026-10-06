# Build Your Own GPT: Batteries Included, Hype Not

> Transformers are complicated. We read the papers so you don’t have to. Tag along and see how LLMs, RAG and agents really work.

A 90-minute, break-it-yourself course that shows tech and business folks how LLMs, RAG and agents really work, and turns that into better AI requirements. Runs offline in your browser.

**▶ Try it live: [https://venky3007.github.io/raise-your-own-baby-ai/](https://venky3007.github.io/raise-your-own-baby-ai/)**

![Screenshot: the welcome screen with the express lane and the peel-the-layers diagram](docs/screenshot.png)

## Two ways in

- **Express lane (~15 minutes).** Short on time? The welcome screen offers a four-stop express lane: Step 1 (next-token prediction), Step 3 (attention), Step 6 (RAG) and Step 9 (write the spec in the Requirement Framing Worksheet). Progress is tracked, and at the end you are invited to continue the full build.
- **Full build (~90 minutes).** 9 core steps that assemble a GPT part by part, then 13 optional steps in four short chapters.

As you go, a **peel-the-layers diagram** starts fully assembled (just the chat box a user sees) and peels one layer per step, down to tokens, ending in a fully exploded view.

## What's inside

| Core step | What you build and break |
|---|---|
| 1. The Autocomplete Engine | next-token prediction and tokens |
| 2. Fuel: Training Data | training, loss and why data quality matters |
| 3. Attention, Please | attention and the context window |
| 4. Inside the Brain | the transformer, end to end: embeddings, positions, attention, feed-forward layers and softmax |
| 5. Scale It Up | scale, parameters and pretraining |
| 6. Bolt On a Library | RAG (look it up, then answer) |
| 7. Hand It Some Tools | agents, tool use and agentic RAG |
| 8. Fine-Tune the Manners | fine-tuning, RLHF and what comes after |
| 9. Ship It: Write the Spec | the Requirement Framing Worksheet |

Optional chapters: **Smarter retrieval and inputs** (Steps 10-13), **Thinking and doing, safely** (Steps 14-16), **Proving it and polishing it** (Steps 17-19), **Right-sizing and budgeting** (Steps 20-22).

## Real vs simulated (honest labels)

- **Steps 1 and 2 use a real neural network.** It is a tiny character-level language model (about 10,000 parameters) written in plain JavaScript and trained live in your browser, in a few seconds, on a bundled corpus of fictional office emails. You watch the real loss curve fall and the samples improve from gibberish to word-like text.
- **Everything else is scripted** to show a real mechanism safely and offline, and is labelled "Simulated for this demo" on the page.

## Privacy

**Nothing leaves your browser.** There is no server, no login, no analytics, no cookies and no cloud AI. A Content Security Policy blocks all network requests (`connect-src 'none'`); fonts and every other asset are bundled. Progress and your worksheet are saved only in this browser's local storage, and you can reset them at any time.

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
