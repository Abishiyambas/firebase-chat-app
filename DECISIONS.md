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

**Lært undervejs:** Da filen blev tilføjet via Xcodes "Add Files", havnede den første gang i rod-gruppen som en kopi i `ios/` med forkert sti. Løsningen var at fjerne referencen, sætte `project.pbxproj` tilbage med `git restore` og tilføje filen igen i den rigtige gruppe med *Reference files in place*.

---

## 3. Fejlsøgning: hvid skærm og `RCTEventEmitter.receiveEvent`

**Dato:** 2026-10-12

**Kontekst:** Efter UIScene-fixet startede appen, men viste hvid skærm og den røde fejl:
`Failed to call into JavaScript module method RCTEventEmitter.receiveEvent(). Module has not been registered as callable.`
Fejlen kom ved hver opstart og hver reload, så det var ikke et timing-problem.

**Fejlsøgning:**
1. Simulator-loggen (`xcrun simctl spawn booted log show`) viste, at det var den eneste React Native-fejl.
2. Fejlen kommer fra `RCTComponentEvent`, som er den gamle (pre-Fabric) event-vej. Med New Architecture registrerer JS ikke `RCTEventEmitter`, så kaldet fejler.
3. **Isolationsforsøg:** en midlertidig `App.tsx` med kun `<View><Text>` og uden `SafeAreaProvider`/`NewAppScreen` virkede uden fejl. Problemet sad altså i `react-native-safe-area-context` og ikke i UIScene-fixet.
4. Den genererede `ios/build/generated/ios/ReactCodegen/RCTThirdPartyComponentsProvider.mm` var tom, og `autolinking.json` pegede på en midlertidig mappe (`pentiachat-tmp`), der ikke fandtes længere.

**Årsag:** Projektet blev oprettet i en midlertidig mappe og flyttet med `rsync` ind i det klonede repo. De genererede codegen- og autolinking-filer indeholdt absolutte stier til den gamle mappe. Codegen fandt derfor ikke safe-area-context's Fabric-komponenter, og `SafeAreaProvider` faldt tilbage til den gamle arkitektur.

**Løsning:**
```bash
rm -rf ios/build
cd ios && bundle exec pod install
```

**Lære:** Flyt aldrig et React Native-projekt uden at generere native filer igen (`pod install`; på Android Gradle-build fra den nye placering). Og ved uforståelige fejl: fjern alt det, der ikke er nødvendigt, indtil fejlen forsvinder. Så ved man, hvor den sidder.

---

## 4. Mappestruktur og services-lag

**Dato:** 2026-10-12

**Kontekst:** Jeg genbruger strukturen fra mit tidligere projekt (Shelfie, Expo + Appwrite), men dér kaldte contexts backend'en direkte (`BooksContext` importerede `databases` fra `lib/appwrite`). Det blandede UI-tilstand og dataadgang og gjorde fejlhåndtering uensartet (fejl blev ofte bare `console.log`'et).

**Beslutning:** Al kode ligger under `src/`:

| Mappe | Ansvar |
|---|---|
| `lib/` | `firebase.ts` samler Firebase-instanserne |
| `services/` | **det eneste lag, der kalder Firebase** (auth, rooms, messages, storage) |
| `contexts/` | global tilstand (`AuthContext`, `RoomsContext`). Kalder services |
| `hooks/` | `useAuth`, `useRooms` (med "must be used within a Provider"-tjek) og `useMessages(roomId)` |
| `components/` | Themed-komponenter (light/dark) |
| `constants/` | farver m.m. |
| `navigation/` | `RootNavigator` |
| `screens/` | én fil pr. skærm |
| `types/` | delte TypeScript-typer |

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
- Stavefejl i skærmnavne og manglende parametre fanges af TypeScript i editoren og ikke først ved kørsel. I Shelfie var ``router.push(`/books/${id}`)`` en utjekket streng.
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
- **Firestore** er oprettet i en EU-region og i *production mode*, så alt er låst, indtil Security Rules åbner for det.

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
1. `[!] SPM + static linkage is not supported`. React Native Firebase henter som standard Firebase via Swift Package Manager. Med `use_frameworks! :linkage => :static` får hver RNFB-pod sin egen kopi af Firebase, og det giver *duplicate symbols* ved linkning. Fejlen stoppede `pod install` tidligt, og de efterfølgende `rnscreens`-header-fejl var kun følgefejl. **Lære:** find den FØRSTE fejl, når kommandoer er kædet med `&&`/`;`.
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

## Kommende beslutninger (skrives, når de træffes)

- Splash og auth-flow i `RootNavigator` (fade-animation, `onAuthStateChanged`).
- Google- og Facebook-login (native SDK'er + Firebase credential).
- Datamodel i Firestore (rooms, messages, sortering efter nyeste besked, pagination).
- Push og deep links.
- Security Rules.
