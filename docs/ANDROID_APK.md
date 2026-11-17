# Android test APK

The first build was on 2026-11-17. The app opened on the Pixel 8 emulator without crashing: onboarding, home, warm-up and the lesson board.

## Build
```
npm run apk
```
- The output is `android/app/build/outputs/apk/release/app-release.apk`, about 46 MB.
- The first build takes about 7 minutes; later builds are faster.
- It covers real phones only, 64-bit and 32-bit ARM (`arm64-v8a`, `armeabi-v7a`). Emulator-only CPU types are left out.
- It is signed with the debug keystore. That is fine for installing by hand on your own phone, but not for the Play Store, which needs its own upload key.

## The AI key (D21)
- **Default:** a release APK has no key, so the app runs on its built-in rules only.
- **With the AI, for the owner's phone only:** prefix the build with `INCLUDE_KEY_IN_RELEASE=1`. Before running it:
  - delete `android/app/build/generated/assets/react/release`, so Gradle rebundles the JS;
  - blank `openaiApiKey` in `src/config/llmLocal.generated.ts`, so only the Claude key ships;
  - afterwards, run `node tools/llm-config/gen.js` to restore that file.
- Anyone with the APK can extract the key. Don't share an AI APK. Rotate the key if it ever leaves your hands.

## Fonts
Android finds a font by its file name, so `android/app/src/main/assets/fonts` holds copies of the bundled faces:
- the four `Tajawal-*.ttf` files;
- `STIX Two Text.ttf` and `STIX Two Text_italic.ttf`.

Bold STIX is synthesized on Android. If you change a font, update both copies.

## Install on a phone
- **By USB:** turn on USB debugging in Developer options, plug the phone in, then run `adb install -r <apk>`.
- **By file:** copy the APK to the phone, open it, and allow "install unknown apps" for the app you opened it with.
