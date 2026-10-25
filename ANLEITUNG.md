# Kontaktbogen

Web-App für analoge Filmrollen. Läuft auf dem iPhone wie eine App, ohne Mac, ohne App Store und ohne Gebühr. Jede Person, die den Link öffnet, hat ihre eigenen Daten auf ihrem eigenen Gerät.

## Was die App kann

Beim ersten Start legst du einen Nutzernamen und optional ein Profilbild fest. Auf jeder Seite führt oben links der runde Knopf mit dem App-Symbol zur Startseite und oben rechts dein Profilbild zum Profil.

Startseite: oben Profilbild und Name wie im Profil, darunter „Film einlegen“ und die drei Stadien Film in der Kamera, In Entwicklung und Fotoalbum. Jede Rolle trägt ihren Knopf für den nächsten Schritt im eigenen Feld: Pfeil nach rechts zum Entwickeln, Pfeil nach oben zum Hochladen der Scans, Albumsymbol fürs Fotoalbum.

Profil: Bild und Name, darunter vier gleich große Bereiche: Alle Fotos, Filmkühlschrank, Kameraschrank und Geld. Kühlschrank, Schrank und Geld klappen per Tipp auf und zu, die App merkt sich den Zustand. Das Plus im Kühlschrank funktioniert auch zugeklappt. Die drei Striche oben rechts im Profil öffnen die Einstellungen: Farbschema (Sonnensymbol: Automatisch, Sonne, Mond, simulierte Uhrzeit), Entwicklung (Labore), Alle Filme, Belichtungsrechner für Nachtaufnahmen (Mond) und Sicherung, jeweils mit eigenem Symbol. Ganz unten steht „Reset/Test“: Der Knopf löscht nach einer Rückfrage alle hochgeladenen Fotos, den Namen und das Profilbild. Rollen, Filme, Kameras und Preise bleiben. Danach startet die App mit der Begrüßung. „Alle Fotos“ zeigt jedes hochgeladene Foto im Raster, neueste Rolle zuerst. Zwischen den Rollen steht in kleiner Schrift Name der Rolle, Film und Kamera. Der Pfeil unten rechts führt zurück zum Profil.

Filmkühlschrank: Kleinbild und Mittelformat wählst du über zwei runde Symbole (schmaler Streifen mit Perforation für 135, breiter Streifen mit quadratischem Bild für 120). Beim Hinzufügen lässt sich optional der Monat eintragen, in dem der Film abläuft. Das Plus zieht das Fenster in derselben Bewegung aus dem Knopf auf wie „Film einlegen“. Liste, sortierbar nach Kaufdatum, Schwarzweiß/Farbe, ISO, Marke und Name. Beim Hinzufügen stehen Kleinbild/Mittelformat ganz oben, darunter ein Feld für den gewählten Film. Tippst du einen Film in der Liste an, fliegt er in dieses Feld und rastet mit Bild, ISO, SW/Farbe und Format ein. Darunter Suche (Lupe) mit drei sichtbaren Treffern, Anzahl, Preis pro Rolle und Kaufdatum. Einlegen unten rechts, Abbrechen mit dem X unten links. Jede Zeile im Kühlschrank hat rechts ein X. Es entfernt die noch vorrätigen Rollen und zieht ihren Preis von den Ausgaben ab. Rollen aus diesem Kauf, die schon eingelegt wurden, bleiben als Ausgabe stehen.

Kameraschrank: Kameras mit Bajonett und Objektive mit Brennweite, Art, Lichtstärke und Bajonett. Beim Bearbeiten einer Kamera oder eines Objektivs führt der Haken unten rechts eine Ebene zurück, an dieselbe Stelle, von der aus du hineingetippt hast. Ein Tipp auf das Plus gibt ein kurzes haptisches Signal, das neue Gerät leuchtet beim Zurückkommen auf. Android unterstützt dafür die Vibration API. iOS Safari unterstützt sie nicht. Für iOS nutzt die App den Schalter-Trick ab iOS 18 (ein umgeschalteter Schalter gibt ein haptisches Signal). Auf einem iPhone habe ich das nicht geprüft.

Film einlegen: Der Knopf auf der Startseite zieht sich zu einer abgerundeten Karte auf. Profilbild und Name stehen zunächst darüber. Hast du in der Karte ein Stück gescrollt, gleitet sie in gut einer Sekunde sanft nach oben über Bild und Namen bis unter die Kopfzeile. Erst wenn du wieder ganz oben bist, gleitet sie zurück. Das X oben rechts schließt sie wieder. Inhalt: „Kamera“ mit den Formatsymbolen 135 und 120 und allen Kameras aus dem Kameraschrank, „Film“ mit einer Karte für den Filmkühlschrank (Schneeflocke links, daneben die passenden Filme und eine Lupe) und darunter einer kleineren Karte „Neuen Film anlegen“, dann „Anzahl Frames“, Name der Rolle und Eingelegt am. Liegt für das gewählte Format kein Film im Kühlschrank, steht dort nur „Dein Filmkühlschrank ist leer.“ ohne Suche. Bei Mittelformat steht die Anzahl durch die Kamera fest (zum Beispiel 12 bei der Hasselblad), ein freies Feld gibt es dann nicht. Kameras legst du nur im Kameraschrank an. Aufnahmen bei Kleinbild: 24, 36, 36+1 (mit Bonusbild am Rollenanfang) oder freie Eingabe. Mittelformat: die Bildzahl der Kamera, bei der Hasselblad 500C/M 12 Bilder 6×6 mit dem A12-Magazin (Ken Rockwell, Hasselblad 6×6 Magazines). Eingelegt am ist mit dem heutigen Tag vorbelegt. Der Pfeil unten rechts legt den Film ein und öffnet die Bildübersicht der neuen Rolle. Kam der Film nicht aus dem Kühlschrank, fragt die App, ob der Preis verbucht werden soll.

Bildansicht: zuerst das Objektiv, daraus ergibt sich die Blendenreihe (Lichtstärke bis kleinste Blende in vollen Stufen, ohne Angabe die Reihe 1,4 bis 22). Das zuletzt benutzte Objektiv der Rolle ist vorausgewählt. Die Belichtungszeiten kommen aus der Kamera und beginnen mit der kürzesten Zeit. Dann Notizen, Handyfoto und Doppelbelichtung (Symbol mit zwei übereinanderliegenden Rechtecken). Beim ersten Eintrag setzt die App den heutigen Tag als Aufnahmetag. Blättern mit den kleinen Knöpfen oben links und rechts (mit der Nummer des Nachbarbildes) oder durch Wischen. Die Leiste oben zeigt die Position auf der Rolle. Der Haken unten rechts speichert und führt zur Bildübersicht der Rolle.

Hinterlegte Zeiten und Blenden:

| Gerät | Werte | Quelle |
|---|---|---|
| Nikon F3 | 1/2000 bis 8 s, B, T, Zeitautomatik | Nikon F3 Specifications (eecs.yorku.ca) |
| Minolta XG-1 | 1/1000 bis 1 s, B, Zeitautomatik | Wikipedia, Minolta XG-1 |
| Praktica L2 | 1/1000 bis 1 s, B | Wikipedia, Praktica L („wie L“) |
| Hasselblad 500C/M | 1/500 bis 1 s, B (Zentralverschluss der C-Objektive) | collection-appareils.fr |
| Vivitar Point and Shoot | nur Automatik (Modell unbekannt, Annahme) | keine |
| Minolta MD Zoom 75-150 | f/4 bis f/32 | phillipreeve.net |

Für die Nikon-Objektive 28, 50 und 80-200 ist die Version unbekannt, deshalb sind Lichtstärke und kleinste Blende leer. Sie lassen sich im Kameraschrank beim Objektiv eintragen, Zeiten bei der Kamera.

In der Bildübersicht einer Rolle in der Kamera steht unten der Schieber „In Entwicklung geben“. Den orangen Knopf von links nach rechts ziehen öffnet „Film entwickeln“. Ein kurzer Zug springt zurück und löst nichts aus. Auf der Startseite bleibt der Knopf „Entwickeln“ ein einfacher Tipp.

Film entwickeln: eines deiner Labore oder „Selbst entwickeln“. Bei einem Labor nur noch „Auch scannen“ (anfangs nicht angehakt) und das Foto vom Abholschein. Den Preis rechnet die App im Hintergrund aus den Preisen des Labors. Schwarzweiß heißt dabei klassischer SW-Prozess, C-41-Schwarzweißfilme wie XP2 und alle übrigen Filme (auch Dia und ECN-2) gelten als Farbe. Danach geht es zur Startseite.

Labore: drei Striche im Profil, Abschnitt „Entwicklung“. Dort stehen alle Labore, „+ Neues Labor anlegen“ fügt eins hinzu. Pro Labor gibt es zwei Arten: Einzelpreise (Entwicklung und Scan jeweils für Kleinbild und Mittelformat, Farbe und Schwarzweiß) oder ein Gesamtpreis pro Film, zum Beispiel für DM. Beim Gesamtpreis entfällt die Frage nach dem Scan. Vorbelegt ist Fotokotti: Entwicklung Kleinbild Farbe 4,50 €, Kleinbild SW 7,50 €, Mittelformat Farbe 5,50 €, Mittelformat SW 7,50 €, Scan Kleinbild 6,50 €, Mittelformat 9,50 €. Antippen öffnet ein Labor zum Ändern oder Löschen.

Die drei Stadien haben eigene Farben: In der Kamera blaugrün, In Entwicklung orange, Fotoalbum violett. Rahmen der Rollen, Überschriften und das Schild in der Rollenansicht zeigen die Farbe des aktuellen Stadiums. Die Knöpfe tragen Symbol und Wort und haben die Farbe des Stadiums, in das sie die Rolle bringen: „Entwickeln“ (orange), „Scans hochladen“ (violett), „Ansehen“ öffnet das Fotoalbum.

Name der Rolle: lässt sich beim Einlegen eingeben und steht danach oben in der Kopfzeile. Ändern lässt er sich im Reiter „Rolle“, bei entwickelten Rollen auch oben im Fotoalbum-Raster.

Langes Drücken auf eine Rolle (Startseite): Die Karte hebt sich ab und zeigt Details (Film und ISO, Kamera, Format, Einlegedatum, notierte Bilder oder Scans, Entwicklung, Kosten) und darunter „Löschen“. Ein Tipp daneben legt sie wieder ab. Zum Löschen gibt es außerdem den Papierkorb oben rechts in der Rollenansicht und im Fotoalbum-Raster, außerdem unten im Reiter „Rolle“. Davor fragt die App nach, ob die Rolle wirklich gelöscht werden soll.

Im Fenster „Film entwickeln“ bestätigt ein Haken unten rechts. Ein X gibt es dort nicht, ein Tipp auf die Fläche darüber schließt das Fenster. Bei jedem Wechsel des Stadiums erscheint unten kurz eine Meldung: „Film eingelegt“, „Film in Entwicklung gegeben“ oder zum Beispiel „36 Scans hochgeladen“.

Scans hochladen: Der Knopf öffnet direkt die Fotoauswahl. Alle Scans der Rolle auf einmal auswählen, sie füllen die Platzhalter in der Reihenfolge der Dateinamen. Danach ist die Rolle ein Fotoalbum und die App zeigt direkt das Fotoraster.

Fotoalbum: zuerst ein Raster wie in der Fotos-App. Ein Tipp zeigt das Foto mit einer Zeile darunter (Brennweite, Blende, Zeit, Notiz) oder nur dem Aufnahmetag. Unter dem Foto steht das Feld „Titel“. Der Haken unten rechts speichert und führt zurück zum Raster. Was du dort schreibst, wird gespeichert und erscheint im Buch als Bildunterschrift links unter dem Foto, das Datum rechts. Wischen nach oben oder unten zeigt das Handyfoto, nach links oder rechts das nächste Foto. Ein Tipp auf den rechten Rand des Fotos springt vor, auf den linken zurück. „Fotoalbum ansehen“ öffnet das Buch: weiße Seiten, Foto mittig. Rechts darunter in kleiner Schrift Film und Datum (zum Beispiel „CineStill 50D, 23.11.2026“), darunter der Titel des Fotos. Das Datum ist der Aufnahmetag, wenn er unbekannt ist der Tag der Entwicklung (Abholung, eigene Entwicklung oder Abgabe).

Geld: „Du hast diesen Monat schon … für Film ausgegeben. Dein Filmgeldberg ist … hoch.“ Darunter Filme, Entwicklung und Scans. Unter „Verlauf“ stehen alle Buchungen nach Monat. Erst im aufgeklappten Verlauf steht „Ausgaben zurücksetzen“. Nach einer Nachfrage stehen Filmgeldberg und Monat auf 0 €. Filme, Rollen und Fotos bleiben erhalten, spätere Käufe und Entwicklungen zählen wieder.

Licht: Tagsüber sitzt die Sonne am Bildschirmrand und wandert, morgens rechts, mittags oben, abends links. Ein breiter Lichtstreifen fällt auf den Hintergrund. Gläserne Knöpfe im Vordergrund leuchten auf, im Glas ist der Lichtweg zu sehen, dahinter fällt ein Farbfächer auf den Hintergrund. Karten und Listen gelten als Hintergrund. Beim Scrollen rechnet die App den Strahl neu. Die Brechung folgt Snellius mit n = 1,5. Ein Rechteck fächert Licht physikalisch kaum auf, deshalb ist die Farbaufspaltung bewusst verstärkt. Nach Sonnenuntergang wechselt die App in den Mondschein-Look.

Filmbibliothek mit Box Speed, Feldern für Community-ISO samt Quelle, eigener ISO mit Begründung und Nachtnotizen. Schwarzschild-Rechner. Die Startwerte stammen aus Herstellerdatenblättern, jeweils mit Quelle in der App:

| Film | Korrektur über 1 s | Quelle |
|---|---|---|
| Ilford HP5 Plus, XP2 Super | Tc = Tm^1,31 | Harman, Film Reciprocity Failure Compensation, Dez. 2023 |
| Ilford FP4 Plus, Delta 100, Kentmere Pan 100 | Tc = Tm^1,26 | dto. |
| Ilford Delta 400 | Tc = Tm^1,41 | dto. |
| Ilford Pan F Plus | Tc = Tm^1,33 | dto. |
| Kentmere Pan 400 | Tc = Tm^1,30 | dto. |
| Harman Phoenix 200 | Tc = Tm^1,31 | Harman, Technical Information Phoenix 200, Sep. 2024 |
| Harman Phoenix 120 | keine Werte gefunden | Harman, Pressemitteilung Sep. 2024 |
| Harman Phoenix II 200 | Tc = Tm^1,31 | Harman, Phoenix II Data Sheet, Juli 2025 |
| Foma Fomapan 100, 200, 400, Retropan 320 | Faktortabelle bei 1 s, 10 s, 100 s | Foma-Katalog |
| CineStill 800T, 400D, 50D, BwXX | allgemeine Faustformel Tm^1,3, kein Datenblatt | CineStill-Hilfeseite |
| Kodak Tri-X 400 | 1 s → 2 s, 10 s → 50 s, 100 s → 1200 s | Kodak E-31 (2002) |
| Kodak T-Max 100 | 1 s +⅓ Blende, 10 s → 15 s, 100 s → 200 s | Kodak F-4016 (2016) |
| Kodak Portra 400 | bis 1 s keine Korrektur, darüber keine Herstellerwerte | Kodak E-4050 (2025) |
| Kodak Portra 800 | bis 1 s keine Korrektur, darüber keine Herstellerwerte | Kodak E-4040 (2025) |
| Harman Phoenix 125, Red 125, Switch Azure 125 | keine Werte gefunden | PetaPixel 8/2026, Kosmo Foto 6/2025 und 3/2026 |
| ORWO Wolfen NC500 | keine Werte gefunden | Kosmo Foto (ISO 500, C-41 laut ORWO) |
| AgfaPhoto APX 100, APX 200 Pro, APX 400, Color 400 | keine Werte gefunden | AgfaPhoto, Fotoimpex, Parallax Photographic |

Zwischenwerte der Kodak-Tabellen rechnet die App logarithmisch. Das ist eine Näherung, keine Herstellerangabe. Für Portra 160, Ektar 100, Gold 200 und UltraMax 400 sind keine Korrekturwerte hinterlegt. Community-ISO-Werte sind bewusst leer, weil es dafür keine verlässliche Einzelquelle gibt.

Belichtungsrechner für Nachtaufnahmen (drei Striche im Profil, Mondsymbol): Film über die Lupe suchen oder aus der Liste wählen, die App zeigt die Herstellerangabe des Films mit Quelle. Gemessene Zeit antippen (1 s bis 8 min) oder frei eingeben, darunter steht die korrigierte Belichtungszeit, wie viele Blenden das mehr sind und eine Tabelle für alle gängigen Zeiten. Gerechnet wird mit der Formel des jeweiligen Films (Potenzformel Tc = Tm^p oder Herstellertabelle mit logarithmischen Zwischenwerten). Hat ein Film keine Angabe, sagt die App das, statt zu raten.

Sicherung als ZIP und Wiederherstellung.


Noch nicht enthalten: Belichtungsmesser mit Vorschau.

## Online stellen (kostenlos, mit GitHub Pages)

Die App muss über https erreichbar sein. Am Windows-PC:

1. Konto auf github.com anlegen.
2. Oben rechts „+“ → „New repository“. Name z. B. `kontaktbogen`, Sichtbarkeit „Public“ (GitHub Pages ist im kostenlosen Konto für öffentliche Repositories verfügbar). Anlegen.
3. „uploading an existing file“ anklicken und den **Inhalt** des entpackten Ordners `kontaktbogen` hineinziehen (index.html muss oben liegen, nicht in einem Unterordner). „Commit changes“.
4. Repository → „Settings“ → „Pages“. Bei „Source“ „Deploy from a branch“, Branch `main`, Ordner `/ (root)`, speichern.
5. Nach ein bis zwei Minuten erscheint dort die Adresse, etwa `https://<benutzername>.github.io/kontaktbogen/`.

Öffentlich ist nur der Programmcode. Fotos und Notizen werden nie hochgeladen, sie bleiben im Speicher des jeweiligen iPhones.

## Auf dem iPhone installieren

1. Adresse in Safari öffnen.
2. Teilen-Symbol → „Zum Home-Bildschirm“.
3. Ab jetzt nur noch über das Symbol öffnen. Daten, die in einem normalen Safari-Tab angelegt wurden, wandern nicht mit.

Die Freundinnen machen dasselbe mit derselben Adresse.

## Datensicherheit

Für Web-Apps auf dem Home-Bildschirm gilt die 7-Tage-Löschung von Safari nach Angaben von WebKit-Entwicklern nicht (WebKit-Bug 237350). Ein Archiv ist der Browserspeicher trotzdem nicht. Darum unter „Mehr“ regelmäßig „Sicherung erstellen“ und die ZIP-Datei in Dateien/iCloud Drive oder auf dem PC ablegen. Bilder werden beim Import auf höchstens 2400 px verkleinert, die Original-Scans also separat aufbewahren.

Standort aus Handyfotos: iOS kann beim Auswählen aus der Mediathek den Ort entfernen. Im Auswahlfenster gibt es unter „Optionen“ eine Einstellung für den Ort. Das habe ich nicht auf einem Gerät geprüft.

## Updates

Neue Version: Dateien im Repository ersetzen und in `sw.js` die Zeile `const VERSION = 'kb-v1';` hochzählen (kb-v2 …). Sonst zeigt das iPhone die alte, zwischengespeicherte Version.


## Sprache

Beim ersten Start wählst du über „DE“ und „EN“ die Sprache. Später geht das in den Einstellungen (drei Striche im Profil) unter „Sprache“. Die App wird dabei neu geladen. Die Übersetzung ersetzt die deutschen Texte der Oberfläche anhand einer Liste in js/i18n.js. Was du selbst einträgst (Namen, Notizen), bleibt, wie es ist.

## Einführung beim ersten Start

Nach Name und optionalem Profilbild führt ein leuchtender Ring mit Sprechblase durch die App. Profilbild antippen, im Profil einen Film in den Filmkühlschrank legen, „Weiter“, im Kameraschrank eine Kamera anlegen, über die Filmdose oben links zur Startseite, Film einlegen, bei einem Bild eine Beschreibung eintragen, den Film in die Entwicklung geben, Scans hochladen und zum Schluss das Fotoalbum öffnen. Jeder Schritt geht erst weiter, wenn die Aufgabe erledigt ist. „Einführung überspringen“ beendet sie. Nach „Reset/Test“ beginnt sie von vorn.

## Gesten und Hinweise

Oben links führt eine kleine Filmdose mit herausschauendem Filmanfang (nur als Umriss) zur Startseite, oben rechts das Profilbild zum Profil. Bei der ersten Anmeldung gibt es nur das Namensfeld ohne Erklärtext. Legst du eine neue Kamera, ein Objektiv oder einen Film an, fehlt dort der Löschen-Knopf. Er erscheint erst, wenn du den Eintrag später wieder öffnest.

Im Reiter „Rolle“ steht neben der Filmauswahl ein kleines Foto des Films. Hat die Kamera eine ISO-Einstellung (Haken „ISO-Einstellung an der Kamera“ im Kameraschrank, gesetzt bei Nikon F3 und Minolta XG-1, nicht bei Praktica L2, Hasselblad und Olive San), gibt es das Feld „ISO an der Kamera eingestellt“. Darunter steht die Herstellerangabe und, wo hinterlegt, eine oft empfohlene ISO mit Quelle: CineStill 800T ISO 500 bei Tageslicht (photobite.uk, CineStill selbst nennt EI 800 bei Kunstlicht), Kodak Portra 400 ISO 200 (shootitwithfilm.com), Wolfen NC500 ISO 400 (Ateliers Marinette). Eigene Empfehlungen trägst du unter Alle Filme beim Film ein.

Im Reiter „Rolle“ lässt sich ein festes Objektiv für alle Frames wählen. Es wird sofort bei allen Frames eingetragen, einzelne Frames kannst du danach trotzdem ändern.

In der Frames-Ansicht stehen die kleinen Bildmarken immer in einer Reihe und werden bei vielen Bildern schmaler. Wischst du mit dem Finger darüber, zeigt ein Schild das Bild unter dem Finger, beim Loslassen öffnet es sich.

In der Kamera-Bearbeitung gibt es keine Farbwahl für Kompaktkameras mehr.

In einer Rolle zeigt die Ansicht, solange der Film in der Kamera ist, nur die Reiter „Bilder“ und „Rolle“. Ab „In Entwicklung“ kommt „Entwicklung“ dazu.

Eine Ebene zurück: in der oberen linken Ecke ansetzen (bis etwa 90 Pixel vom linken Rand und 240 Pixel von oben) und bewusst schräg nach unten rechts wischen. Ein Symbol erscheint dabei nicht. Die Geste schließt ein offenes Fenster, führt aus einem Bild zur Rolle, aus der Rolle zur Startseite und aus Kamera, Objektiv, Filmen, Rechner oder Alle Fotos zurück zum Profil. Waagrechtes Wischen bleibt für das Blättern zwischen Bildern. Am Computer geht dieselbe Bewegung mit gedrückter Maustaste.

Fenster (zum Beispiel Kühlschrank oder „Film entwickeln“) und die „Film einlegen“-Karte lassen sich nach unten wegwischen. Solange ein Fenster offen ist, bleibt die Seite dahinter stehen. Ziehst du ein Fenster weiter nach oben, obwohl nichts mehr kommt, federt es ein Stück mit und schnappt zurück.

Alle Suchfelder sind zunächst ein kleiner Kreis mit Lupe am rechten Rand. Ein Tipp darauf lässt sie nach links über die ganze Breite wachsen, die Lupe bleibt rechts, leer und ohne Fokus schrumpfen sie wieder. Findet eine Filmsuche nichts, steht dort „Ups, der Film ist hier noch nicht gespeichert.“ mit einem Link zum Anlegen. Im Kühlschrank-Teil von „Film einlegen“ heißt es „Ups, der Film liegt noch nicht im Kühlschrank.“
