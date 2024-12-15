# SMTP-Graph-Relay

SMTP-Graph-Relay ist ein SMTP-Server, der eingehende E-Mails empfängt und sie über die Microsoft Graph API weiterleitet. Dies ermöglicht eine nahtlose Integration von Legacy-SMTP-Anwendungen mit modernen Microsoft 365-Diensten.

## Inhaltsverzeichnis

- [Funktionen](#funktionen)
- [Voraussetzungen](#voraussetzungen)
- [Schnellstart](#schnellstart)
- [Installation für Entwickler](#installation-für-entwickler)
- [Konfiguration](#konfiguration)
- [Azure App-Registrierung](#azure-app-registrierung)
- [Als Windows-Dienst einrichten](#als-windows-dienst-einrichten)
- [Beitragen](#beitragen)
- [Lizenz](#lizenz)

## Funktionen

- SMTP-Server zum Empfangen von E-Mails (Der Server läuft Plain ohne SSL/TLS)
- Weiterleitung von E-Mails über Microsoft Graph API
- IP-Whitelist für eingehende Verbindungen
- Unterstützung für Dateianhänge
- Einfache Konfiguration über Umgebungsvariablen

## Voraussetzungen

- Eine Microsoft Azure-Anwendung mit den erforderlichen Berechtigungen

## Schnellstart

1. Laden Sie die neueste Version der `SMTP-Relay.exe` von der [Releases-Seite](https://github.com/BitcircuitEU/SMTP-Graph-Relay/releases) herunter.

2. Erstellen Sie eine `.env`-Datei im gleichen Verzeichnis wie die .exe-Datei (siehe [Konfiguration](#konfiguration)).

3. Führen Sie die `SMTP-Relay.exe` aus.

## Installation für Entwickler

Wenn Sie an dem Projekt entwickeln oder es direkt als Quelle ausführen möchten, folgen Sie diesen Schritten:

1. Stellen Sie sicher, dass Node.js (Version 14 oder höher) installiert ist.

2. Klonen Sie das Repository:
> git clone https://github.com/BitcircuitEU/SMTP-Graph-Relay.git

3. Wechseln Sie in das Projektverzeichnis:
> cd SMTP-Graph-Relay


4. Installieren Sie die Abhängigkeiten:
> npm install

5. Erstellen Sie eine `.env`-Datei im Hauptverzeichnis des Projekts (siehe [Konfiguration](#konfiguration)).

## Konfiguration

Erstellen Sie eine `.env`-Datei im Hauptverzeichnis des Projekts mit folgenden Variablen:
```
ALLOWED_IPS=127.0.0.1,192.168.0.0/24
SMTP_PORT=25
TENANT_ID=your_tenant_id_here
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here
SENDER=default_sender@example.com
```


- `ALLOWED_IPS`: Komma-getrennte Liste von IP-Adressen oder CIDR-Bereichen, die sich mit dem SMTP-Server verbinden dürfen.
- `SMTP_PORT`: Der Port, auf dem der SMTP-Server laufen soll (Standard: 25).
- `TENANT_ID`: Die Tenant-ID Ihrer Azure-Anwendung.
- `CLIENT_ID`: Die Client-ID Ihrer Azure-Anwendung.
- `CLIENT_SECRET`: Das Client-Secret Ihrer Azure-Anwendung.
- `SENDER`: Die Standard-E-Mail-Adresse, die als Absender verwendet wird, wenn keine angegeben ist.


Dies erstellt eine ausführbare Datei im `dist`-Verzeichnis.

## Azure App-Registrierung

Um SMTP-Graph-Relay zu verwenden, müssen Sie eine Azure-Anwendung registrieren und die erforderlichen Berechtigungen konfigurieren.

1. Melden Sie sich beim [Azure-Portal](https://portal.azure.com/) an.

2. Navigieren Sie zu "App-Registrierungen" und klicken Sie auf "Neue Registrierung".

   ![App registrieren](https://i.imgur.com/uIEKSLh.png)

3. Geben Sie einen Namen für Ihre Anwendung ein und klicken Sie auf "Registrieren".

4. Notieren Sie sich die "Anwendungs-ID (Client)" und die "Verzeichnis-ID (Tenant)" von der Übersichtsseite.

   ![Übersicht Client ID, Tenant ID](https://i.imgur.com/nFPxOfk.png)

5. Unter "Zertifikate & Geheimnisse", erstellen Sie ein neues Client-Geheimnis.

   ![Seite für Client Secret](https://i.imgur.com/UMlRgy8.png)

6. Unter "API-Berechtigungen", fügen Sie die Berechtigung "Mail.Send" als Anwendungsberechtigung hinzu.

   ![Seite für API Berechtigungen](https://i.imgur.com/kDAoqcb.png)

7. Klicken Sie auf "Administratorzustimmung erteilen" für Ihre Organisation.

Verwenden Sie die Anwendungs-ID als `CLIENT_ID`, die Verzeichnis-ID als `TENANT_ID`, und das Client-Geheimnis als `CLIENT_SECRET` in Ihrer `.env`-Datei.

## Als Windows-Dienst einrichten

Sie können SMTP-Graph-Relay als Windows-Dienst mit NSSM (Non-Sucking Service Manager) einrichten. Hier sind die Schritte:

1. Laden Sie NSSM von der [offiziellen Website](https://nssm.cc/download) herunter.

2. Extrahieren Sie die heruntergeladene ZIP-Datei.

3. Öffnen Sie eine Eingabeaufforderung als Administrator und navigieren Sie zum Verzeichnis, in dem Sie NSSM extrahiert haben.

4. Führen Sie den folgenden Befehl aus, um den NSSM-Dienst-Editor zu öffnen:
> nssm.exe install SMTP-Graph-Relay

5. Im NSSM-Dienst-Editor:
- Setzen Sie den "Path" auf den Pfad Ihrer generierten .exe-Datei.
- Setzen Sie den "Startup directory" auf das Verzeichnis, das die .exe-Datei enthält.
- Unter dem Tab "Details", setzen Sie "Display name" und "Description" nach Bedarf.
- Unter dem Tab "Environment", fügen Sie Ihre Umgebungsvariablen hinzu (aus der .env-Datei).

6. Klicken Sie auf "Install service".

7. Um den Dienst zu starten, führen Sie aus:
> nssm.exe start SMTP-Graph-Relay

Jetzt läuft SMTP-Graph-Relay als Windows-Dienst und startet automatisch beim Systemstart.

## Beitragen

Beiträge sind willkommen! Bitte lesen Sie zunächst die Beitragsrichtlinien.

## Lizenz

Dieses Projekt ist unter der ISC-Lizenz lizenziert. Weitere Details finden Sie in der [LICENSE](LICENSE)-Datei.