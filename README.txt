MOJE STAVBA — verze BEZ PODSLOŽEK (pro nahrávání z mobilu)
================================================================

CO SE STALO
--------------
Na screenshotu chyběly složky "css" a "js" - zůstal tam jen
index.html a pár dalších souborů z kořene. Mobilní nahrávání
souborů na GitHub přes web bohužel často neumí spolehlivě nahrát
vnořené složky (podsložky).

ŘEŠENÍ
---------
Tahle verze je přestavěná tak, aby VŮBEC žádné podsložky
nepotřebovala. Všechny soubory (JS i CSS) jsou teď rovnou v jedné
hromadě, jen s delšími názvy (např. "screen-dashboard.js" místo
"js/screens/dashboard.js"). Appka dělá úplně to samé jako předtím -
mění se jen to, jak jsou soubory pojmenované/uložené.


JAK NA TO (z mobilu)
------------------------
1. Na GitHubu ve svém repozitáři smaž VŠECHNY současné soubory
   (i ty co tam už jsou - .nojekyll klidně nech, README taky).
2. "Add file" -> "Upload files".
3. Nahraj VŠECHNY soubory z týhle složky najednou (na mobilu jde
   vybrat víc souborů najednou přes "Vybrat soubory" / fotky+soubory
   ikonku) - žádné složky, jen samotné soubory, tak jak jsou.
4. Počkej pár desítek vteřin, než se appka na GitHub Pages
   přebuilduje, a zkus adresu znovu.

Zkontroluj pak na githubu.com, že v seznamu souborů vidíš rovnou
"index.html", "app.css", "data.js" atd. - žádná složka by tam už
neměla být.
