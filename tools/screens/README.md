# tools/screens (untracked)

Screenshot capture and a pixel diff for the probability components work
(docs/COMPONENTS_PROBABILITY_V2.md section 8). Node built-ins only (zlib), no
dependency. Kept untracked on purpose (product owner, 2026-10-27).

```sh
# Metro must be serving the debug bundle: npx react-native start
node tools/screens/capture.js p17  docs/screens/probability-v2/<run>-p17    # iPhone 17 Pro, 402 pt
node tools/screens/capture.js p16e docs/screens/probability-v2/<run>-p16e   # iPhone 16e, 390 pt
node tools/screens/diff.js docs/screens/probability-v2/<runA>-p17 docs/screens/probability-v2/<runB>-p17
```

- Every launch passes `-devLlm off`: no AI client is built, so no model call can happen.
- The app is reinstalled first (empty storage); read-only cases run first, the
  `-devActions answerAll` cases (they write stored events and done marks) last.
- The status bar is fixed with `simctl status_bar override`; `diff.js` also masks
  the status-bar zone and the Proba tab's perf panel (React commit times).
- No 360 pt simulator exists: 360 pt needs a debug-only width wrapper on the
  demo tab (A1), not done yet.
- Screenshots go under `docs/screens/` (gitignored).
