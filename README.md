# PentiaChat

En chat-app i React Native og TypeScript, lavet som Pentias mobile-udviklingsopgave.
Brugeren logger ind med Google eller Facebook, vælger et af de foruddefinerede chatrum og kan sende og modtage beskeder i realtid. Når et rum åbnes, vises de seneste 50 beskeder, og nye beskeder dukker automatisk op.

## Funktioner

| #   | Funktion                                                                 | Status |
| --- | ------------------------------------------------------------------------ | ------ |
| 1   | Splash screen, der fader over til login eller chatrum                    | 🚧     |
| 2   | Login med Google og Facebook (Firebase Auth), fejldialog ved fejl        | 🚧     |
| 3   | Liste over chatrum sorteret efter nyeste besked, med pull-to-refresh     | 🚧     |
| 4   | Chatrum: seneste 50 beskeder, scroll for flere, nye beskeder i realtid   | 🚧     |
| 5   | Push-notifikationer for rum, man har skrevet i, med deep link til rummet | 🚧     |
| 6   | Upload af billeder fra kamera og galleri                                 | 🚧     |

✅ = færdig · 🚧 = under udvikling

## Teknologi

- **React Native 0.87** (CLI, ikke Expo) med New Architecture og Hermes
- **TypeScript**
- **React Navigation 7** (native stack) for native navigation på iOS og Android
- **React Native Firebase 26** (Auth og Firestore), som bruger de native Firebase-SDK'er

## Kom i gang

### Krav

- Node 22.11 eller nyere
- Xcode (iOS) med Ruby/Bundler og CocoaPods
- Android Studio med en emulator (Java 17)

Se React Natives guide: [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment).

### Installation

```bash
git clone git@github.com:Abishiyambas/firebase-chat-app.git
cd firebase-chat-app
npm install

# iOS-afhængigheder
cd ios
bundle install
bundle exec pod install
cd ..
```

Firebase-konfigurationsfilerne (`google-services.json` og `GoogleService-Info.plist`) ligger i repoet, så appen virker mod det eksisterende Firebase-projekt uden ekstra
opsætning.

### Kør appen

Start Metro i en terminal for sig:

```bash
npx react-native start
```

Kør så i en anden terminal:

```bash
npx react-native run-ios       # iOS-simulator
npx react-native run-android   # Android-emulator (skal være startet)
```

## Projektstruktur

```
src/
├── components/   Genbrugelige UI-komponenter (light/dark)
├── constants/    Farver og andre konstanter
├── contexts/     Global tilstand (AuthContext, RoomsContext)
├── hooks/        useAuth, useRooms, useMessages
├── lib/          Samler Firebase-instanserne
├── navigation/   RootNavigator, der vælger skærme ud fra login-status
├── screens/      Én fil pr. skærm
├── services/     Det eneste lag, der kalder Firebase
└── types/        Delte TypeScript-typer
```

Skærmene kalder contexts og hooks, contexts kalder services, og kun services kender Firebase.

## Beslutninger

Arkitektur- og teknikvalg er beskrevet med kontekst, beslutning og konsekvens i [DECISIONS.md](DECISIONS.md).
