# DEXTRO DASH 2000

DEXTRO DASH 2000 er en selvstændig, spilbar arkadeprototype. Spilleren styrer det lilla monster **DEX**, mens en lokal kopi af T1D Simulatorens fysiologimotor beregner blodsukker, insulin og optagelse af kulhydrat.

Projektet kan køre uden resten af T1D Simulatoren og har ingen build-proces eller eksterne kodeafhængigheder.

## Start

1. Åbn `index.html` direkte i en moderne browser, eller start en lokal HTTP-server i projektroden.
2. Tryk `Z`, venstre pil, højre pil eller pil op på titelskærmen.

## Styring

1. `Venstre/højre pil`: løb frem eller tilbage gennem den allerede besøgte del af banen. Man kan ikke løbe længere tilbage end startpunktet.
2. `Pil op`: hop.
3. `A`: brug 1 opsamlet bolsje med 10 g hurtigt kulhydrat.
4. I bane 1 giver en insulinpen automatisk 1 E hurtig insulin ved berøring.
5. I bane 2 opfanger pumpen de næste 3 insulinpenne. `Z` frigiver 1 E fra lageret.
6. `M` eller knappen `MUSIC`: slå kun baggrundsmusikken til eller fra.
7. `L` eller knappen `SOUND`: slå hop, bid, pickups og andre lydeffekter til eller fra.
8. `1` eller `2`: start den valgte bane direkte med nulstillede point, liv og fysiologi under udvikling.

## Prototypeafgrænsning

1. To originale baner. Bane 2 introducerer pumpen og flere høje ruter via super-hop.
2. Ingen forklaringer, quizzer, dialoger eller undervisningspopups.
3. Kraftigt accelereret fysiologisk tid: 4 simulerede minutter pr. sekund.
4. Insulinpenne aktiveres ved berøring. Bolsjer samles og bruges med `A`.
5. Fysiologimotoren og Hovorka-modellen ligger som lokale kopier i `engine/`, så mappen kan flyttes og afvikles uden resten af T1D Simulatoren.
6. Baggrund, figurer og pickups er originale assets til prototypen; platformene tegnes i Canvas.
7. Banen starter med 120 sekunder. Resterende tid giver 50 point pr. sekund.
8. HUD, trendpil og TIR bruger modellens sande BG-værdi uden CGM-forsinkelse eller sensorstøj. TIR mellem 3,9 og 10,0 mmol/L giver en ekstra del af tidsbonussen.
9. Spilleren styrer DEX, et lille lilla monster sammensat af separate Canvas-lag til hale, ben, krop/hoved, BG-udtryk og udstyr. Benlaget bruger en 6-trins løbecyklus, mens kropslaget genbruges på tværs af løb og spring. De 8 overdrevne spiseframes beholder deres særlige mundposer.
10. Lagkagemonsteret hedder Crumbler, og sodavandsmonsteret hedder Fizzler. De kan trampes væk eller spises ved sidekollision. Munden begynder at åbne cirka 30 pixels før kontakt. Ved sammenstødet bevæger den store mund sig over byttet, som vises inde i mundhulen, krymper og forsvinder.
11. Madmonstre har komplette ernæringsprofiler med kulhydrat, protein, fedt, vægt, kulhydrattype og spisetid. Crumbler giver 30 g kulhydrat, 2,5 g protein og 12,5 g fedt som en 75 g lagkageportion. Fizzler giver 20 g hurtigt, flydende kulhydrat som cirka 185 ml cola. Nye madmonstre skal tilsvarende defineres med alle relevante makronæringsstoffer.
12. Spillet tegnes internt i 1280 x 800 pixels for skarpere grafik.
13. Ved tab af liv blinker figuren og falder ud af skærmen. Årsag og point bliver derefter stående, indtil spilleren trykker en starttast.
14. Funklende diamanter giver 100 point pr. stk. som en samlet bonus ved målstregen.
15. Landskabet har en sammenhængende hovedbaggrund, et tåget fjernt lag og et jordforankret plantebælte bag gameplayet. Der tegnes ikke længere et parallaxlag foran spillerfiguren.
16. Et tramp på et madmonster udløser et super-hop, som kan nå banens højeste platforme. Crumbler giver `CRUMBLER CRUSH! +250`, mens Fizzler giver `FIZZLER POP! +300`.
17. Monsterets elastiske hale følger bevægelsen med dæmpet inerti. Fysikpunkterne omsættes til en glat, organisk silhuet, der er bred ved kroppen og tilspidset uden endeknop. En smal mørklilla kant omgiver en kerne, som toner fra lilla til blå ved lav BG, grøn i målområdet eller orange ved høj BG.
18. Bane 2 indeholder to pumpeudgaver. Den manuelle pumpe sidder på DEX' mave, lagrer højst 3 opsamlede doser og doserer 1 E med `Z`. Den avancerede auto-pumpe sidder som en lille rygsæk, overtager det eksisterende lager og afgiver automatisk 1 E, når true BG er over 7 mmol/L.
19. En lodret BG-måler i højre side viser lave værdier nederst og høje værdier øverst. En talmarkør flytter sig gennem lav-, mål- og højzonen med modellens sande BG.
20. Efter målstregen tælles tidsbonus, TIR-bonus og diamantbonus op én række ad gangen med pointtik og en afsluttende TOTAL-lyd. Resultatet bliver stående, indtil spilleren trykker videre.
21. Den lodrette måler er spillets eneste BG-skala. COB og IOB sidder til højre ved målerens top med COB øverst. Toplinjen viser `A`-bolsjer over `Z`-pumpen og tre visuelle pennepladser. Opsamlede bolsjer og insulinpenne flyver fra banen til deres placering i HUD'en.
22. Kamera og baggrundslag bevæges med subpixel-præcision for jævn scrolling. Det nærmeste baggrundslag bruger et sammenhængende plantebælte, som overlapper en bred vegetationsfod og fortsætter helt til jorden. Laget bevæger sig langsommere end baneplanet og ligger altid bag spiller, fjender og pickups.
23. Baggrundsmusikken er et originalt 64-trins arrangement med 6 lag: lead, svarmelodi, arpeggio, bas, akkordflade og percussion. Musik og lydeffekter ligger fortsat på separate kanaler.
24. Ved højt BG dækkes det oprindelige glade grin af en fuldt uigennemsigtig, renderet ansigtslap med en træt, nedadvendt mund. Mund og øjenlåg er separate moduler, så de kan genbruges på alle almindelige bevægelsesframes. Hvert øjenlåg klippes til det tilhørende øje, så lågene gradvist lukker øjnene uden at mødes som en brille eller gå uden for hovedet.
25. Bolsje- og pumpefelterne er skjult ved spillets start. Når spilleren finder udstyret, flyver pickupen til sin nye plads i HUD'en, hvorefter feltet bliver stående. Første bolsje viser `HINT: PRESS A TO USE CANDY AND RAISE BLOOD SUGAR`, og den første pumpe viser `HINT: PRESS Z TO USE INSULIN FROM THE PUMP`.
26. Fizzler står med mellemrum og ryster i 2 sekunder. I denne tilstand er sidekontakt farlig, mens et tramp udløser et højere super-hop.

## Licens

Projektet udgives under GNU General Public License version 3, samme open-source-licens som T1D Simulator. Se `LICENSE`.

## Motorens spilværdier

1. Fast testprofil: 70 kg, ISF 3 mmol/L/E og ICR 10 g/E.
2. Start-BG: cirka 6,0 mmol/L i fastende steady state med 0 g COB.
3. Insulinpen: 1 E hurtig insulin, som aktiveres straks ved berøring.
4. Bolsje: 10 g hurtigt kulhydrat.
5. Fedt/protein-modulet og den fedtudløste ændring i insulinvirkning er aktive, så de komplette madprofiler faktisk behandles af fysiologimotoren.
6. Lav BG afslutter et liv under 2,8 mmol/L.
7. Høj BG afslutter ikke et liv. Fra 10 til 18 mmol/L bliver monsteret gradvist mere døsig, løber og accelererer langsommere og hopper lavere. Effekten er maksimal fra 18 mmol/L.

Disse tal er kun prototypekalibrering til den fiktive spilfigur og er ikke individuel behandlingsvejledning.
