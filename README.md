# WaitTime – Admin Panel

Web-App für MPA/Empfang: Verzögerungen pro Arzt oder praxisweit in Echtzeit verwalten.

**Stack:** React · Tailwind CSS · Supabase (Postgres + Auth) · Deutsch (CH)

---

## Features
- Login via Supabase Auth (E-Mail/Passwort)
- **Pro Arzt** oder **Praxisweit** Modus
- Verzögerung 0–180 Min, 5-Min-Schritte (Quickbuttons ±5/±15 + Dropdown)
- Sofortspeicherung, 30-Sek. Auto-Refresh, relative Zeitanzeige ("vor X Min")
- Mobile-responsive, RLS pro Praxis

---

## Setup

### 1. Supabase
1. Projekt erstellen → SQL Editor → `/supabase/migrations/001_initial_schema.sql` ausführen
2. Credentials notieren: Project URL + Anon Key → in `/utils/supabase/info.tsx` eintragen

### 2. MPA-User anlegen
```
Auth → Users → Add user → E-Mail + Passwort
```
UUID verknüpfen:
```sql
INSERT INTO public.profiles (id, practice_id, role)
VALUES ('<user-uuid>', '550e8400-e29b-41d4-a716-446655440000', 'mpa');
```

### 3. Starten
URL öffnen → Anmelden → fertig.

---

## DB-Schema

| Tabelle | Beschreibung |
|---|---|
| `practices` | Praxisname, Stadt |
| `providers` | Ärzte, verknüpft mit Praxis |
| `profiles` | Auth-User ↔ Praxis |
| `delay_status` | Aktuelle Verzögerung (praxisweit oder pro Arzt) |
| `v_delay_current` | View für Patienten-App |

---

## Neue Praxis hinzufügen
```sql
INSERT INTO public.practices (name, city) VALUES ('Praxis Muster', 'Bern') RETURNING id;
INSERT INTO public.providers (practice_id, name, specialty) VALUES ('<id>', 'Dr. Meier', 'Allgemeinmedizin');
-- User in Auth anlegen, dann:
INSERT INTO public.profiles (id, practice_id, role) VALUES ('<uuid>', '<id>', 'mpa');
```

---

## Sicherheit
RLS aktiv – jeder MPA sieht/schreibt nur seine Praxisdaten.