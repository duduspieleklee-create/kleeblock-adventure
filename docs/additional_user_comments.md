Ich habe ein problem mit meinem phaser4 game project, es geht um skalierung der UI je nach auflösung. Also es gibt eine minimum fenster grösse und eine mamimum und zwischen diesen grössen skaliert das game fenster flexibel und die UI/HUD soll mot skalieren, das tur die UI irgendwie auch über ein uiscale global helper aber die texte innergalb der ui/questbook skalieren auch mit und sind teilweise so verschwommen das man nichts lesen kann, hast du eine idee wie m


an das üblicher weise löst, so best practice ?

look refference screenshot: docs/15388.jpg
Und wenn wir schon dabei sind ich hatte gerne ein permanente UI im spiel , bei Feld 1 quasi unten eine quick access leiste wo später zb skills aktiviert werden können oder man zu seinem inventar kommt, im moment gibt es ja nur das questbook das hätte ich gerne dann ganz links von der leiste dort kann man es immer öffnen und schliessen, bei Feld 2 soll die aktuelle aufgabe / quest angezeigt werden nur klein und dezent aber zum erinnern. Feld 3 soll immer das dialog interaction fenster /also wenn man mit etwas / npc interagiert angezeigt werden. Macht das sinn? Wo definiert man eigentlich die spiele UI? Das soll ja quasi immer da sein egal wo im spiel

Wie ordnest du das dann an das es egal bei welcher auflösung immer an der gleichen stelle ist? Ich meine skalierung und rendering der texte ist dann geklärt aber wie machen wir das das die UI immer sauber an der selben stelle ist? Das akutelle questbook hab ich aus diesem grund noch nie gesehen im spiel 😅. Und müssen wir in diesem schritt nicht festhalten ob das spiel zumindest auf mobile horizontal oder vertikal gespielt wird ?
