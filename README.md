# Songtrivia Boosted

Magyar, helyi hálózatos zenefelismerő játék 2–16 játékosnak. YouTube-keresés és link, 1–50 kör vagy végtelen mód, gyorsasági pontozás, betűsegítség és helyi örökranglista.

## Indítás

Node.js 20.12+ szükséges. A kereső kulcsa a `.env` fájl `YOUTUBE_API_KEY` értéke; nem kerül a telefonokra. Ha nincs `.env`, másold le a `.env.example` fájlt.

```
npm start
```

Gép: http://localhost:3000. Telefon: a szobában kiírt helyi IP-cím, azonos Wi-Fi-n. A Windows tűzfalban a Node.js magánhálózati hozzáférését engedélyezd. Internetes eléréshez lásd a Docker-telepítést alább. Több hálózati adapter esetén az `ipconfig` Wi-Fi/LAN IPv4-címét használd.

## Hangos mód

- YouTube-keresés vagy link alapján választotok. A videós előnézet csak a saját dal kiválasztásakor látható.
- Beküldéskor a szerver yt-dlp és FFmpeg segítségével előkészít egy 45 másodperces MP3-részletet a megadott kezdéstől. Ez eltarthat néhány másodpercig vagy lassabb hálózaton tovább. Hiba esetén a dal nincs beküldve, másik linkkel vagy kezdőponttal újrapróbálható.
- Nem élő, legfeljebb 30 perces videó használható; a forrás hangsávjának méretkorlátja 60 MB. A kezdőpont után legalább 45 másodpercnek kell maradnia.
- Találgatáskor nincs YouTube-iframe. Az előnézet megsemmisül, a játék saját audioelemet használ. A host sem kapja meg más dalának címét, YouTube-azonosítóját vagy borítóját. A hang véletlen azonosítót kap, forrás-metaadatok nélkül.
- Ez a felületen és a játék API-jában rejti el a megfejtést. A szervergép tulajdonosát nem akadályozza meg a program belső adatainak vizsgálatában.
- A host indítógombja először elindítja a hangot; csak siker után indul a közös óra. Telefonon a Hang ezen az eszközön gombbal indítható a saját hang. A mobilböngésző dalonként új érintést kérhet. Késői indításnál a közös időponthoz igazodunk, nem indul új 45 másodperc.
- Közös hangszóró mellett a telefonos hang kikapcsolva maradhat.
- A cím betűi és számai vonalként látszanak, a szóközök és írásjelek megmaradnak. A 10., 20., 30. és 40. másodpercnél egy új véletlen betűhely felfedődik, mindenkinél ugyanaz.
- Saját dalra nem tippelhetsz, de minden más játékos helyes megfejtése után a beküldő 200 pontot kap (a körpontokba és az összpontszámba is). A helyes válasz 100–1000 pont a szerverhez érkezés ideje szerint. Ékezetek és írásjelek nem számítanak, 6 karaktertől egy elütés megengedett.
- A részletek a `data/audio` mappában vannak, körváltáskor vagy lezáráskor törlődnek. Szerverindítás a korábbi átmeneti hangokat is törli. Csak a szoba aktuális részlete kérhető le, belépési tokennel; a vendégek csak indulás után férnek hozzá.

## Hangeszközök

Ezen a gépen a `tools` mappába telepítve. Másik Windows gépen vagy frissítéshez PowerShellből:

```powershell
./scripts/setup-audio.ps1
```

A script a hivatalos yt-dlp kiadást és a yt-dlp/FFmpeg-Builds csomagját tölti le. Ellenőrzi a yt-dlp SHA256 összegét; FFmpeg esetén a GitHub digestet, ha elérhető. A csomag licencfájljai a kicsomagolt mappában maradnak. Egyéni telepítéshez `YTDLP_PATH`, `FFMPEG_PATH`, `FFPROBE_PATH` környezeti változók használhatók. Böngészős sütiket és felhasználói YouTube-belépést nem használunk.

A hangos YouTube-feldolgozás nem hivatalos integráció. YouTube-változások és korlátozások miatt videók elbukhatnak; ilyenkor frissítsd az eszközöket vagy válassz másik feltöltést. A szolgáltató feltételei és a tartalom felhasználási jogai továbbra is alkalmazandók.

## Adatok és ellenőrzés

A lezárt játékok a `data/results.json` fájlba kerülnek, az örökranglista becenévenként összesít. Nincsenek jelszóval védett fiókok. Az aktív szobák memóriában vannak; szerverújraindítás után új szoba kell.

`npm test`: játékmenet, pontozás, betűsegítség, hozzáférés, HTTP-részletkérések, titkos adatok és blokkolt hangindítás. Az integrációs teszt helyi hanghelyettesítőt használ, nem hívja a YouTube-ot.

`node scripts/check-audio.mjs`: külön online próba a YouTube dokumentációjának tesztvideójával, a tesztrészlet törlésével.

## Játékosok eltávolítása

A házigazda a ranglistán az Eltávolítás gombbal, megerősítés után dobhat ki játékost. Saját magát nem távolíthatja el. A kieső belépése érvénytelenné válik; a hiányzó beküldése nem blokkolja tovább a kört. Még el nem indult dalai kikerülnek. Az éppen játszott dal végigmehet, de a kieső már nem kap pontot. Egyetlen megmaradt játékos esetén a kör véget ér, és a házigazda lezárhatja a játékot. A korábban megszerzett pontokat a többiektől nem vonjuk vissza.

## Docker és Git-alapú cloud deployment

A Dockerfile tartalmazza a Node.js-t, yt-dlp-t, FFmpeg-et és FFprobe-ot; Windowsos `tools` mappa nem kell. A `.env`, a helyi eredmények és a binárisok nem kerülnek az image-be.

Helyi Docker Desktop (Linux containers) mellett, a projekt könyvtárában:

```sh
docker compose up -d --build
```

Cím: http://localhost:3000. A Compose a helyi `.env`-ből átadja a `YOUTUBE_API_KEY` értéket. Az eredményeket a `songtrivia-data` Docker volume őrzi. Leállítás: `docker compose down` (a volume megmarad).

Git-alapú hosztingnál:

1. Töltsd fel a projektet egy Git-repóba; a `.env` titkos maradjon.
2. A szolgáltatónál hozz létre Docker-alapú web service-t ebből a repóból, a gyökérben lévő `Dockerfile` használatával.
3. A szolgáltató secret/environment beállításában add meg a `YOUTUBE_API_KEY` kulcsot. Alapport: 3000; a szolgáltató által megadott `PORT` változót is támogatja.
4. Tartós lemezt csatolj `/app/data` helyre, amelyet a konténer `node` felhasználója (UID 1000) írhat. Enélkül újratelepítéskor elveszhet az örökranglista.
5. Egyetlen példányt futtass, HTTPS publikus címmel. A reverse proxy engedje a hosszú SSE-kapcsolatokat, kapcsolja ki azok pufferelését, és engedjen legalább 5 perces beküldési kéréseket. Health check: `/api/info`.
6. A publikus címen nyisd meg a játékot; a meghívó másolása ezt a címet osztja meg, így nem szükséges közös Wi-Fi.

A szobák memóriában élnek, ezért deploy/újraindítás megszakítja az aktív játékokat; több példány és automatikus skálázás jelenleg nem támogatott. Ez baráti játékhoz készült, nincs szolgáltatásszintű fiókkezelés vagy publikus terhelés elleni kvóta. Cloud IP-címekről a YouTube korlátozhatja a letöltést; a Docker önmagában nem garantálja a forrás elérhetőségét. Az yt-dlp frissítéséhez építsd újra az image-et `--no-cache` kapcsolóval.
