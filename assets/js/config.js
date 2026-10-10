/* ONE place to rename the course. Edit here, then run:  node tools/apply-config.mjs
   (that stamps the static <title>/<meta> in index.html and regenerates the repo README).
   Everything else (header, welcome screen, tab titles, spec card export) reads this at runtime. */
window.SITE_CONFIG = {
  name: 'Build Your Own GPT: Batteries Included, Hype Not',
  subtitle: 'Transformers are complicated. We read the papers so you don\u2019t have to. Tag along and see how LLMs, RAG and agents really work.',
  blurb: 'A break-it-yourself course (9 core steps, ~90 minutes) that shows office folks how LLMs, RAG and agents really work, then a 15-minute click-to-build sprint where you assemble your own work bot and chat with it. Runs offline in your browser.',
  liveUrl: 'https://venky3007.github.io/build-your-own-gpt/',
  repo: 'venky3007/build-your-own-gpt'
};
