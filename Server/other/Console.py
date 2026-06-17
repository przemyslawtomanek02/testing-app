import re
from docx import Document
import json

# Funkcja do przekształcenia zawartości DOCX na wymagany format JSON
def docx_to_json(docx_file):
    doc = Document(docx_file)
    data = []
    question = ""
    answers = []
    correct_answer = 5

    for para in doc.paragraphs:
        print(f"Parsing paragraph: {para.text}")  # Debugowanie: sprawdzamy każdy paragraf

        # Jeśli paragraf jest pusty, pomijamy go
        if not para.text.strip():
            continue

        # Rozpoznawanie pytań
        question_text = para.text.splitlines()[0].strip() if para.text else ""
        print(f"Identified question: {question_text}")  # Debugowanie
        if question_text.endswith("."):
            question = question_text.split(".", 1)[1].strip()  # Usuwamy część przed kropką, w tym kropkę
            print("added question")
        else:
            question = question_text

        answers = []
        print(f"Initial answers list: {answers}")  # Debugowanie

        # Iteracja po kolejnych trzech liniach w paragrafie w celu identyfikacji odpowiedzi
        for i in range(1, 4):
                option = para.text.splitlines()[i].strip() if para.text else ""
                print(f"Identified answer line: {option}")  # Debugowanie
                if option.startswith("A)") or option.startswith("B)") or option.startswith("C)"):
                    # Usuwamy pierwsze 3 znaki (np. "A)", "B)", "C)") oraz dodatkowe spacje
                    answer_text = re.sub(r'^[A-C]\)\s*', '', option).strip()
                    print(f"Cleaned answer: {answer_text}")  # Debugowanie
                    answers.append(answer_text)
                    print("answer appended")

        print(f"Final answers list: {answers}")  # Debugowanie

        correct_answer_line = para.text.splitlines()[4].strip() if para.text else ""
        # Rozpoznawanie poprawnej odpowiedzi
        if correct_answer_line.startswith("Poprawna odpowiedź:"):
            print(f"Identified correct answer line: {correct_answer_line}")  # Debugowanie

            if correct_answer_line == "Poprawna odpowiedź: A":
                correct_answer = 0
            elif correct_answer_line == "Poprawna odpowiedź: B":
                correct_answer = 1
            elif correct_answer_line == "Poprawna odpowiedź: C":
                correct_answer = 2

            # Dodajemy do testu poprawną odpowiedź
            if question and len(answers) == 3 and correct_answer is not None:
                current_test = {
                    "question": question,
                    "answers": answers,
                    "correct": correct_answer
                }
                print(f"Adding test: {current_test}")  # Debugowanie
                data.append(current_test)

            # Resetowanie zmiennych po dodaniu testu
            question = None
            answers = []
            correct_answer = None

    # Zwracamy wynik w formacie JSON
    return json.dumps(data, indent=4)


# Przykład użycia
docx_file = "C:\\Users\\Komputer\\Desktop\\testy.docx"
json_data = docx_to_json(docx_file)

# Zapisz wynik do pliku JSON
with open("output.json", "w") as json_file:
    json_file.write(json_data)

print("Plik JSON został zapisany.")
