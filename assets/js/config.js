/* ONE place to rename the course. Edit here, then run:  node tools/apply-config.mjs
   (that stamps the static <title>/<meta> in index.html and regenerates the repo README).
   Everything else (header, welcome screen, tab titles, worksheet export/print) reads this at runtime. */
window.SITE_CONFIG = {
  name: 'Build Your Own GPT: Batteries Included, Hype Not',
  subtitle: 'Transformers are complicated. We read the papers so you don\u2019t have to. Tag along and see how LLMs, RAG and agents really work.',
  blurb: 'A 90-minute, break-it-yourself course that shows tech and business folks how LLMs, RAG and agents really work, and turns that into better AI requirements. Runs offline in your browser.',
  liveUrl: 'https://venky3007.github.io/raise-your-own-baby-ai/',
  repo: 'venky3007/raise-your-own-baby-ai'
};
