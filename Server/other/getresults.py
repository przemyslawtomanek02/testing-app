import sqlite3


def export_table_to_txt(db_name, table_name, output_file):
    try:
        # Połączenie z bazą danych SQLite
        conn = sqlite3.connect(db_name)
        cursor = conn.cursor()

        # Pobieranie danych z tabeli z obliczeniem procentu
        cursor.execute(f"""
            SELECT 
                user_name, 
                user_surname, 
                user_index, 
                score, 
                max_score, 
                ROUND(score * 100.0 / max_score, 2) AS percentage
            FROM {table_name}
            WHERE instance_id = "01JEER179YYWBW4QCG7FF2XSM7"
        """)
        rows = cursor.fetchall()

        # Pobieranie nazw kolumn
        column_names = [description[0] for description in cursor.description]

        # Zapis do pliku tekstowego
        with open(output_file, "w", encoding="utf-8") as file:
            # Zapisanie nagłówków kolumn
            file.write("\t".join(column_names) + "\n")

            # Zapisanie danych
            for row in rows:
                file.write("\t".join(map(str, row)) + "\n")

        print(f"Dane zostały zapisane do pliku: {output_file}")

    except sqlite3.Error as e:
        print(f"Błąd podczas pracy z bazą danych: {e}")

    finally:
        if conn:
            conn.close()


# Przykład użycia
db_name = "backend.db"  # Nazwa pliku bazy danych
table_name = "UserActivity"  # Nazwa tabeli
output_file = "results.txt"  # Nazwa pliku wyjściowego

export_table_to_txt(db_name, table_name, output_file)
