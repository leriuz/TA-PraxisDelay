# WaitTime – Admin Panel

Web-App für MPA/Empfang: Verzögerungen pro Arzt oder praxisweit in Echtzeit verwalten.

**Stack:** React · Tailwind CSS · Supabase (Postgres + Auth) · Deutsch (CH)

---

## Features
- Login via Supabase Auth (E-Mail/Passwort)
- **Pro Arzt** oder **Praxisweit* Modus
- Verzögerung 0–180 Min, 5-Min-Schritte (Quickbuttons ±5/±15 + Dropdown)
- Sofortspeicherung, 30-Sek. Auto-Refresh, relative Zeitanzeige ("vor X Min")
- Mobile-responsive, RLS pro Praxis

---

## Setup

### 1. Supabase
### 2. MPA-User anlegen

## DB-Schema

| Tabelle | Beschreibung |
|---|---|
| `practices` | Praxisname, Stadt |
| `providers` | Ärzte, verknüpft mit Praxis |
| `profiles` | Auth-User ↔ Praxis |
| `delay_status` | Aktuelle Verzögerung (praxisweit oder pro Arzt) |
| `v_delay_current` | View für Patienten-App |

---

## Sicherheit
RLS aktiv – jeder MPA sieht/schreibt nur seine Praxisdaten.