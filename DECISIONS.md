# Beslutninger – PentiaChat

Arkitektur- og teknikvalg undervejs, med begrundelse og konsekvenser.
Format pr. beslutning: **Kontekst → Beslutning → Konsekvens**.

---

## 1. React Native CLI i stedet for Expo

**Dato:** 2026-10-12

**Kontekst:** Opgaven tillader ikke Expo. Appen skal bruge Firebase Auth, Firestore, push-notifikationer og billedupload, og det kræver native opsætning på begge platforme.

**Beslutning:** Projektet er oprettet med `@react-native-community/cli init` (React Native 0.87.1, TypeScript, New Architecture). Package name og bundle id er `dk.abishiyam.pentiachat` på både Android og iOS.

**Konsekvens:**

- Fuld kontrol over de native projekter (`ios/`, `android/`). Det er nødvendigt for `@react-native-firebase`, push og UIScene-fixet.
- Ingen Expo Router. Navigation laves med React Navigation (native stack), og "kun for indloggede" styres af en `RootNavigator`, der vælger skærme ud fra `user` og `authChecked`, i stedet for `UserOnly`/`GuestOnly`-komponenter som i Shelfie.
- Mere manuelt arbejde ved native afhængigheder (`pod install`, Gradle-plugins).

---

## 2. UIScene-lifecycle på iOS

**Dato:** 2026-10-12

**Kontekst:** Apps bygget med iOS 27 SDK'en (Xcode 27) skal bruge UIScene-livscyklussen. React Native-skabelonen lader stadig `AppDelegate` oprette vinduet selv. Appen bygger, men crasher ved opstart:
`UIScene life cycle is required for apps built with this SDK.`

**Beslutning:** Ansvaret er delt efter Apples model:

- `AppDelegate.swift` står for app-niveauet og opretter kun React Native-factory'en. Senere kommer Firebase og push-registrering også her.
- `SceneDelegate.swift` (ny fil) står for vinduet: den opretter `UIWindow(windowScene:)` og kalder `factory.startReactNative(...)`.
- `Info.plist` har fået `UIApplicationSceneManifest` med `$(PRODUCT_MODULE_NAME).SceneDelegate`. `UIApplicationSupportsMultipleScenes = false`, fordi appen kun har ét vindue.
- Filen er registreret i Xcode-targetet med stien `PentiaChat/SceneDelegate.swift`.

**Konsekvens:**

- React Native-delen er uændret. Kun ejerskabet af vinduet er flyttet fra app-niveau til scene-niveau, så ændringen er lille og nem at fjerne, hvis skabelonen selv får UIScene-understøttelse.
- **Deep links** kommer ikke længere ind via `AppDelegate`. De kommer via `SceneDelegate`:

  - ved koldstart: `connectionOptions.urlContexts`
  - når appen kører: `scene(_:openURLContexts:)`

  Begge skal sendes videre til `RCTLinkingManager`, når push og deep links implementeres. Push-tryk via `UNUserNotificationCenter` påvirkes ikke.

---

## 3. Genererede native filer er ikke en del af kildekoden

**Dato:** 2026-10-12

**Kontekst:** Projektet blev oprettet i en midlertidig mappe og flyttet ind i det klonede repo. Appen viste derefter hvid skærm med fejlen `RCTEventEmitter.receiveEvent() … not registered as callable`. Årsagen var, at codegen- og autolinking-filerne under `ios/build/generated` indeholdt absolutte stier til den gamle mappe. Codegen fandt derfor ikke `react-native-safe-area-context`'s Fabric-komponenter.

**Beslutning:** Alt under `ios/build`, `ios/Pods` og Androids build-mapper betragtes som genereret output. Det er git-ignoreret og genskabes med `bundle exec pod install` (iOS) og et Gradle-build (Android) i stedet for at blive kopieret eller rettet i hånden.

**Konsekvens:**

- En ny klon af repoet bygger rent med kommandoerne i README'en.
- Flyttes eller omdøbes projektmappen, skal de native filer genereres igen: `rm -rf ios/build && cd ios && bundle exec pod install`.

---

## 4. Mappestruktur og services-lag

**Dato:** 2026-10-12

**Kontekst:** Jeg genbruger strukturen fra mit tidligere projekt (Shelfie, Expo + Appwrite), men dér kaldte contexts backend'en direkte (`BooksContext` importerede `databases` fra `lib/appwrite`). Det blandede UI-tilstand og dataadgang og gjorde fejlhåndtering uensartet (fejl blev ofte bare `console.log`'et).

**Beslutning:** Al kode ligger under `src/`:

| Mappe         | Ansvar                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------ |
| `lib/`        | `firebase.ts` samler Firebase-instanserne                                                  |
| `services/`   | **det eneste lag, der kalder Firebase** (auth, rooms, messages, storage)                   |
| `contexts/`   | global tilstand (`AuthContext`, `RoomsContext`). Kalder services                           |
| `hooks/`      | `useAuth`, `useRooms` (med "must be used within a Provider"-tjek) og `useMessages(roomId)` |
| `components/` | Themed-komponenter (light/dark)                                                            |
| `constants/`  | farver m.m.                                                                                |
| `navigation/` | `RootNavigator`                                                                            |
| `screens/`    | én fil pr. skærm                                                                           |
| `types/`      | delte TypeScript-typer                                                                     |

**Konsekvens:**

- **Separation of concerns:** skærme ved ikke, at backend'en er Firebase. Skifter man backend, ændres kun `services/`.
- Ensartet fejlhåndtering: services kaster fejl, og skærmene viser dem til brugeren (fx `Alert`) i stedet for at sluge dem.
- Collection-navne samles som konstanter i service-laget i stedet for at være hardcodet i contexts.
- Lidt flere filer end i Shelfie, men hver fil har ét ansvar.

---

## 5. Navigation: React Navigation native stack med typet param list

**Dato:** 2026-10-12

**Kontekst:** Expo Router (filbaseret routing) er ikke tilgængelig uden Expo. Opgaven kræver native look and feel på iOS og Android.

**Beslutning:**

- `@react-navigation/native-stack` + `react-native-screens`. Skærmene bliver rigtige native skærme (`UINavigationController` på iOS, Fragments på Android), så swipe-tilbage, header og animationer føles native.
- `src/types/navigation.ts` definerer kontrakten mellem skærmene:

  ```ts
  export type RootStackParamList = {
    Splash: undefined;
    Login: undefined;
    ChatRooms: undefined;
    ChatRoom: { roomId: string };
  };

  export type ScreenProps<T extends keyof RootStackParamList> =
    NativeStackScreenProps<RootStackParamList, T>;
  ```

- Kun `roomId` sendes til `ChatRoom`, ikke hele rum-objektet. Så kan samme skærm åbnes fra listen, fra en push-notifikation og fra et deep link, hvor kun id'et er kendt.
- I stedet for Shelfies `UserOnly`/`GuestOnly`-komponenter med `router.replace` vælger en `RootNavigator`, hvilke skærme der overhovedet findes, ud fra `authChecked` og `user`. Så kan en ikke-logget-ind bruger ikke navigere til et chatrum, og der er intet "blink" fra en skærm, der redirecter.

**Konsekvens:**

- Stavefejl i skærmnavne og manglende parametre fanges af TypeScript i editoren og ikke først ved kørsel. I Shelfie var `` router.push(`/books/${id}`) `` en utjekket streng.
- `ScreenProps<'ChatRoom'>` giver typet `route.params.roomId` i skærmen.

---

## 6. Kodekonventioner

**Dato:** 2026-10-12

**Beslutning:**

- **`.tsx` kun når filen indeholder JSX** (skærme, komponenter, navigator, contexts med Provider). **`.ts` til alt andet** (typer, services, hooks, konstanter). Det følger React Native-skabelonen og gør det tydeligt, hvad der er UI, og hvad der er logik.
- `import type` til imports, der kun bruges som typer. De forsvinder helt ved build.
- Én kort kommentar over hver skærm/komponent, der beskriver dens ansvar.
- ESLint og Prettier (fra skabelonen) skal være grønne før hver commit. Tjek med `npx tsc --noEmit`, `npx eslint src` og `npx prettier --check src`.
- Små commits med conventional commits-præfiks (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`), én ændring pr. commit. Afhængigheder committes for sig selv (inklusive `package-lock.json` og `Podfile.lock`, så versionerne er låst).

---

## 7. Firebase: React Native Firebase (native SDK'er)

**Dato:** 2026-10-13

**Kontekst:** Appen skal bruge Auth (Google og Facebook), Firestore i realtid, push og billedupload. Der er to muligheder: Firebase JS SDK'en (ren JavaScript, kendt fra web) eller `@react-native-firebase` (wrapper om de native iOS- og Android-SDK'er).

**Beslutning:**

- `@react-native-firebase/app`, `/auth` og `/firestore` (v26.4.0). `/messaging` og `/storage` tilføjes, når der er brug for dem.
- **Android:** Gradle-pluginet `com.google.gms:google-services:4.5.0` (classpath i `android/build.gradle`, `apply plugin` i `android/app/build.gradle`). Det læser `google-services.json` ved build.
- **iOS:**
  - `GoogleService-Info.plist` er tilføjet til PentiaChat-targetet.
  - `FirebaseApp.configure()` kaldes i `AppDelegate`, fordi det er app-niveau (jf. beslutning 2), og ikke i `SceneDelegate`.
- **Firestore** er oprettet i en EU-region og i _production mode_, så alt er låst, indtil Security Rules åbner for det.

**Hvorfor ikke JS SDK'en:**

- Push (FCM/APNs) kræver native kode alligevel.
- Den native Firestore har indbygget offline-cache.
- Google- og Facebook-login bruger native login-flows.

**Konsekvens:**

- Native builds og `pod install`, når der kommer nye Firebase-moduler.
- **Konfigurationsfilerne committes:** `google-services.json` og `GoogleService-Info.plist` er ikke hemmelige. De identificerer kun projektet. Sikkerheden ligger i Security Rules, og på Android også i package name + SHA-1.
- **SHA-1** kommer fra `android/app/debug.keystore`. Ved en release-build skal release-nøglens SHA-1 også registreres i Firebase, ellers fejler Google-login.

---

## 8. iOS-opsætning af Firebase: CocoaPods, statiske frameworks og deployment target

**Dato:** 2026-10-13

**Kontekst:** `pod install` fejlede i to omgange.

1. `[!] SPM + static linkage is not supported`. React Native Firebase henter som standard Firebase via Swift Package Manager. Med `use_frameworks! :linkage => :static` får hver RNFB-pod sin egen kopi af Firebase, og det giver _duplicate symbols_ ved linkning. Fejlen stoppede `pod install` tidligt, og de efterfølgende `rnscreens`-header-fejl var kun følgefejl.
2. Xcode 27 afviser pods med `IPHONEOS_DEPLOYMENT_TARGET` under iOS 15. abseil, BoringSSL, gRPC, nanopb, leveldb og GoogleUtilities har targets på 9–12.

**Beslutning:** I `ios/Podfile`:

```ruby
use_frameworks! :linkage => :static   # Firebase kræver frameworks
$RNFirebaseAsStaticFramework = true
$RNFirebaseDisableSPM = true          # Firebase via CocoaPods i stedet for SPM
```

og i `post_install`, efter `react_native_post_install`:

```ruby
installer.pods_project.targets.each do |target|
  target.build_configurations.each do |config|
    config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = min_ios_version_supported
  end
end
```

Alle pods bruger nu samme minimum som React Native.

**Konsekvens:**

- iOS og Android bygger og starter med Firebase. `pod install` tilføjer selv Firebase's "Required Reason API"-begrundelser til `PrivacyInfo.xcprivacy`, og den fil committes med.
- **Kendt ulempe:** Firebase udgiver ikke nye versioner til CocoaPods efter oktober 2026. Det er fint for denne opgave. På længere sigt skal projektet over på SPM (dynamisk linkage eller når RNFB understøtter SPM + static).
- Første build tager lang tid (gRPC/BoringSSL kompileres). `pod install` tog ca. 4,5 minutter.

---

## 9. Google-login: native Google Sign-In + Firebase credential

**Dato:** 2026-10-14

**Kontekst:** Opgaven kræver login med Google. Firebase Auth kan ikke selv vise Googles login-vindue i en native app. Den kan kun tage imod et bevis (ID-token) på, at brugeren er logget ind hos Google.

**Beslutning:**

- `@react-native-google-signin/google-signin` (v16) står for det native login-flow og returnerer et **ID-token**. Tokenet laves til en `GoogleAuthProvider.credential` og gives til Firebase med `signInWithCredential`. Google beviser altså, hvem brugeren er, og Firebase holder styr på sessionen.
- `webClientId` er OAuth-klienten af **type 3** fra `google-services.json`. Det er den, Firebase validerer tokenet imod.
- **iOS:** `REVERSED_CLIENT_ID` fra `GoogleService-Info.plist` er tilføjet som URL scheme i `Info.plist`, så Google kan sende svaret tilbage til appen efter login.
- **Android:** Kræver kun `google-services.json` med en OAuth-klient af **type 1**, som er knyttet til appens SHA-1. SHA-1 skal derfor være registreret i Firebase, før config-filen hentes.
- **Versionskonflikt:** FirebaseAuth accepterer `GTMSessionFetcher` ≥ 3.4 og < 6, mens GoogleSignIn 9.2 kun accepterer 3.x. Kun denne ene pod er låst op (`bundle exec pod update GTMSessionFetcher`), og CocoaPods valgte 3.5.0, som passer begge. Alle andre pods er uændrede.

**Konsekvens:**

- Login-flowet er delt i to ansvar: Google-pakken (identitet) og Firebase (session). Kun `authService` kender til begge.
- `GTMSessionFetcher` er nedgraderet fra 5.3.1 til 3.5.0. Opgraderes Firebase eller GoogleSignIn senere, skal versionskravene tjekkes igen.

---

## 10. Auth-flow: lytter i contexten, navigation styret af login-status

**Dato:** 2026-10-16

**Kontekst:** Splash skal vises, mens appen finder ud af, om brugeren er logget ind, og derefter fade til Login eller ChatRooms. I Shelfie blev brugeren hentet én gang ved opstart (`getInitialUserValue`), og login-skærmen navigerede selv videre bagefter.

**Beslutning:**

- Lagene bygger oven på hinanden: `lib/firebase` → `authService` → `AuthContext` → `useAuth` → skærme.
- `AuthContext` lytter med `onAuthStateChanged`. Firebase kalder lytteren ved opstart, login og logout, og contexten sætter `user` og `authChecked`. Lytteren afmeldes i `useEffect`'s oprydning.
- `authChecked` er Splash-skærmens signal: den bliver `true` første gang lytteren kaldes, uanset om der er en bruger.
- **Skærmene navigerer ikke selv efter login/logout.** `RootNavigator` vælger skærme ud fra `user`, så login-skærmen kalder kun `signInWithGoogle()`. Når Firebase melder den nye bruger, skifter navigatoren automatisk.
- **Fejlhåndtering:** `authService` kaster fejl, og `LoginScreen` viser dem med en native `Alert`. Annulleret login er ikke en fejl og viser ingen dialog.
- `useAuth` kaster en tydelig fejl, hvis den bruges uden for `AuthProvider`.
- Provider-rækkefølge i `App.tsx`: `SafeAreaProvider` → `AuthProvider` → `NavigationContainer`. Login-status er mere grundlæggende end navigation og skal senere kunne bruges af push-håndtering uden for navigatoren.

**Konsekvens:**

- Der er ét sted, der bestemmer, hvilken skærm der vises. Det samme flow virker ved koldstart, login og logout.
- En bruger, der ikke er logget ind, kan ikke navigere til chatrummene, fordi skærmene slet ikke findes i navigatoren.

---

## 11. Datamodel i Firestore

**Dato:** 2026-10-16

**Kontekst:** Opgaven kræver foruddefinerede rum sorteret efter nyeste besked og de seneste 50 beskeder pr. rum med mulighed for at hente flere.

**Beslutning:**

```
rooms/{roomId}
  name: string
  description: string
  lastMessageAt: timestamp
  messages/{messageId}   (sub-collection)
```

- **`lastMessageAt` gemmes på selve rummet** og opdateres, når der skrives en besked. Så kan listen sorteres med én forespørgsel (`orderBy('lastMessageAt', 'desc')`) i stedet for at slå den nyeste besked op i hvert rum. Data gemmes, som den skal læses.
- **Beskeder er en sub-collection** under rummet. Det gør det let at hente de seneste 50 i ét rum og at lave sideinddeling.
- Rummene er oprettet i Firebase-konsollen, da de er foruddefinerede.
- **Service-laget oversætter data:** `roomsService` lægger dokument-id'et på som `id` og konverterer Firestores `Timestamp` til JavaScripts `Date`. Typen `Room` indeholder derfor ingen Firebase-typer, og skærmene skal ikke kende Firestore.
- Collection-navne er konstanter i servicen (`ROOMS_COLLECTION`) i stedet for strenge spredt rundt i koden.
- **Midlertidige Security Rules:** indloggede brugere kan læse rum og læse/oprette beskeder. De strammes op, før appen afleveres.

**Konsekvens:**

- Én billig forespørgsel til rumlisten.
- `lastMessageAt` skal holdes opdateret, når der sendes en besked, og reglerne skal tillade netop den opdatering.

---

## 12. Rum-liste: `RoomsContext` med pull-to-refresh

**Dato:** 2026-10-17

**Beslutning:**

- `RoomsContext` holder listen og en `refreshRooms()`, der henter den igen med `getDocs`. Listen **erstattes** hver gang (ingen dubletter som i Shelfie).
- `refreshRooms` fanger ikke fejl (`try/finally`). Skærmen kalder den ved åbning og ved pull-to-refresh og viser fejl med `Alert`.
- `refreshRooms` er pakket i `useCallback`, så funktionen er stabil. Ellers ville skærmens `useEffect` køre igen efter hver opdatering af listen og give en uendelig løkke.
- Context frem for lokal state, fordi både listen og chatskærmens titel bruger rummene.
- Log ud-knappen er en egen komponent, der sættes som `headerRight` i navigatoren, så den bruger platformens native header.

---

## 13. Beskeder i realtid og sideinddeling

**Dato:** 2026-10-17

**Beslutning:**

- `subscribeToMessages` bruger `onSnapshot` på de 50 nyeste (`orderBy('createdAt', 'desc')` + `limit(50)`). Ældre sider hentes én gang ad gangen med `startAfter` på den ældste kendte besked.
- `useMessages(roomId)` er et hook og ikke en context, fordi beskederne hører til ét rum og én skærm. Lytteren afmeldes i `useEffect`'s oprydning, når man forlader rummet.
- Nye snapshots **flettes** ind efter id i stedet for at erstatte listen. Når en ny besked kommer, glider den ældste ud af "live"-vinduet på 50. Med fletning forsvinder den ikke fra skærmen.
- Listen er en omvendt (`inverted`) `FlatList`: nyeste nederst, og at nå "enden" betyder at scrolle op, hvilket henter ældre beskeder.
- Afsenderens navn og avatar gemmes i selve beskeden, så listen ikke skal slå brugere op.
- `createdAt` er `serverTimestamp()`, så alle enheder bruger serverens ur. Indtil serveren har svaret, vises "Sending…".
- **Afsendelse er én `writeBatch`:** beskeden oprettes og rummets `lastMessageAt` opdateres i samme operation. Enten lykkes begge, eller ingen af dem, så listesorteringen aldrig kommer ud af trit med beskederne.

---

## 14. Security Rules

**Dato:** 2026-10-17

**Beslutning:** Reglerne ligger i `firestore.rules` i repoet og publiceres i Firebase-konsollen.

- Alt kræver login.
- Beskeder kan kun oprettes **som en selv** (`userId == request.auth.uid`), med 1–1000 tegn og server-tid. De kan ikke redigeres eller slettes.
- Et rum kan kun få ændret `lastMessageAt`, og kun til server-tid. Navn og beskrivelse kan ikke ændres fra appen.
- Svarene om notifikationer (`users/{uid}/roomNotifications`) kan kun læses og skrives af brugeren selv.

---

## 15. Push-notifikationer og deep links

**Dato:** 2026-10-17

**Kontekst:** Opgaven kræver, at man første gang man skriver i et rum bliver spurgt, om man vil have notifikationer fra rummet, at der sendes push ved nye beskeder, og at et tryk åbner rummet via deep link. Projektet er på Firebase Spark-planen (ingen Cloud Functions), og der er intet betalt Apple Developer-medlemskab (ingen APNs-nøgle).

**Beslutning:**

- **Ét FCM-topic pr. rum** (`room_<roomId>`). Enheden tilmelder sig topic'et, når brugeren siger ja. Så skal der ikke gemmes og vedligeholdes device-tokens, og en afsender skal bare kende rummets id.
- Spørgsmålet stilles efter første afsendte besked i rummet (`useRoomNotificationPrompt`). Svaret gemmes i Firestore pr. bruger og rum, så der kun spørges én gang, også efter genstart.
- Systemtilladelsen: `POST_NOTIFICATIONS` på Android 13+ via `PermissionsAndroid`, `requestPermission` på iOS.
- **Deep links** (`pentiachat://room/<roomId>`) går gennem React Navigations `linking`. En notifikation med `roomId` i data omsættes til samme link, både når appen kører (`onNotificationOpenedApp`), og når den startes af notifikationen (`getInitialNotification`). `initialRouteName: 'ChatRooms'` sikrer, at tilbage-knappen virker.
- `UNSTABLE_routeNamesChangeBehavior="lastUnhandled"` på navigatoren: Hvis linket kommer, mens Splash/Login vises, gemmes det og åbnes, når brugeren er logget ind.
- **iOS:** Med UIScene kommer links ikke til `AppDelegate`. `SceneDelegate` sender dem videre til `RCTLinkingManager` (kørende app) og som launch options (koldstart).

**Konsekvens / afgrænsning:**

- Push afsendes manuelt fra Firebase-konsollen til et rum-topic. En Cloud Function, der lytter på nye beskeder og sender til topic'et, er næste skridt, når projektet er på Blaze.
- Push er vist på Android. iOS mangler kun en APNs-nøgle i Firebase.
- Med topics får afsenderen også sin egen push. Det kan undgås med en Cloud Function, der sender til device-tokens i stedet.

---

## 16. Splash-skærm

**Dato:** 2026-10-18

**Beslutning:** Splash vises, så længe `authChecked` er `false`, uden header, med app-navn og en spinner i appens farve. Login-skærmen har heller ingen header, men viser appens navn. `RootNavigator`'s `fade`-animation står for overgangen til Login eller ChatRooms.

---

## 17. Billeder gemmes komprimeret i Firestore

**Dato:** 2026-10-18

**Kontekst:** Opgaven kræver upload fra kamera og galleri, vist i samme flow som beskeder. Firebase Storage kræver Blaze-planen for nye projekter, og den er ikke aktiveret.

**Beslutning:**

- `react-native-image-picker` åbner kamera eller fotobibliotek. Billedet skaleres til maks. 800×800 og 60 % kvalitet og returneres som base64.
- Billedet gemmes som en `data:`-URI i feltet `image` på beskeden. Det går gennem samme `writeBatch` som tekstbeskeder, så rummet også flyttes op i listen.
- `imagePickerService` kender kun picker-biblioteket og ikke Firebase. Skærmen kalder picker → `sendImageMessage`.
- Security Rules: en besked skal have tekst eller billede, og billedet skal være under ca. 750 KB (Firestores dokumentgrænse er 1 MB).

**Konsekvens:**

- Det virker uden betalt plan og er realtid ligesom tekst.
- Ulempe: større dokumenter, og hentning af 50 beskeder kan blive tungere, hvis mange er billeder. Med Blaze ville billedet ligge i Storage, og beskeden kun indeholde en URL. Det er en lille ændring i `messagesService`.

---

## 18. Facebook-login

**Dato:** 2026-10-18

**Beslutning:**

- `react-native-fbsdk-next` står for det native Facebook-login. Resultatet laves til et `FacebookAuthProvider.credential` og gives til Firebase, ligesom Google-login.
- **iOS bruger Limited Login:** Facebooks iOS-SDK giver kun et klassisk access token, hvis brugeren har givet tilladelse til tracking (ATT). Uden det fås et ID-token. Appen sender en SHA-256-hashet nonce med og giver Firebase både token og den rå nonce, så Firebase kan verificere, at tokenet hører til netop dette login.
- **Android** bruger det klassiske access token.
- `logOut` logger kun ud af den udbyder, brugeren faktisk loggede ind med (aflæst fra `providerData`).
- iOS: Facebook-SDK'et initialiseres i `AppDelegate`. Login-callbacks håndteres i `SceneDelegate` **før** React Natives deep links, så Facebooks URL ikke opfattes som et app-link.
- App ID og Client token ligger i `Info.plist` og `strings.xml`. De er ikke hemmelige. App secret ligger kun i Firebase.
- Firebase er sat til "én konto pr. udbyder", så samme e-mail kan bruges til både Google og Facebook uden konflikt.

**Konsekvens:** Meta-appen er i Development mode, så kun administratorer og testere kan logge ind med Facebook, indtil Meta har godkendt appen (App Review + Business verification).
