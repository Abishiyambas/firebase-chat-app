# PentiaChat

En chat-app i React Native og TypeScript, lavet som Pentias mobile-udviklingsopgave.
Brugeren logger ind med Google eller Facebook, vælger et af de foruddefinerede chatrum og kan sende og modtage beskeder i realtid. Når et rum åbnes, vises de seneste 50 beskeder, og nye beskeder dukker automatisk op.

## Funktioner

| #   | Funktion                                                                 | Status                        |
| --- | ------------------------------------------------------------------------ | ----------------------------- |
| 1   | Splash screen, der fader over til login eller chatrum                    | ✅                            |
| 2   | Login med Google og Facebook (Firebase Auth), fejldialog ved fejl        | ✅                            |
| 3   | Liste over chatrum sorteret efter nyeste besked, med pull-to-refresh     | ✅                            |
| 4   | Chatrum: seneste 50 beskeder, scroll for flere, nye beskeder i realtid   | ✅                            |
| 5   | Push-notifikationer for rum, man har skrevet i, med deep link til rummet | ✅ Android (se Push nedenfor) |
| 6   | Upload af billeder fra kamera og galleri                                 | ✅ (se Billeder nedenfor)     |

✅ = færdig · 🚧 = delvist · ❌ = ikke nået

## Teknologi

- **React Native 0.87** (CLI, ikke Expo) med New Architecture og Hermes
- **TypeScript**
- **React Navigation 7** (native stack) for native navigation på iOS og Android
- **React Native Firebase 26** (Auth, Firestore og Cloud Messaging), som bruger de native Firebase-SDK'er
- **Google Sign-In** (`@react-native-google-signin/google-signin`) til det native Google-login
- **Facebook SDK** (`react-native-fbsdk-next`) til Facebook-login
- **Image Picker** (`react-native-image-picker`) til kamera og fotobibliotek

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

## Push-notifikationer og deep links

- Første gang man skriver i et rum, spørger appen, om man vil have notifikationer fra rummet. Svaret gemmes pr. bruger og rum i Firestore (`users/{uid}/roomNotifications/{roomId}`), så der kun spørges én gang.
- Siger man ja, beder appen om systemets tilladelse og tilmelder enheden FCM-topic'et `room_<roomId>`.
- En notifikation med data-feltet `roomId` åbner rummet direkte, når man trykker på den. Den omsættes til deep linket `pentiachat://room/<roomId>` via React Navigations `linking`, både når appen kører, ligger i baggrunden og er lukket.
- Deep links kan også testes uden push:
  ```bash
  adb shell am start -a android.intent.action.VIEW -d "pentiachat://room/<roomId>"   # Android
  xcrun simctl openurl booted "pentiachat://room/<roomId>"                            # iOS
  ```

**Afgrænsninger (ærligt):**

- **Afsendelse af push sker manuelt fra Firebase-konsollen** (Messaging → ny kampagne → målgruppe _Topic_ `room_<roomId>` → ekstra data `roomId`). Automatisk afsendelse ved nye beskeder kræver en Cloud Function, og den kræver Firebase Blaze-planen, som ikke er aktiveret i dette projekt. Funktionen ville lytte på `rooms/{roomId}/messages/{messageId}` og sende til topic'et.
- **iOS-push kræver en APNs-nøgle** fra Apple Developer Program (betalt). Koden, tilladelsen og deep links er lavet til iOS, men push er kun vist på Android.

## Billeder

- Tryk **+** i chatten → _Take photo_ eller _Choose from library_.
- Billedet skaleres ned (maks. 800×800, 60 % kvalitet) og gemmes som en lille `data:`-URI direkte i beskeden i Firestore. Security Rules afviser billeder over ca. 750 KB.
- **Afgrænsning:** Firebase Storage ville være det normale valg til billeder, men kræver Blaze-planen for nye projekter. Billederne vises i samme flow som tekstbeskeder.
- iOS-simulatoren har intet kamera. Brug fotobiblioteket der, eller Android-emulatorens virtuelle kamera.

## Facebook-login

- Meta-appen er i **Development mode**, så kun app-administratorer og testere kan logge ind med Facebook, indtil appen er gennemgået og udgivet af Meta.
- iOS bruger Facebook _Limited Login_ (ID-token + nonce), Android et klassisk access token. Begge laves om til et Firebase-credential.

## Projektstruktur

```
src/
├── components/   Genbrugelige UI-dele (LogOutButton, MessageItem)
├── contexts/     Global tilstand (AuthContext, RoomsContext)
├── hooks/        useAuth, useRooms, useMessages, useRoomNotificationPrompt
├── lib/          Samler Firebase-instanserne (auth, db, messaging)
├── navigation/   RootNavigator (vælger skærme ud fra login-status) og deep link-opsætning
├── screens/      Én fil pr. skærm
├── services/     Det eneste lag, der kalder Firebase og native SDK'er (auth, rooms, messages, notifications, image picker)
└── types/        Delte TypeScript-typer
```

Skærmene kalder contexts og hooks, contexts og hooks kalder services, og kun services kender Firebase.

Firestores sikkerhedsregler ligger i [`firestore.rules`](firestore.rules).

## Beslutninger

Arkitektur- og teknikvalg er beskrevet med kontekst, beslutning og konsekvens i [DECISIONS.md](DECISIONS.md).
