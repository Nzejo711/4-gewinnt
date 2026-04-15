// ── KONFIGURATION ──────────────────────────────────────
const REIHEN   = 6;
const SPALTEN  = 7;

// Das Spielfeld: eine 6x7-Tabelle, alles 0 (= leer)
let feld = [];

// Wer ist dran? 1 = Spieler 1 (Rot), 2 = Spieler 2 (Gelb)
let aktuellerSpieler = 1;

// Läuft das Spiel noch?
let spielLaeuft = true;

// Spielt man gegen KI?
let gegenKIModus = false;
function feldErstellen() {
  // Leere Tabelle erstellen (6 Reihen, 7 Spalten, alle Werte = 0)
  feld = [];
  for (let r = 0; r < REIHEN; r++) {
    feld.push(new Array(SPALTEN).fill(0));
  }
  // Spieler 1 fängt an
  aktuellerSpieler = 1;
  spielLaeuft = true;

  // HTML-Spielfeld neu zeichnen
  spielfeldZeichnen();
  statusAktualisieren();
}
function spielfeldZeichnen() {
  const boardDiv = document.getElementById('board');
  boardDiv.innerHTML = ''; // Altes Feld löschen

  // Jede Reihe und Spalte durchgehen
  for (let r = 0; r < REIHEN; r++) {
    for (let s = 0; s < SPALTEN; s++) {
      const zelle = document.createElement('div');
      zelle.classList.add('zelle');

      // Spielerfarbe setzen
      if (feld[r][s] === 1) zelle.classList.add('spieler1');
      if (feld[r][s] === 2) zelle.classList.add('spieler2');

      // Klick-Event: Spieler klickt auf Spalte s
      zelle.addEventListener('click', () => zugMachen(s));

      boardDiv.appendChild(zelle);
    }
  }
}
function zugMachen(spalte) {
  if (!spielLaeuft) return; // Spiel ist vorbei → nichts tun

  // Finde die unterste freie Reihe in dieser Spalte
  let reihe = -1;
  for (let r = REIHEN - 1; r >= 0; r--) {
    if (feld[r][spalte] === 0) {
      reihe = r;
      break; // Gefunden! Schleife stoppen
    }
  }

  if (reihe === -1) return; // Spalte ist voll → nichts tun

  // Stein setzen
  feld[reihe][spalte] = aktuellerSpieler;

  // Neu zeichnen
  spielfeldZeichnen();

  // Gewinner prüfen
  if (gewinnPruefen(aktuellerSpieler)) {
    document.getElementById('status').textContent =
      `🎉 Spieler ${aktuellerSpieler} gewinnt!`;
    spielLaeuft = false;
    return;
  }

  // Unentschieden prüfen
  if (unentschiedenPruefen()) {
    document.getElementById('status').textContent = '🤝 Unentschieden!';
    spielLaeuft = false;
    return;
  }

  // Spieler wechseln
  aktuellerSpieler = aktuellerSpieler === 1 ? 2 : 1;
  statusAktualisieren();

  // KI-Zug, wenn nötig
  if (gegenKIModus && aktuellerSpieler === 2) {
    setTimeout(kiZug, 300); // 300ms Pause, damit es natürlich wirkt
  }
}
function gewinnPruefen(spieler) {
  // ── Waagerecht (→) ──
  for (let r = 0; r < REIHEN; r++) {
    for (let s = 0; s <= SPALTEN - 4; s++) {
      if (feld[r][s]   === spieler &&
          feld[r][s+1] === spieler &&
          feld[r][s+2] === spieler &&
          feld[r][s+3] === spieler) return true;
    }
  }

  // ── Senkrecht (↓) ──
  for (let r = 0; r <= REIHEN - 4; r++) {
    for (let s = 0; s < SPALTEN; s++) {
      if (feld[r][s]   === spieler &&
          feld[r+1][s] === spieler &&
          feld[r+2][s] === spieler &&
          feld[r+3][s] === spieler) return true;
    }
  }

  // ── Diagonal (↘) ──
  for (let r = 0; r <= REIHEN - 4; r++) {
    for (let s = 0; s <= SPALTEN - 4; s++) {
      if (feld[r][s]     === spieler &&
          feld[r+1][s+1] === spieler &&
          feld[r+2][s+2] === spieler &&
          feld[r+3][s+3] === spieler) return true;
    }
  }

  // ── Diagonal (↙) ──
  for (let r = 0; r <= REIHEN - 4; r++) {
    for (let s = 3; s < SPALTEN; s++) {
      if (feld[r][s]     === spieler &&
          feld[r+1][s-1] === spieler &&
          feld[r+2][s-2] === spieler &&
          feld[r+3][s-3] === spieler) return true;
    }
  }

  return false; // Kein Gewinner gefunden
}

function unentschiedenPruefen() {
  // Wenn in der obersten Reihe alle Felder belegt sind → Unentschieden
  return feld[0].every(zelle => zelle !== 0);
}

function statusAktualisieren() {
  const farbe = aktuellerSpieler === 1 ? '🔴' : '🟡';
  document.getElementById('status').textContent =
    `${farbe} Spieler ${aktuellerSpieler} ist dran`;
}

function neuesSpiel() {
  gegenKIModus = false;
  feldErstellen();
}

function gegenKI() {
  gegenKIModus = true;
  feldErstellen();
}

// Spiel starten
feldErstellen();

function kiZugEinfach() {
  // 1. Kann KI gewinnen?
  for (let s = 0; s < SPALTEN; s++) {
    if (zugIstGueltig(s)) {
      const reihe = untersteFreieReihe(s);
      feld[reihe][s] = 2;
      if (gewinnPruefen(2)) { feld[reihe][s] = 0; return s; }
      feld[reihe][s] = 0;
    }
  }
  // 2. Muss KI blockieren?
  for (let s = 0; s < SPALTEN; s++) {
    if (zugIstGueltig(s)) {
      const reihe = untersteFreieReihe(s);
      feld[reihe][s] = 1;
      if (gewinnPruefen(1)) { feld[reihe][s] = 0; return s; }
      feld[reihe][s] = 0;
    }
  }
  // 3. Beste Spalte wählen (Mitte bevorzugen)
  const reihenfolge = [3, 2, 4, 1, 5, 0, 6];
  for (const s of reihenfolge) {
    if (zugIstGueltig(s)) return s;
  }
}

function zugIstGueltig(spalte) {
  return feld[0][spalte] === 0; // Oberste Reihe leer = Spalte hat Platz
}

function untersteFreieReihe(spalte) {
  for (let r = REIHEN - 1; r >= 0; r--) {
    if (feld[r][spalte] === 0) return r;
  }
  return -1;
}
