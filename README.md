# Build Your Own GPT: Batteries Included, Hype Not

> Transformers are complicated. We read the papers so you don’t have to. Tag along and see how LLMs, RAG and agents really work.

A break-it-yourself course (9 core steps, ~90 minutes) that shows office folks how LLMs, RAG and agents really work, then a 15-minute click-to-build sprint where you assemble your own work bot and chat with it. Runs offline in your browser.

**▶ Try it live: [https://venky3007.github.io/build-your-own-gpt/](https://venky3007.github.io/build-your-own-gpt/)**

![Screenshot: the welcome screen and the peel-the-layers diagram](docs/screenshot.png)

![Screenshot: chatting with the bot you built in the sprint, with an off-script suggestion](docs/screenshot-chat.png)

## One route, two parts

- **Core build (~90 minutes).** 9 core steps that assemble a GPT part by part. A **peel-the-layers diagram** starts fully assembled (just the chat box a user sees) and peels one layer per step, down to tokens.
- **Build your GPT sprint (~15 minutes).** Nine click-to-build screens (zero typing except the bot's name): pick a job (HR helper, IT helpdesk, sales assistant or finance checker), a brain (small vs big, hosted vs open-weight, quantised/distilled, mixture of experts, with a live cost and speed meter), documents for RAG (chunking, keyword vs embedding search), memory, tools/MCP/agents and permissions, reasoning mode, long context and context engineering, screenshot and voice inputs, tone, guardrails, citations, a prompt-injection shield, honesty vs hallucination, alignment method (SFT, RLHF, DPO, Constitutional AI, verifiable rewards), and evals with optional synthetic test data. Click **Build** to watch the parts bolt into the layer diagram, get a downloadable/printable **spec card**, then **chat with your bot**. Its answers are simulated from your picks and the bundled fictional documents, with a "Why it answered this way" panel.

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
| 9. Ship It: Write the Spec | spotting fantasy requirements, then specifying a real one |

## Real vs simulated (honest labels)

- **Steps 1 and 2 use a real tiny transformer.** It is a character-level model with causal multi-head self-attention (about 16,000 parameters, 1 block, 2 heads, context 20) written in plain JavaScript and trained live in your browser in about 15–25 seconds on a bundled corpus of fictional office emails. You watch the real loss curve fall, the samples improve from gibberish to word-like text, and a live attention heatmap over the last few characters.
- **Everything else is scripted** to show a real mechanism safely and offline, and is labelled "Simulated for this demo" on the page. The sprint chat is labelled "Simulated from your choices".

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
