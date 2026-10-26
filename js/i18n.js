/* Sprache der App: Deutsch (Ausgangstext) oder Englisch.
   Die Ansichten schreiben ihre Texte auf Deutsch. Ist Englisch gewählt, ersetzt diese Datei jeden sichtbaren Text,
   jedes aria-label, title und placeholder anhand der Liste unten. {0}, {1} … stehen für eingesetzte Werte. */
const I18N = (() => {
  const KEY = 'kb-lang';
  let lang = null;
  try { lang = localStorage.getItem(KEY); } catch (_) {}
  const get = () => lang || ((navigator.language || 'de').toLowerCase().startsWith('de') ? 'de' : 'en');

  // Deutsch → Englisch, eine Zeile je Text, getrennt durch einen Tabulator
  const RAW = `
In der Kamera	In the camera
In Entwicklung	Developing
Fotoalbum	Photo album
Schwarzweiß	Black and white
Schwarzweiß (C-41)	Black and white (C-41)
Schwarzweiß-Umkehr	B&W reversal
Infrarot (SW)	Infrared (B&W)
Farbnegativ	Colour negative
Dia	Slide
Sonstiges	Other
Kleinbild (135)	35 mm (135)
Mittelformat (120)	Medium format (120)
Halbformat	Half frame
Fehler: {0}	Error: {0}
Fertig, eine Ebene zurück	Done, back one level
Alle Filme	All films
Suchen	Search
Für diesen Film ist keine Herstellerangabe hinterlegt.	No manufacturer data is stored for this film.
Bis {0} s keine Korrektur, darüber Tc = Tm^{1}.	No correction up to {0} s, beyond that Tc = Tm^{1}.
Herstellertabelle: {0}. Zwischenwerte rechnet die App logarithmisch.	Manufacturer table: {0}. The app interpolates values in between logarithmically.
Bis {0} s keine Korrektur. Für längere Zeiten nennt der Hersteller keine Werte.	No correction up to {0} s. The manufacturer gives no values for longer times.
Eigener Faktor: Tc = Tm^{0}.	Own factor: Tc = Tm^{0}.
Für diesen Film sind keine geprüften Werte hinterlegt.	No verified values are stored for this film.
Belichtungsrechner	Exposure calculator
(keine Angabe)	(not specified)
Film suchen	Search film
Nachtaufnahme	Night shot
Ups, der Film ist hier noch nicht gespeichert.	Oops, this film isn’t saved here yet.
Film anlegen	Add film
Gemessene Zeit	Metered time
Quelle: {0}	Source: {0}
Quelle	Source
Belichten	Expose
Lichtwerte:	Exposure values:
{0} bis {1}	{0} to {1}
überbelichtet	overexposed
Liegt im eingetragenen Spielraum (−{0} / +{1}).	Within the stored latitude (−{0} / +{1}).
Liegt teilweise außerhalb des eingetragenen Spielraums (−{0} / +{1}).	Partly outside the stored latitude (−{0} / +{1}).
Liegt außerhalb des eingetragenen Spielraums (−{0} / +{1}).	Outside the stored latitude (−{0} / +{1}).
Quelle Spielraum: {0}	Latitude source: {0}
Für diesen Film ist kein Spielraum eingetragen. Du kannst ihn unter Filme → {0} ergänzen.	No latitude is stored for this film. You can add it under Films → {0}.
Schwarzschild berücksichtigt: {0} wirken auf diesem Film wie {1}.	Reciprocity applied: {0} acts like {1} on this film.
Achtung: Für Zeiten über 1 s fehlen Schwarzschild-Werte. Die Abweichung ist ohne Korrektur gerechnet und fällt in Wirklichkeit eher zur Unterbelichtung aus.	Note: reciprocity values are missing for times over 1 s. The deviation is calculated without correction and in reality tends towards underexposure.
Bei f/{0} wäre {1} richtig, mit Schwarzschild {2}.	At f/{0}, {1} would be correct, with reciprocity {2}.
Bei f/{0} wäre {1} richtig, Schwarzschild-Korrektur unbekannt.	At f/{0}, {1} would be correct, reciprocity correction unknown.
Bei f/{0} wäre {1} richtig.	At f/{0}, {1} would be correct.
{0} Blenden	{0} stops
Formel Tc = Tm	Formula Tc = Tm
Tabelle:	Table:
Bis {0} s keine Korrektur, darüber keine Herstellerwerte.	No correction up to {0} s, no manufacturer values beyond that.
Eigener Faktor.	Own factor.
Keine geprüften Herstellerwerte hinterlegt.	No verified manufacturer values stored.
Foto ersetzen	Replace photo
Foto der Packung	Photo of the box
Foto entfernen	Remove photo
Hersteller	Manufacturer
Typ	Type
Prozess	Process
Kleinbild	35 mm
Mittelformat	Medium format
Wert	Value
Quelle dafür	Source for it
Meine ISO/EI	My ISO/EI
Warum, Erfahrungen	Why, experiences
Entwickler, Licht, Ergebnis …	Developer, light, result …
Blenden unter	stops under
Blenden über	stops over
Quelle Spielraum	Latitude source
Belichtungsspielraum nachts (eigene Notizen)	Exposure latitude at night (own notes)
Wie verhält sich der Film bei Unterbelichtung, Lichtquellen, Langzeit?	How does the film handle underexposure, light sources, long exposures?
Faktor p	Factor p
Eigener Schwarzschild-Faktor	Own reciprocity factor
Nur eintragen, wenn du eine Quelle oder eigene Tests hast. Formel Tc = Tm^p.	Only enter this if you have a source or your own tests. Formula Tc = Tm^p.
Datenblatt-Link	Data sheet link
Rolle	Roll
Noch keine.	None yet.
Film löschen	Delete film
Ohne eigenes Foto zeigt die App eine neutrale Filmdose mit ISO.	Without your own photo the app shows a plain film canister with the ISO.
Erhältlich als	Available as
Ohne Auswahl erscheint der Film bei Kleinbild und Mittelformat.	Without a selection the film appears for 35 mm and medium format.
Empfohlene ISO (allgemeine Meinung)	Recommended ISO (general opinion)
Eigene Präferenz	Own preference
Nacht und Langzeit	Night and long exposure
Belichtungsspielraum	Exposure latitude
Für den Rechner. Nur mit Quelle oder eigenen Tests eintragen.	For the calculator. Only enter with a source or your own tests.
Rollen mit diesem Film	Rolls with this film
Film aus der Bibliothek löschen?	Delete film from the library?
Sicherung und Speicher	Backup and storage
Belegt: {0} MB von ca. {1} GB	Used: {0} MB of about {1} GB
Automatisch	Automatic
Sonne	Sun
Mond	Moon
Speicherbelegung nicht abrufbar.	Storage usage unavailable.
Dauerhafter Speicher gewährt: {0}	Persistent storage granted: {0}
ja	yes
nein	no
nein. In Safari „Teilen“ → „Zum Home-Bildschirm“ wählen und nur noch das Symbol verwenden.	no. In Safari choose “Share” → “Add to Home Screen” and only use the icon from then on.
Licht	Light
Automatisch: Sonne von etwa {0} bis {1} Uhr, danach Mondschein. Gerechnet für die Mitte Deutschlands, auf ein paar Minuten genau.	Automatic: sun from about {0} to {1}, moonlight afterwards. Calculated for central Germany, accurate to a few minutes.
Sicherung	Backup
Alle Daten liegen nur auf diesem Gerät. Eine Sicherung als ZIP-Datei schützt vor Datenverlust, etwa beim Löschen der Website-Daten oder einem Gerätewechsel.	All data is stored only on this device. A backup as a ZIP file protects against data loss, for example when website data is cleared or you switch devices.
Letzte Sicherung: {0}	Last backup: {0}
noch keine	none yet
Sicherung erstellen	Create backup
Sicherung einspielen	Restore backup
Speicher	Storage
Als App installiert: {0}	Installed as app: {0}
Geplant	Planned
Belichtungsmesser mit Vorschau verschiedener Einstellungen.	Light meter with a preview of different settings.
Alles löschen	Delete everything
Alle Daten auf diesem Gerät löschen	Delete all data on this device
Bibliotheken: JSZip, exifr (Lizenzen im Ordner vendor).	Libraries: JSZip, exifr (licences in the vendor folder).
Wirklich alle Rollen, Bilder und Filme auf diesem Gerät löschen?	Really delete all rolls, images and films on this device?
Letzte Rückfrage: Ohne Sicherung sind die Daten weg.	Last check: without a backup the data is gone.
Erstelle Sicherung …	Creating backup …
Sicherung erstellt	Backup created
Sicherung einspielen? Vorhandene Daten auf diesem Gerät werden dabei ersetzt.	Restore backup? Existing data on this device will be replaced.
Lese Sicherung …	Reading backup …
Keine Lightleak-Sicherung	Not a Lightleak backup
Bilder: {0}/{1}	Images: {0}/{1}
Sicherung eingespielt	Backup restored
Einspielen fehlgeschlagen: {0}	Restore failed: {0}
Meine	My
Profil	Profile
Dein Name	Your name
Profilbild wählen	Choose profile picture
Willkommen	Welcome
Los geht’s	Let’s go
Sprache	Language
diesen Monat gekauft	bought this month
vor {0} Monat gekauft	bought {0} month ago
vor {0} Monaten gekauft	bought {0} months ago
vor {0} Jahr gekauft	bought {0} year ago
vor {0} Jahren gekauft	bought {0} years ago
vor {0} Jahr und {1} Monat gekauft	bought {0} year and {1} month ago
vor {0} Jahr und {1} Monaten gekauft	bought {0} year and {1} months ago
vor {0} Jahren und {1} Monat gekauft	bought {0} years and {1} month ago
vor {0} Jahren und {1} Monaten gekauft	bought {0} years and {1} months ago
Kaufdatum	Purchase date
SW / Farbe	B&W / colour
Marke	Brand
Farbe	Colour
Unbekannter Film	Unknown film
Kaufdatum offen	Purchase date unknown
· haltbar bis {0}	· best before {0}
Aus dem Kühlschrank entfernen	Remove from the fridge
Neuer Film	New film
Film fehlt?	Film missing?
Neu in der Filmliste anlegen	Add it to the film list
Abbrechen	Cancel
Entwicklung {0}	Development {0}
Scan {0}	Scan {0}
Januar	January
Februar	February
März	March
April	April
Mai	May
Juni	June
Juli	July
August	August
September	September
Oktober	October
November	November
Dezember	December
Noch keine Buchungen.	No entries yet.
ohne Datum	no date
Entwicklung	Development
Scan	Scan
Foto	Photo
Fotos	Photos
{0} Foto	{0} photo
{0} Fotos	{0} photos
Rollen	Rolls
{0} Rolle vorrätig	{0} roll in stock
{0} Rollen vorrätig	{0} rolls in stock
Noch leer	Still empty
Sortieren	Sort
Lege mit dem Plus die Filme hinein, die du gekauft hast.	Use the plus to add the films you bought.
Ausgaben zurücksetzen	Reset spending
Einstellungen	Settings
Profilbild ändern	Change profile picture
Nutzername	User name
Film in den Kühlschrank legen	Put film in the fridge
Bild ändern	Change picture
Alle Fotos	All photos
Filmkühlschrank	Film fridge
Geld	Money
diesen Monat {0}	this month {0}
Du hast diesen Monat schon	This month you have already spent
für Film ausgegeben. Dein Filmgeldberg ist	on film. Your film money mountain is
hoch.	high.
Filme	Films
Scans	Scans
Verlauf	History
Film entfernt	Film removed
{0} Rollen entfernt	{0} rolls removed
Ausgaben zurücksetzen?	Reset spending?
Der Filmgeldberg und dieser Monat stehen danach auf 0 €. Filme, Rollen und Fotos bleiben erhalten. Was du danach kaufst oder entwickeln lässt, zählt wieder.	The film money mountain and this month will be set to €0. Films, rolls and photos are kept. Anything you buy or have developed afterwards counts again.
Zurücksetzen	Reset
Ausgaben zurückgesetzt	Spending reset
Uhrzeit simulieren	Simulate time of day
Schließen	Close
Farbschema	Colour scheme
Echte Uhrzeit	Real time
+ Neues Labor anlegen	+ Add new lab
Alle Filme und Infos	All films and info
Belichtungsrechner für Nachtaufnahmen	Exposure calculator for night shots
Löscht alle hochgeladenen Fotos, deinen Namen und dein Profilbild. Rollen, Filme, Kameras und Preise bleiben.	Deletes all uploaded photos, your name and your profile picture. Rolls, films, cameras and prices are kept.
Fotos, Name und Profilbild löschen	Delete photos, name and profile picture
Gesamtpreis	Total price
Gesamtpreis {0}	Total price {0}
Einzelpreise	Individual prices
Wirklich zurücksetzen?	Really reset?
Alle Fotos, dein Name und dein Profilbild werden gelöscht. Das lässt sich nicht rückgängig machen.	All photos, your name and your profile picture will be deleted. This cannot be undone.
Löschen	Delete
Simuliert: {0} Uhr	Simulated: {0}
Film in den Kühlschrank	Film into the fridge
Film wählen	Choose film
Aus dem Kühlschrank nehmen	Take out of the fridge
In den Kühlschrank legen	Put in the fridge
Speichern	Save
Anzahl Rollen	Number of rolls
Preis pro Rolle (€)	Price per roll (€)
Gekauft am	Bought on
Im Filmkühlschrank	In the film fridge
Gespeichert	Saved
Neues Labor	New lab
Labor	Lab
Labor löschen	Delete lab
Entwicklung (€)	Development (€)
Scan (€)	Scan (€)
Gesamtpreis pro Film (€)	Total price per film (€)
Labor angelegt	Lab added
Labor gespeichert	Lab saved
Labor gelöscht	Lab deleted
Zurückgesetzt	Reset done
Film einlegen	Load film
Film in der Kamera	Film in the camera
Selbst entwickeln	Develop yourself
Film in Entwicklung geben	Send film for development
Entwickeln	Develop
Film abgeholt, Scans hochladen	Film picked up, upload scans
Scans hochladen	Upload scans
Fotoalbum öffnen	Open photo album
Ansehen	View
Kamera	Camera
Format	Format
Eingelegt	Loaded
Bilder	Frames
{0} Scans	{0} scans
{0} von {1} notiert	{0} of {1} noted
{0} von {1} notiert · mit Bonusbild	{0} of {1} noted · with bonus frame
Kosten	Cost
{0} Scan wird gespeichert …	Saving {0} scan …
{0} Scans werden gespeichert …	Saving {0} scans …
{0} Scan hochgeladen	{0} scan uploaded
{0} Scans hochgeladen	{0} scans uploaded
Abholschein	Pickup slip
Bestätigen	Confirm
Film entwickeln	Develop film
Auch scannen	Also scan
Foto aufnehmen	Take photo
Aus Mediathek	From library
Film in Entwicklung gegeben	Film sent for development
Nicht aus dem Kühlschrank	Not from the fridge
Liegt nicht im Kühlschrank	Not in the fridge
Kein passender Film im Kühlschrank für dieses Format.	No matching film in the fridge for this format.
Dein Filmkühlschrank ist leer.	Your film fridge is empty.
Film in die Kamera legen	Put film in the camera
Welche Kamera?	Which camera?
Welcher Film?	Which film?
Aus dem Filmkühlschrank	From the film fridge
Wie viele Aufnahmen?	How many exposures?
Name der Rolle	Roll name
Eingelegt am	Loaded on
Freie Anzahl	Custom number
Ups, der Film liegt noch nicht im Kühlschrank.	Oops, this film isn’t in the fridge yet.
Film eingelegt	Film loaded
Nicht verbuchen	Don’t record
Preis verbuchen?	Record price?
{0} kam nicht aus dem Kühlschrank.	{0} didn’t come from the fridge.
Preis (€)	Price (€)
Verbuchen	Record
Film eingelegt, Preis verbucht	Film loaded, price recorded
Rolle löschen	Delete roll
Rolle wirklich löschen?	Really delete this roll?
Gelöscht werden alle Bilder, Handyfotos, Notizen und der Abholschein. Das lässt sich nicht rückgängig machen.	All frames, phone photos, notes and the pickup slip will be deleted. This cannot be undone.
Gelöscht werden alle Bilder ({0} Scans), Handyfotos, Notizen und der Abholschein. Das lässt sich nicht rückgängig machen.	All frames ({0} scans), phone photos, notes and the pickup slip will be deleted. This cannot be undone.
Endgültig löschen	Delete permanently
Rolle gelöscht	Roll deleted
Handy	Phone
In Entwicklung geben (zum Bestätigen nach rechts schieben)	Send for development (slide right to confirm)
In Entwicklung geben	Send for development
Abgeholt: Scans hochladen	Picked up: upload scans
Fotoalbum ansehen	View photo album
Weitere Scans hinzufügen	Add more scans
Speichere {0}/{1} …	Saving {0}/{1} …
Wo wird der Film entwickelt?	Where will the film be developed?
Im Labor	At a lab
Abgabe bei einem Fotolabor oder Drogeriemarkt	Drop-off at a photo lab or drugstore
Selbst	Myself
Zu Hause entwickeln	Develop at home
Abgegeben am	Dropped off on
Kosten (€, optional)	Cost (€, optional)
Abholschein (optional)	Pickup slip (optional)
Geplant für	Planned for
Chemie, Zeiten und Temperaturen trägst du im Reiter Entwicklung ein.	Enter chemistry, times and temperatures in the Development tab.
Film ist in Entwicklung	Film is being developed
Zurück am	Back on
Kosten (€)	Cost (€)
Scans (Auflösung, Format)	Scans (resolution, format)
Kein Foto hinterlegt.	No photo stored.
Foto hinzufügen	Add photo
Entwickelt am	Developed on
bitte wählen	please choose
Entwickler	Developer
Verdünnung	Dilution
Menge (ml)	Amount (ml)
Temperatur (°C)	Temperature (°C)
Entwicklungszeit	Development time
Kipprhythmus	Agitation
Stoppbad	Stop bath
Fixierer und Zeit	Fixer and time
Wässern / Netzmittel	Wash / wetting agent
Charge / Ansatz	Batch / mix
Gescannt mit	Scanned with
Notizen zur Entwicklung	Development notes
Ergebnis, Auffälligkeiten …	Result, anything notable …
Selbst entwickelt	Self-developed
Belichtet mit ISO/EI	Exposed at ISO/EI
Voll am	Finished on
Notizen zur Rolle	Roll notes
Thema, Reise, Besonderheiten …	Theme, trip, special features …
Status korrigieren	Correct status
ohne Angabe	not specified
keine Angabe	not specified
Bonusbild	Bonus frame
Bild {0} von {1}	Frame {0} of {1}
Objektiv	Lens
Doppelbelichtung	Double exposure
Blende	Aperture
Belichtungszeit	Shutter speed
Notizen	Notes
Schwarzschild für {0}: gemessen {1} → belichten {2}	Reciprocity for {0}: metered {1} → expose {2}
Schwarzschild: {0}	Reciprocity: {0}
Speichere Bild …	Saving image …
Fertig	Done
Vorheriges Bild	Previous frame
Nächstes Bild	Next frame
Ersetzen	Replace
Entfernen	Remove
Aufnehmen	Capture
Handyfoto 1. Belichtung	Phone photo, 1st exposure
Handyfoto 2. Belichtung	Phone photo, 2nd exposure
Handyfoto	Phone photo
Wischen	Swipe
Schieber	Slider
Nebeneinander	Side by side
Analog	Film
Vergleich verschieben	Move comparison
Noch keine Bilder im Album.	No pictures in the album yet.
Bild {0}	Frame {0}
Nach oben wischen: Handyfoto	Swipe up: phone photo
Titel	Title
Fertig, zurück zum Raster	Done, back to the grid
Handy {0}	Phone {0}
Noch keine Fotos hochgeladen.	No photos uploaded yet.
Zurück zum Profil	Back to profile
Kameraschrank	Camera cabinet
Weitwinkel	Wide angle
Tele	Telephoto
Bajonett offen	Mount open
Kameras	Cameras
Objektive	Lenses
Noch keine Objektive.	No lenses yet.
Kamera hinzufügen	Add camera
Objektiv hinzufügen	Add lens
Brennweite (mm)	Focal length (mm)
Lichtstärke (größte Blende)	Maximum aperture
Kleinste Blende	Minimum aperture
Bezeichnung	Name
Eigenheiten, Filtergewinde, Macken …	Quirks, filter thread, flaws …
Objektiv löschen	Delete lens
Art	Kind
Bajonett	Mount
Passt an	Fits
Neue Kamera	New camera
Eigenes Foto	Own photo
Modell	Model
Kürzeste Zeit	Fastest speed
Längste Zeit	Slowest speed
Bilder pro 120er-Rolle	Frames per 120 roll
Bildformat	Frame format
Illustration	Illustration
Spiegelreflex	SLR
Mittelformat-Würfel	Medium format box
Kompaktkamera	Compact camera
Farbe Spiegelreflex	SLR colour
Schwarz	Black
Chrom	Chrome
Eigenheiten, Batterie, Macken …	Quirks, battery, flaws …
Noch keine. Im Objektiv lässt sich ankreuzen, an welche Kameras es passt.	None yet. In a lens you can tick which cameras it fits.
Kamera löschen	Delete camera
Zeitautomatik	Aperture priority
Farbe Kompaktkamera	Compact camera colour
Objektive für diese Kamera	Lenses for this camera
Fest verbaut	Built in
Bild konnte nicht gelesen werden	Image could not be read
Keine Angaben hinterlegt	No data stored
Bis 1 s keine Korrektur (Herstellerangabe)	No correction up to 1 s (manufacturer data)
Tc = Tm^{0} (Herstellerformel)	Tc = Tm^{0} (manufacturer formula)
Im Bereich ohne Korrektur	In the range without correction
Außerhalb der Herstellertabelle hochgerechnet, nur Anhaltspunkt	Extrapolated beyond the manufacturer table, rough guide only
Zwischen Tabellenwerten logarithmisch interpoliert	Interpolated logarithmically between table values
Bis {0} s keine Korrektur (Herstellerangabe)	No correction up to {0} s (manufacturer data)
Für Zeiten über {0} s nennt der Hersteller keine Werte. Testbelichtungen nötig.	The manufacturer gives no values for times over {0} s. Test exposures needed.
Bis 1 s keine Korrektur angenommen	No correction assumed up to 1 s
Eigener Faktor Tc = Tm^{0}	Own factor Tc = Tm^{0}
Für diesen Film sind keine geprüften Werte hinterlegt	No verified values are stored for this film
Sonne, klarer bis leicht dunstiger Himmel	Sun, clear to slightly hazy sky
Heller Sand oder Schnee in der Sonne	Bright sand or snow in the sun
Kurz nach Sonnenuntergang, Skyline	Just after sunset, skyline
Helle Straßenszenen	Bright street scenes
Straße nachts, Schaufenster	Street at night, shop windows
Bühne, Sportveranstaltung	Stage, sports event
Wohnräume mit Kunstlicht	Rooms with artificial light
Angestrahlte Gebäude, Denkmäler, Brunnen	Floodlit buildings, monuments, fountains
ANSI PH2.7-1973/1986, Tabelle 2, nach Wikipedia „Exposure value“	ANSI PH2.7-1973/1986, table 2, via Wikipedia “Exposure value”
Ein Labortest von Carmencita Film Lab mit Portra 400 und Fuji 400H (Sichtprüfung der Scans, keine Dichtemessung) fand bei Farbnegativ etwa 2 bis 3 Blenden Spielraum nach unten und bis zu 6 nach oben. Das ist eine Einzelquelle, keine Herstellerangabe.	A lab test by Carmencita Film Lab with Portra 400 and Fuji 400H (visual check of the scans, no density measurement) found about 2 to 3 stops of latitude downwards and up to 6 upwards for colour negative. This is a single source, not manufacturer data.
Laut Hersteller: bis 1 s keine Korrektur. Bei langen Belichtungen kann der Kontrast steigen, dann ggf. Entwicklung verkürzen. Bei sehr langen Zeiten ist Probieren nötig.	According to the manufacturer: no correction up to 1 s. With long exposures contrast can increase, so shorten development if needed. Very long times require testing.
Hersteller: gute Ergebnisse bei EI 100 bis 200, Belichtungsreihen empfohlen, vor allem bei hellen Szenen und schwierigem Licht. Negative kontrastreicher als die meisten Farbfilme. Pushen nicht empfohlen.	Manufacturer: good results at EI 100 to 200, bracketing recommended, especially in bright scenes and difficult light. Negatives have more contrast than most colour films. Pushing not recommended.
Datenblatt: bis 1 s keine Korrektur, darüber Ta = Tm^1,31.	Data sheet: no correction up to 1 s, beyond that Ta = Tm^1.31.
Hersteller: bestes Ergebnis bei EI 100 bis 200 je nach Helligkeit und Kontrast, anfangs Belichtungsreihen. Laut Datenblatt mehr Belichtungsspielraum als Phoenix 200 (ohne Zahlenangabe).	Manufacturer: best results at EI 100 to 200 depending on brightness and contrast, bracket at first. According to the data sheet more exposure latitude than Phoenix 200 (no figure given).
Kodak-Tabelle: 1 s → 2 s, 10 s → 50 s, 100 s → 1200 s. Kodak empfiehlt dazu kürzere Entwicklung (−10 %, −20 %, −30 %).	Kodak table: 1 s → 2 s, 10 s → 50 s, 100 s → 1200 s. Kodak also recommends shorter development (−10 %, −20 %, −30 %).
Datenblatt: 1 s +⅓ Blende (als Zeit umgerechnet ≈1,26 s), 10 s → 15 s, 100 s → 200 s.	Data sheet: 1 s +⅓ stop (converted to time ≈1.26 s), 10 s → 15 s, 100 s → 200 s.
Datenblatt: keine Korrektur von 1/10.000 s bis 1 s. Für längere Zeiten nennt Kodak keine Tabelle und rät zu Testbelichtungen.	Data sheet: no correction from 1/10,000 s to 1 s. Kodak gives no table for longer times and advises test exposures.
Foma-Tabelle (Faktor auf die gemessene Zeit): 1 s ×{0}, 10 s ×{1}, 100 s ×{2}.	Foma table (factor on the metered time): 1 s ×{0}, 10 s ×{1}, 100 s ×{2}.
CineStill hat kein Reciprocity-Datenblatt. Die App rechnet mit der allgemeinen Faustformel des Herstellers (Tm^1,3). CineStill rät zu Belichtungsreihen von ein paar Blenden und eher mehr Licht.	CineStill has no reciprocity data sheet. The app uses the manufacturer’s general rule of thumb (Tm^1.3). CineStill advises bracketing a few stops and erring towards more light.
Datenblatt: nominal ISO 200 bis 400, empfindlich bis in den Infrarotbereich (650 bis 750 nm). Für den Infraroteffekt Filter 715 bis 730 nm empfohlen. Filterfaktor laut Datenblatt bei Rot 695 (89B) 16, bei Infrarot 715 (88A) 16 bis 32. Wirkung nicht per Auge oder Belichtungsmesser beurteilbar, daher Reihen mit nominal, +1 und −1 empfohlen. Sehr hoher Belichtungsspielraum, Push/Pull 1 bis 2 Blenden möglich.	Data sheet: nominal ISO 200 to 400, sensitive into the infrared range (650 to 750 nm). For the infrared effect a 715 to 730 nm filter is recommended. Filter factor according to the data sheet: red 695 (89B) 16, infrared 715 (88A) 16 to 32. The effect can’t be judged by eye or light meter, so brackets at nominal, +1 and −1 are recommended. Very high exposure latitude, push/pull of 1 to 2 stops possible.
Datenblatt nennt keine Schwarzschild-Werte.	The data sheet gives no reciprocity values.
Hersteller: Emulsion Wolfen NC200, beschichtet von InovisCoat in Deutschland, orange Maske. Keine Angaben zu Spielraum oder Schwarzschild.	Manufacturer: Wolfen NC200 emulsion, coated by InovisCoat in Germany, orange mask. No data on latitude or reciprocity.
Hersteller: EI 800, Kunstlicht 3200 K. Bei Tageslicht ist ein 85er-Filter vorgeschlagen. Laut CineStill großer Belichtungsspielraum, Push bis 3 Blenden.	Manufacturer: EI 800, tungsten 3200 K. An 85 filter is suggested in daylight. According to CineStill wide exposure latitude, push up to 3 stops.
Hersteller: EI 400, Tageslicht. Laut CineStill sehr großer Belichtungsspielraum, Push bis 3 Blenden in C-41.	Manufacturer: EI 400, daylight. According to CineStill very wide exposure latitude, push up to 3 stops in C-41.
Hersteller: EI 50, Tageslicht. Laut CineStill sehr guter Belichtungsspielraum.	Manufacturer: EI 50, daylight. According to CineStill very good exposure latitude.
Hersteller: variabel EI 200 bis 800. CineStill nennt die eigenen Entwickler D96 und Df96.	Manufacturer: variable EI 200 to 800. CineStill names its own developers D96 and Df96.
Schwarzweiß-Umkehrfilm (ergibt Dias). Der Foma-Katalog nennt dafür keine Schwarzschild-Werte.	Black and white reversal film (makes slides). The Foma catalogue gives no reciprocity values for it.
Seit Oktober 2025, C-41. Zunächst Kleinbild, 120 und 110 angekündigt.	Since October 2025, C-41. 35 mm first, 120 and 110 announced.
Lomography gibt einen Bereich von ISO 100 bis 400 an. Als Sonderedition gibt es „Pétillant“.	Lomography states a range of ISO 100 to 400. There is a special edition called “Pétillant”.
Lomography gibt einen Bereich von ISO 100 bis 400 an.	Lomography states a range of ISO 100 to 400.
Lomography gibt einen Bereich von ISO 50 bis 200 an.	Lomography states a range of ISO 50 to 200.
Aktuelle Verfügbarkeit nicht geprüft.	Current availability not checked.
Nur im Format 110. Aktuelle Verfügbarkeit nicht geprüft.	110 format only. Current availability not checked.
Nur im Format 110, Spielraum laut Lomography ISO 100 bis 400.	110 format only, latitude according to Lomography ISO 100 to 400.
Datenblatt: EI 800 bei Tageslicht und Blitz, EI 250 bei Fotolampen (3400 K), EI 200 bei Kunstlicht (3200 K). Push 1 = EI 1600, Push 2 = EI 3200. Kodak nennt „best-in-class underexposure latitude“, ohne Zahlenwert.	Data sheet: EI 800 in daylight and flash, EI 250 with photo lamps (3400 K), EI 200 with tungsten (3200 K). Push 1 = EI 1600, push 2 = EI 3200. Kodak states “best-in-class underexposure latitude” without a figure.
Datenblatt: keine Korrektur von 1/10.000 s bis 1 s. Für längere Zeiten nennt Kodak keine Werte und rät zu eigenen Tests.	Data sheet: no correction from 1/10,000 s to 1 s. Kodak gives no values for longer times and advises your own tests.
Harman, Pressemitteilung vom 5.9.2024: ISO 200, Rollfilm 120, Look mit kräftigem sichtbarem Korn und lebhaften Farben (starke Grün-, Rot- und Blautöne). Schwarzschild-Werte für diese Version habe ich nicht gefunden.	Harman, press release of 5 Sep 2024: ISO 200, 120 roll film, look with strong visible grain and vivid colours (strong greens, reds and blues). No reciprocity values found for this version.
PetaPixel, 12.8.2026: überarbeitete Fassung des Phoenix 200 mit ISO 125 und DX-Code, Kleinbild und 120. Den Prozess nennt der Artikel nicht, C-41 ist aus der Phoenix-Reihe übernommen und nicht eigens belegt. Phoenix 200 ist laut demselben Artikel eingestellt.	PetaPixel, 12 Aug 2026: revised version of Phoenix 200 with ISO 125 and DX code, 35 mm and 120. The article doesn’t name the process, C-41 is taken from the Phoenix line and not separately confirmed. According to the same article Phoenix 200 is discontinued.
Kosmo Foto, Juni 2025: Redscale-Film auf Basis von Phoenix, ISO 125, Kleinbild seit Februar 2025, 120 seit Juni 2025. Der Rotstich nimmt bei höherer ISO-Einstellung zu.	Kosmo Foto, June 2025: redscale film based on Phoenix, ISO 125, 35 mm since February 2025, 120 since June 2025. The red cast increases at higher ISO settings.
Experimenteller Farbnegativfilm (Harman, März 2026): zwei Farbkuppler vertauscht, Blau wird eher orange, Gelb eher blau oder cyan, Rot violett. C-41. Harman empfiehlt, auf die Mitteltöne zu belichten.	Experimental colour negative film (Harman, March 2026): two colour couplers swapped, blue turns orange, yellow turns blue or cyan, red turns violet. C-41. Harman recommends metering for the midtones.
Kosmo Foto: limitierte Auflage, ISO 500, 36 Aufnahmen, laut ORWO eine C-41-Emulsion auf Basis des Agfa-Kinofilms XT320. Ein Händler empfiehlt ISO 400.	Kosmo Foto: limited edition, ISO 500, 36 exposures, according to ORWO a C-41 emulsion based on the Agfa XT320 cine film. One retailer recommends ISO 400.
Fotoimpex führt APX 100 als Kleinbild mit 36 Aufnahmen und als 30,5-m-Meterware.	Fotoimpex sells APX 100 as 35 mm with 36 exposures and as 30.5 m bulk film.
Fotoimpex führt APX 200 Pro als Kleinbild mit 36 Aufnahmen.	Fotoimpex sells APX 200 Pro as 35 mm with 36 exposures.
AgfaPhoto: Push bis ISO 800 möglich. Kleinbild mit 36 Aufnahmen und als Meterware.	AgfaPhoto: push up to ISO 800 possible. 35 mm with 36 exposures and as bulk film.
Kleinbild mit 24 Aufnahmen (Parallax Photographic). C-41 laut Händlerangaben als Farbnegativfilm, Hersteller-Datenblatt nicht gefunden.	35 mm with 24 exposures (Parallax Photographic). C-41 colour negative according to the retailer, manufacturer data sheet not found.
Kodak, E-31 „Reciprocity and Special Filter Data“, Juli 2002	Kodak, E-31 “Reciprocity and Special Filter Data”, July 2002
FOMA BOHEMIA, Katalog Schwarzweißmaterialien (Schwarzschild-Tabelle, Faktoren bei 1 s, 10 s, 100 s)	FOMA BOHEMIA, black and white materials catalogue (reciprocity table, factors at 1 s, 10 s, 100 s)
CineStill, Hilfeseite zu Reciprocity: kein Datenblatt, nur allgemeine Faustformel Tm^1,3	CineStill, help page on reciprocity: no data sheet, only a general rule of thumb Tm^1.3
Ateliers Marinette, Produktseite Wolfen NC 500	Ateliers Marinette, Wolfen NC 500 product page
Harman, Kentmere Pan 200 Data Sheet, März 2025	Harman, Kentmere Pan 200 Data Sheet, March 2025
Film in Entwicklung geben?	Send film for development?
Ups, der Film ist hier noch nicht gespeichert. Film anlegen	Oops, this film isn’t saved here yet. Add film
Startseite	Home
Profil mit Filmkühlschrank und Kameraschrank	Profile with film fridge and camera cabinet
Gerade neu	Just added
Reset/Test	Reset/Test
{0} · seit {1}	{0} · since {1}
{0} · ISO {1}	{0} · ISO {1}
Push/Pull beim Labor	Push/pull at the lab
für Zeiten über {0} s.	for times over {0} s.
{0}, eingelegt am {1}.	{0}, loaded on {1}.
Vorheriges Bild {0}	Previous frame {0}
Nächstes Bild {0}	Next frame {0}
Kamera	Camera
Anzahl Frames	Number of frames
Doppelbelichtung möglich	Multiple exposure possible
Kamera hat Lightleaks	Camera has light leaks
Filmtagebuch	Film diary
Filmtagebuch zu diesem Film	Film diary for this film
Box Speed	Box speed
Unterbelichtet	Underexposed
Überbelichtet	Overexposed
Tageslicht	Daylight
Innen	Indoors
Kunstlicht	Artificial light
Blitz	Flash
Nacht	Night
Halte fest, wie sich ein Film bei dir verhält: Notizen und Beispielfotos nach Lichtsituation. Liegt der Film in der Kamera, siehst du das im Reiter „Rolle“.	Record how a film behaves for you: notes and sample photos by lighting situation. When the film is in the camera, you’ll see it in the “Roll” tab.
Film zum Tagebuch hinzufügen	Add film to the diary
Noch keine Einträge.	No entries yet.
{0} Foto · mit Notizen	{0} photo · with notes
{0} Fotos · mit Notizen	{0} photos · with notes
Deine Erfahrungen	Your experience
Wie verhält sich der Film? Welche ISO, welches Licht, welches Labor?	How does the film behave? Which ISO, which light, which lab?
Lade für jede Lichtsituation Fotos hoch, die du mit diesem Film gemacht hast.	Upload photos you took with this film for each lighting situation.
Foto hinzufügen: {0}	Add photo: {0}
Noch kein Foto. Wie sieht der Film hier aus?	No photo yet. What does the film look like here?
Noch kein Foto.	No photo yet.
Foto wird gespeichert …	Saving photo …
{0} Fotos werden gespeichert …	Saving {0} photos …
Im Filmtagebuch gespeichert	Saved in the film diary
Zurück zum Filmtagebuch	Back to the film diary
Deine Erfahrungen mit {0}	Your experience with {0}
Noch nichts notiert.	Nothing noted yet.
Im Filmtagebuch öffnen	Open in the film diary
Im Filmtagebuch anlegen	Create in the film diary
ISO an der Kamera eingestellt	ISO set on the camera
ISO-Einstellung an der Kamera	ISO setting on the camera
Hersteller: ISO {0}	Manufacturer: ISO {0}
oft empfohlen: ISO {0}	often recommended: ISO {0}
oft empfohlen: ISO {0} ({1})	often recommended: ISO {0} ({1})
Festes Objektiv für alle Frames	Fixed lens for all frames
wechselt je Frame	changes per frame
Objektiv für alle Frames übernommen	Lens applied to all frames
Bild wählen	Choose frame
Wähle zuerst eine Kamera.	Choose a camera first.
Läuft ab (Monat, optional)	Expires (month, optional)
Filmkühlschrank	Film fridge
Neuen Film anlegen	Add new film
Filme im Kühlschrank durchsuchen	Search films in the fridge
Klicke hier, um dein Profil anzusehen.	Tap here to see your profile.
Hier kannst du deine Filme hinzufügen. Tippe auf das Plus und lege einen Film in den Kühlschrank.	This is where you add your films. Tap the plus and put a film in the fridge.
Zurück zum Profil, dort wartet der Filmkühlschrank.	Back to your profile, the film fridge is waiting there.
Super, dein erster Film liegt im Kühlschrank.	Great, your first film is in the fridge.
Weiter	Next
Hier kannst du deine Ausrüstung hinzufügen. Tippe auf das Plus bei „Kameras“.	This is where you add your gear. Tap the plus next to “Cameras”.
Hier kannst du deine Ausrüstung hinzufügen. Öffne den Kameraschrank und lege eine Kamera an.	This is where you add your gear. Open the camera cabinet and add a camera.
Zurück zum Profil, dort steht der Kameraschrank.	Back to your profile, the camera cabinet is there.
Super, jetzt bist du bereit, deinen ersten Film in die Kamera zu legen. Tippe hier, um zur Startseite zu gehen.	Great, now you’re ready to load your first film into the camera. Tap here to go to the home screen.
Tippe auf „Film einlegen“ und lege deinen ersten Film ein.	Tap “Load film” and load your first film.
Zur Startseite, dort legst du den Film ein.	To the home screen, that’s where you load the film.
Trag hier eine Beschreibung zu diesem Bild ein.	Enter a description for this frame here.
Tippe ein Bild an und füge zumindest eine Beschreibung hinzu.	Tap a frame and add at least a description.
Gut. Mit dem Haken geht es zurück zur Rolle.	Good. The check mark takes you back to the roll.
Schieb den Regler nach rechts, um den Film in die Entwicklung zu geben.	Slide to the right to send the film for development.
Tippe auf „Entwickeln“, um den Film in die Entwicklung zu geben.	Tap “Develop” to send the film for development.
Ist der Film entwickelt, lädst du hier die Scans hoch.	Once the film is developed, upload the scans here.
Zur Startseite, dort lädst du die Scans hoch.	To the home screen, that’s where you upload the scans.
Schau dir jetzt dein Fotoalbum an.	Now take a look at your photo album.
Geschafft! Das ist dein erstes Fotoalbum. Die Einführung ist beendet.	Done! This is your first photo album. The introduction is complete.
Einführung überspringen	Skip introduction
{0} Kamera · {1} Objektiv	{0} camera · {1} lens
{0} Kamera · {1} Objektive	{0} camera · {1} lenses
{0} Kameras · {1} Objektiv	{0} cameras · {1} lens
{0} Kameras · {1} Objektive	{0} cameras · {1} lenses
Bild wählen	Choose picture
Dein Nutzername	Your username
Trag Hersteller und Modell deiner Kamera ein.	Enter the make and model of your camera.
Tippe auf den Haken, um die Kamera zu speichern.	Tap the tick to save the camera.
Öffne deine neue Kamera und trag Hersteller und Modell ein.	Open your new camera and enter its make and model.
Öffne den Kameraschrank und tippe deine neue Kamera an.	Open the camera cabinet and tap your new camera.
Zurück zum Profil, dort steht deine neue Kamera.	Back to the profile, your new camera is there.
Die Beispielkameras und -objektive sind beim ersten Start schon im Kameraschrank. Gelöschte lassen sich hier wieder laden.	The sample cameras and lenses are already in the camera cabinet at first start. Deleted ones can be loaded again here.
Beispielausrüstung laden	Load sample gear
Beispielausrüstung geladen	Sample gear loaded
Beispielausrüstung ist schon da	Sample gear is already there
Diese Kamera hat seit {0} {1} Lightleaks produziert.	This camera has produced {1} light leaks since {0}.
Diese Kamera hat seit {0} {1} Lightleak produziert.	This camera has produced {1} light leak since {0}.
Mit dieser Kamera wurde noch kein Film eingelegt.	No film has been loaded in this camera yet.
{0} Lightleaks	{0} light leaks
{0} Lightleak	{0} light leak
Kaputt	Broken
kaputt	broken
Noch keine Kamera. Lege mit dem Plus deine erste an.	No camera yet. Add your first one with the plus.
Kamera ist kaputt	Camera is broken
Was ist kaputt?	What is broken?
Kaputte Kameras erscheinen nicht bei „Film einlegen“.	Broken cameras don't appear under “Load film”.
{0} (kaputt)	{0} (broken)
Welche Bilder haben Lightleaks?	Which frames have light leaks?
{0} hat Lightleaks. Tippe die Scans an, auf denen wirklich Licht eingefallen ist.	{0} has light leaks. Tap the scans where light actually leaked in.
Später	Later
{0} Bilder mit Lightleak	{0} frames with a light leak
{0} Bild mit Lightleak	{0} frame with a light leak
Kein Bild markiert	No frame marked
{0} Lightleaks vermerkt	{0} light leaks noted
{0} Lightleak vermerkt	{0} light leak noted
Keine Lightleaks vermerkt	No light leaks noted
Lightleaks ändern	Edit light leaks
Lightleaks markieren	Mark light leaks
Lightleak	Light leak
Wie verhält sich ein Film bei dir? Notizen und Beispielfotos nach Lichtsituation.	How does a film behave for you? Notes and sample photos by lighting situation.
Lege mit dem Plus den ersten Film an.	Add your first film with the plus.
Film selbst entwickeln: Ablauf mit Chemie, Zeiten und Temperaturen.	Developing film yourself: workflow with chemistry, times and temperatures.
Filter	Filters
Filter hinzufügen	Add filters
Zubehör	Accessories
Zubehör hinzufügen	Add accessory
Zubehör entfernen	Remove accessory
Zubehör hinzugefügt	Accessory added
Zubehör entfernt	Accessory removed
Filter entfernen	Remove filter
Filter hinzugefügt	Filter added
{0} Filter hinzugefügt	{0} filters added
Filter entfernt	Filter removed
{0} ausgewählt	{0} selected
Halter {0} mm breit	Holder {0} mm wide
Filter suchen	Search filters
Anderer Filter	Other filter
Eigener Filter	Own filter
Anzahl	Quantity
Noch keine Filter. Wähle mit dem Plus deine Cokin-Filter aus dem Katalog.	No filters yet. Pick your Cokin filters from the catalogue with the plus.
Noch kein Zubehör. Blitze, Auslöser, Stative und alles andere legst du mit dem Plus an.	No accessories yet. Add flashes, releases, tripods and everything else with the plus.
Filtergewinde deiner Objektive: {0}	Filter threads of your lenses: {0}
Filtergewinde ⌀ (mm)	Filter thread ⌀ (mm)
Nummern und Namen aus den Cokin-Katalogen 2000 und 2015. Nicht jeder Filter gibt es in jeder Größe oder noch neu zu kaufen.	Numbers and names from the Cokin catalogues of 2000 and 2015. Not every filter exists in every size or is still sold new.
Schwarzweiß und Infrarot	Black and white and infrared
Farbe und Farbkorrektur	Colour and colour correction
Graufilter (ND)	Neutral density (ND)
Verlaufsfilter	Graduated filters
Polfilter	Polarisers
Stern und Diffraktion	Star and diffraction
Center-Spot	Centre spot
Weichzeichner und Pastell	Soft focus and pastel
Optische Effekte	Optical effects
Spezialeffekte und Masken	Special effects and masks
Selbst- und Fernauslöser	Self-timer and remote release
Stativ	Tripod
Belichtungsmesser	Light meter
Gegenlichtblende	Lens hood
Adapter und Filterhalter	Adapters and filter holders
Tasche und Gurt	Bag and strap
Kratzer, Adapterring, gekauft bei …	Scratches, adapter ring, bought at …
Leitzahl, Gewinde, Batterie, Macken …	Guide number, thread, battery, quirks …
{0} Filter	{0} filters
Inaktiv	Inactive
Kamera ist inaktiv	Camera is inactive
Kameras, die gerade im Regal liegen. Sie erscheinen nicht bei „Film einlegen“.	Cameras that are resting on the shelf. They don't appear under “Load film”.
{0} (inaktiv)	{0} (inactive)
Noch kein Foto hinterlegt.	No photo yet.
Belichtungsmesser	Light meter
Foto aufnehmen	Take photo
Aus Mediathek	From library
Film-ISO	Film ISO
Kalibrierung	Calibration
Kalibrierung minus	Calibration minus
Kalibrierung plus	Calibration plus
In den Frame übernehmen	Apply to frame
Tippe auf die Stelle, die Mittelgrau werden soll.	Tap the spot that should become mid-grey.
Messpunkt gegenüber Gesamtbild	Spot compared with whole frame
Das Live-Bild liefert keine Belichtungsdaten. Für einen Lichtwert ein Foto aufnehmen.	The live image carries no exposure data. Take a photo to get an exposure value.
Kamera im Browser nicht verfügbar. Ein Foto funktioniert trotzdem.	Camera not available in the browser. A photo still works.
Kein Zugriff auf die Kamera. Ein Foto funktioniert trotzdem.	No camera access. A photo still works.
Kamera konnte nicht starten. Ein Foto funktioniert trotzdem.	The camera could not start. A photo still works.
Lese Foto …	Reading photo …
Das Foto lässt sich nicht öffnen.	The photo cannot be opened.
Messpunkt ist im Handybild ausgebrannt. Der Wert ist zu niedrig.	The spot is blown out in the phone image. The value is too low.
Messpunkt ist im Handybild fast schwarz. Der Wert ist unsicher.	The spot is almost black in the phone image. The value is uncertain.
Das Foto enthält keine Belichtungsdaten (EXIF). Ein Lichtwert lässt sich daraus nicht berechnen.	The photo has no exposure data (EXIF). No exposure value can be calculated from it.
Mit einem Foto aus der Kamera-App über „Aus Mediathek“ klappt es eher.	A photo from the Camera app via “From library” is more likely to work.
Lichtwert bei ISO 100	EV at ISO 100
LW {0}	EV {0}
Nächste Zeit an der Kamera:	Nearest speed on the camera:
({0} Blenden)	({0} stops)
Mit Schwarzschild belichten:	With reciprocity, expose:
Letzte Messung	Last reading
bei ISO {0}	at ISO {0}
Messung übernommen	Reading applied
Schwarzschild	Reciprocity
Einstellungen	Settings
Zeit und Blende	Shutter and aperture
Film-Look	Film look
Kamera wechseln	Switch camera
Zurück zu Live	Back to live
Sucher vergrößern	Enlarge viewfinder
Sucher verkleinern	Shrink viewfinder
messen	measure
loggen	log
Lichtwert	Exposure value
Korrektur	Compensation
Korr.	Comp.
LW	EV
{0} sperren	Lock {0}
{0} entsperren	Unlock {0}
Kein Objektiv gewählt	No lens selected
wechseln	switch
Bildausschnitt anzeigen	Show frame lines
mit Schwarzschild	with reciprocity
aus Foto	from photo
live	live
von Hand	manual
Zwischenwert ·	In-between value ·
außerhalb des Objektivs ·	outside the lens range ·
gemessen {0} ·	metered {0} ·
Schwarzschild unbekannt ·	Reciprocity unknown ·
LW {0} {1}	EV {0} {1}
Zeit und Blende links antippen	Tap a shutter/aperture pair on the left
Messfeld antippen, dann	Tap the metering spot, then
Live-Messung läuft.	Live metering running.
Foto ohne Belichtungsdaten (EXIF). Lichtwert von Hand einstellen oder ein Foto der Kamera-App aus der Mediathek laden.	Photo has no exposure data (EXIF). Set the EV by hand or load a Camera app photo from the library.
Messfeld ausgebrannt, Wert zu niedrig.	Spot is blown out, value too low.
Messfeld fast schwarz, Wert unsicher.	Spot is almost black, value uncertain.
Messfeld {0} Blenden zum Bild	Spot {0} stops vs. frame
Kamera im Browser nicht verfügbar. „messen“ funktioniert trotzdem.	Camera not available in the browser. “measure” still works.
Kein Zugriff auf die Kamera. „messen“ funktioniert trotzdem.	No camera access. “measure” still works.
Kamera konnte nicht starten. „messen“ funktioniert trotzdem.	The camera could not start. “measure” still works.
Abgleich mit einem echten Belichtungsmesser. Plus ergibt kürzere Zeiten.	Match against a real light meter. Plus gives faster speeds.
Brennweite Handykamera	Phone camera focal length
Kleinbild-äquivalent, für den Bildausschnitt. Wird aus dem EXIF eines Messfotos übernommen.	35 mm equivalent, for the frame lines. Taken from the EXIF of a metering photo.
Blende Handykamera	Phone camera aperture
Nur für eine Live-Messung, falls der Browser Zeit und ISO liefert. Wird aus dem EXIF übernommen.	Only for live metering if the browser provides shutter and ISO. Taken from the EXIF.
Messfoto beim Loggen als Handyfoto speichern	Save the metering photo as phone photo when logging
Nur wenn das Bild noch kein Handyfoto hat.	Only if the frame has no phone photo yet.
Safari gibt Zeit, ISO und Weißabgleich der Handykamera im Live-Bild nicht heraus. Einen Lichtwert gibt es deshalb über „messen“ (Foto mit EXIF) oder von Hand an der Walze LW. Schlösser halten einen Wert fest, auch beim nächsten Öffnen.	Safari does not expose the phone camera's shutter, ISO or white balance in the live image. You get an EV via “measure” (photo with EXIF) or by hand on the EV wheel. Locks keep a value, also the next time you open the meter.
Messung geloggt	Reading logged
Kein Objektiv gewählt, volle Blendenreihe	No lens selected, full aperture range
kürzer als die Kamera	faster than the camera
länger als die Kamera	slower than the camera
Kamera {0}	Camera {0}
Schwarzschild {0}	Reciprocity {0}
Schwarzschild unbekannt	Reciprocity unknown
(Box Speed)	(box speed)
{0} übernehmen	Apply {0}
Blenden	stops
ISO (Infrarot)	ISO (infrared)
Noch keine Filter. Lege sie im Kameraschrank unter „Filter“ an.	No filters yet. Add them in the camera cabinet under “Filters”.
Schraubfilter, lässt Licht ab etwa 720 nm durch.	Screw-in filter, passes light from about 720 nm.
Aufgenommen am	Taken on
Fotos gemacht	Photos taken
diesen Monat {0} Fotos	this month {0} photos
diesen Monat {0} Foto	this month {0} photo
Du hast diesen Monat schon {0} gemacht. Insgesamt sind es {1}.	This month you have already taken {0}. That makes {1} in total.
Diesen Monat	This month
Dieses Jahr	This year
Insgesamt	In total
Noch keine Fotos mit Aufnahmetag.	No photos with a date yet.
{0} Fotos	{0} photos
{0} Foto	{0} photo
Ideen	Ideas
Idee	Idea
{0} Ideen	{0} ideas
{0} Idee	{0} idea
Neue Idee	New idea
Idee hinzufügen	Add idea
Idee löschen	Delete idea
Idee löschen?	Delete idea?
Idee gespeichert	Idea saved
Idee gelöscht	Idea deleted
Beschreibung	Description
Beispielbilder	Example pictures
Bild hinzufügen	Add picture
Bild entfernen	Remove picture
Ohne Beschreibung	No description
Motiv, Licht, Technik, wo du es gesehen hast …	Subject, light, technique, where you saw it …
Noch keine Filter im Kameraschrank.	No filters in the camera cabinet yet.
Halte hier fest, was du ausprobieren willst: ein Motiv, eine Technik, ein Bild aus Social Media. Lege mit dem Plus die erste Idee an.	Keep what you want to try here: a subject, a technique, a picture from social media. Add your first idea with the plus.
Objektiv ist inaktiv	Lens is inactive
Inaktive Objektive stehen im Schrank unter „Inaktiv“ und erscheinen nicht mehr in der Bildansicht.	Inactive lenses are listed under “Inactive” in the cabinet and no longer appear in the frame view.
Noch keine aktiven Objektive.	No active lenses yet.
Datum wählen	Choose date
Aufnahmetag	Date taken
Einträge verschieben	Move entries
Halte ein Bild gedrückt und ziehe es an die richtige Stelle. Alles dazwischen rückt nach. Oder verschiebe alle Einträge auf einmal.	Hold a frame and drag it to the right place. Everything in between moves along. Or move all entries at once.
‹ Alle eins nach vorne	‹ All one back
Alle eins nach hinten ›	All one forward ›
Rückgängig	Undo
Rückgängig gemacht	Undone
Das letzte Bild ist belegt, nach hinten geht nichts mehr	The last frame is in use, nothing can move further back
Bild 1 ist belegt, nach vorne geht nichts mehr	Frame 1 is in use, nothing can move further forward
Alle Einträge eins nach hinten	All entries moved one forward
Alle Einträge eins nach vorne	All entries moved one back
Eintrag von Bild {0} auf Bild {1} verschoben	Entry moved from frame {0} to frame {1}
Bitte wählen	Please choose
Schiebefilter	Slide-in filter
Schraubfilter	Screw-in filter
Gewindedurchmesser	Thread diameter
Gewindedurchmesser (mm)	Thread diameter (mm)
Hervorgehoben: Filtergewinde deiner Objektive.	Highlighted: filter threads of your lenses.
Anderer Schiebefilter	Other slide-in filter
Schraubfilter hinzugefügt	Screw-in filter added
`;
  const EXACT = new Map(), PATS = [];
  const norm = s => s.replace(/\s+/g, ' ').trim();
  RAW.split('\n').forEach(line => {
    const i = line.indexOf('\t'); if (i < 0) return;
    const de = norm(line.slice(0, i)), en = line.slice(i + 1).trim();
    if (!/\{\d+\}/.test(de)) { EXACT.set(de, en); return; }
    const order = [];
    const re = new RegExp('^' + de.split(/(\{\d+\})/).map(p => { const m = p.match(/^\{(\d+)\}$/); if (m) { order.push(+m[1]); return '(.+?)'; } return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('') + '$');
    PATS.push({ re, en, order, n: order.length });
  });
  PATS.forEach(p => { p.lit = p.re.source.replace(/\(\.\+\?\)/g, '').length; });
  PATS.sort((a, b) => b.lit - a.lit);

  const tw = v => { const r = t(v); return r !== v ? r : v.split(' ').map(w => EXACT.get(w) ?? w).join(' '); };
  function t(s) {
    if (get() !== 'en' || s == null) return s;
    const k = norm(String(s));
    if (!k) return s;
    if (EXACT.has(k)) return EXACT.get(k);
    for (const p of PATS) {
      const m = k.match(p.re);
      if (m) {
        const vals = {}; p.order.forEach((idx, j) => { const v = m[j + 1]; vals[idx] = EXACT.get(v) ?? (/[A-Za-zÄÖÜäöüß]/.test(v) ? tw(v) : v); });
        return p.en.replace(/\{(\d+)\}/g, (_, i) => vals[i] ?? '');
      }
    }
    return s;
  }
  const ATTRS = ['aria-label', 'title', 'placeholder'];
  function node(n) {
    if (n.nodeType === 3) {
      const v = n.nodeValue; if (!/[A-Za-zÄÖÜäöüß]/.test(v)) return;
      const p = n.parentNode; if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || p.nodeName === 'TEXTAREA')) return;
      const r = t(v);
      if (r !== v) { const lead = v.match(/^\s*/)[0], tail = v.match(/\s*$/)[0]; n.nodeValue = lead + r + tail; }
      return;
    }
    if (n.nodeType !== 1) return;
    for (const a of ATTRS) { const v = n.getAttribute(a); if (v && v.trim()) { const r = t(v); if (r !== v) n.setAttribute(a, r); } }
    if (n.nodeName === 'INPUT' && (n.type === 'button' || n.type === 'submit') && n.value) { const r = t(n.value); if (r !== n.value) n.value = r; }
    for (let c = n.firstChild; c; c = c.nextSibling) node(c);
  }
  function apply(root = document.body) { if (get() === 'en' && root) node(root); }
  function watch() {
    document.documentElement.lang = get();
    new MutationObserver(recs => {
      if (get() !== 'en') return;
      for (const r of recs) {
        if (r.type === 'childList') r.addedNodes.forEach(node);
        else if (r.type === 'characterData') node(r.target);
        else if (r.type === 'attributes') node(r.target);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    apply();
  }
  const _confirm = window.confirm.bind(window), _alert = window.alert.bind(window);
  window.confirm = m => _confirm(t(m));
  window.alert = m => _alert(t(m));
  return {
    get, t, apply, watch,
    has: () => !!lang,
    locale: () => (get() === 'en' ? 'en-GB' : 'de-DE'),
    set(l) {
      lang = l; try { localStorage.setItem(KEY, l); } catch (_) {}
      document.documentElement.lang = l;
      location.reload();
    }
  };
})();
