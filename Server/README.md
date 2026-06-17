# PostgreSQL w WSL (Ubuntu/Debian) – instalacja od zera

## 1. Update systemu i instalacja
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```

## 2. Uruchomienie PostgreSQL
# WSL z systemd
```bash
sudo systemctl enable --now postgresql || true
```

# WSL bez systemd
``` bash
sudo service postgresql start
```

## 3. Wejście do psql jako postgres
```bash
sudo -u postgres psql
```

## 4. Tworzenie użytkownika i bazy danych
```sql
CREATE USER app_user WITH PASSWORD 'MOCNE_HASLO';
CREATE DATABASE app_db OWNER app_user;
\l #show databases
\q #exit
```
## 5. Test logowania
psql "postgresql://app_user:MOCNE_HASLO@localhost:5432/app_db"

## 6. Konfiguracja PostgreSQL

W pliku bazy danych edytuj dane logowania:

Server/fastapi_app/database/database.py

np:

```py
DATABASE_URL = (f"postgresql+asyncpg://electronapp:electronapp@localhost:5432/electronapp")
```

# Gotowe
