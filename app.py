from flask import Flask, send_from_directory
from flask_socketio import SocketIO, join_room, leave_room, emit
import os, random, string

app = Flask(__name__)
app.config['SECRET_KEY'] = 'geheimespasswort123'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Alle aktiven Spielräume speichern
# { "ABCD": { "spieler": [sid1, sid2], "feld": [...], "amZug": 0 } }
raeume = {}

def leeres_feld():
    return [[0]*7 for _ in range(6)]

def raum_id_erstellen():
    return ''.join(random.choices(string.ascii_uppercase, k=4))

# ── Frontend ausliefern ───────────────────────────────────
import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/<path:datei>')
def static_files(datei):
    return send_from_directory(BASE_DIR, datei)

# ── WebSocket-Events ──────────────────────────────────────

@socketio.on('raum_erstellen')
def raum_erstellen():
    """Spieler 1 erstellt einen neuen Raum."""
    raum_id = raum_id_erstellen()
    raeume[raum_id] = {
        'spieler': [request.sid],  # request.sid = eindeutige ID des Browsers
        'feld': leeres_feld(),
        'am_zug': 0               # Index in der spieler-Liste
    }
    join_room(raum_id)
    emit('raum_erstellt', {'raum_id': raum_id, 'spieler_nr': 1})

@socketio.on('raum_beitreten')
def raum_beitreten(data):
    """Spieler 2 tritt einem bestehenden Raum bei."""
    from flask import request
    raum_id = data['raum_id'].upper()

    if raum_id not in raeume:
        emit('fehler', {'nachricht': 'Raum nicht gefunden!'})
        return

    raum = raeume[raum_id]
    if len(raum['spieler']) >= 2:
        emit('fehler', {'nachricht': 'Raum ist voll!'})
        return

    raum['spieler'].append(request.sid)
    join_room(raum_id)

    # Beide Spieler informieren, dass es losgehen kann
    emit('spieler_nr', {'spieler_nr': 2})
    socketio.emit('spiel_startet', {'nachricht': 'Spiel beginnt!'}, to=raum_id)

@socketio.on('zug')
def zug_verarbeiten(data):
    """Ein Spieler macht einen Zug."""
    from flask import request
    raum_id = data['raum_id']
    spalte  = data['spalte']

    if raum_id not in raeume:
        return

    raum    = raeume[raum_id]
    spieler_idx = raum['spieler'].index(request.sid)  # 0 oder 1
    spieler_nr  = spieler_idx + 1                      # 1 oder 2

    # Ist dieser Spieler wirklich dran?
    if raum['am_zug'] != spieler_idx:
        emit('fehler', {'nachricht': 'Du bist nicht dran!'})
        return

    feld = raum['feld']

    # Unterste freie Reihe finden
    reihe = -1
    for r in range(5, -1, -1):
        if feld[r][spalte] == 0:
            reihe = r
            break

    if reihe == -1:
        emit('fehler', {'nachricht': 'Spalte ist voll!'})
        return

    # Stein setzen
    feld[reihe][spalte] = spieler_nr

    # Zug an ALLE im Raum senden
    socketio.emit('zug_gemacht', {
        'spalte':    spalte,
        'reihe':     reihe,
        'spieler_nr': spieler_nr
    }, to=raum_id)

    # Gewinner prüfen (vereinfacht – vollständig wie im JS)
    # (In einem echten Projekt würde man die Gewinnprüfung hier auch einbauen)

    # Spielerwechsel
    raum['am_zug'] = 1 - raum['am_zug']  # 0 → 1 → 0 → ...

@socketio.on('disconnect')
def disconnect():
    """Spieler hat die Verbindung getrennt."""
    from flask import request
    for raum_id, raum in list(raeume.items()):
        if request.sid in raum['spieler']:
            socketio.emit('gegner_weg', {}, to=raum_id)
            del raeume[raum_id]
            break

if __name__ == '__main__':
   port = int(os.environ.get('PORT', 5000))
socketio.run(app, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)
