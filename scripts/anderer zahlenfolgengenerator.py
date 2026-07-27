# -*- coding: utf-8 -*-
import json

"""
================================================================================
Finaler Generator für MedAT-Zahlenfolgen (v3.10 - Finales Layout)
================================================================================

Dieses Skript implementiert ein umfassendes Framework zur Generierung von 
Zahlenfolgen für den MedAT.

Wesentliche Neuerungen in dieser Version:
- **Layout-Korrektur:** Der vertikale Abstand zwischen den Aufgaben wurde
  angepasst, um exakt 5 Aufgaben pro Seite zu gewährleisten.
- **KORREKTUR für 4er-Sprünge:** 4er-Sprünge haben nun 4 unterschiedliche Startwerte,
  aber ein faires A-B-A-B-Regelmuster.
- **FINALER ANTWORTBOGEN:** Das Design wurde finalisiert, um dem MedAT-Original
  mit korrekten Abständen und Blöcken zu entsprechen.
- **Anpassung der Lösungs-Formulierung:** "Sequenz" wurde durch "Schritt" ersetzt.
- **Terminologie-Anpassung:** "Exponentiell" wurde zu "Multiplikativ" korrigiert.

Benötigte Bibliothek: reportlab
Installation: pip install reportlab
"""

import random
import os
import argparse
from itertools import cycle

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
from reportlab.lib.units import mm
from reportlab.platypus import Flowable

# ==============================================================================
# 1. KONFIGURATION
# ==============================================================================

E_IS_CORRECT_PROBABILITY = 0.20

# ==============================================================================
# 2. KLASSEN FÜR SEQUENZTYPEN
# ==============================================================================

class NumberSequence:
    def __init__(self, length=9):
        self.length = length
        self.sequence = []
        self.rule_type = "Unbekannt"
        self.solution_text = ""

    def generate(self): raise NotImplementedError
    def get_initial_sequence(self): return self.sequence[:7]
    def get_sequence_str(self): return " ".join(map(str, self.get_initial_sequence()))
    def get_missing_numbers(self): return self.sequence[7:9]
    def _ensure_no_zero_param(self, v, r): return v if v != 0 else self._ensure_no_zero_param(random.randint(*r), r)

class ArithmeticSequence(NumberSequence):
    def __init__(self, start_range, diff_range, **kwargs):
        super().__init__(**kwargs)
        self.start = random.randint(*start_range)
        self.diff = self._ensure_no_zero_param(random.randint(*diff_range), diff_range)
        self.rule_type = "Arithmetisch"
        diff_str = f"+{self.diff}" if self.diff > 0 else str(self.diff)
        self.solution_text = f"Arithmetische Folge. Die konstante Differenz ist {diff_str}."

    def generate(self):
        self.sequence = [self.start + i * self.diff for i in range(self.length)]

class MultiplicativeSequence(NumberSequence):
    def __init__(self, start_range, ratio_range, **kwargs):
        super().__init__(**kwargs)
        self.start_range, self.ratio_range = start_range, ratio_range
        self.rule_type = "Multiplikativ"

    def generate(self):
        while True:
            self.start = self._ensure_no_zero_param(random.randint(*self.start_range), self.start_range)
            self.ratio = self._ensure_no_zero_param(random.randint(*self.ratio_range), self.ratio_range)
            if self.ratio in [1, -1]: continue
            self.sequence = [self.start]
            valid = True
            for _ in range(1, self.length):
                next_val = self.sequence[-1] * self.ratio
                if abs(next_val) > 50000: valid = False; break
                self.sequence.append(int(next_val))
            if valid:
                self.solution_text = f"Multiplikative Folge. Jede nächste Zahl wird mit {self.ratio} multipliziert."
                break

class FibonacciSequence(NumberSequence):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.rule_type = "Fibonacci"
    
    def generate(self):
        start1, start2 = random.randint(1, 5), random.randint(1, 5)
        self.sequence = [start1, start2]
        while len(self.sequence) < self.length: self.sequence.append(self.sequence[-1] + self.sequence[-2])
        self.solution_text = f"Fibonacci-Folge (Start: {start1}, {start2}). Jede nächste Zahl ist die Summe der beiden vorhergehenden."

class MultiLevelSequence(NumberSequence):
    def __init__(self, start_range, op_start_range, op_diff_range, **kwargs):
        super().__init__(**kwargs)
        self.start, self.op_start, self.op_diff = random.randint(*start_range), random.randint(*op_start_range), self._ensure_no_zero_param(random.randint(*op_diff_range), op_diff_range)
        self.rule_type = "Mehrstufig (arithmetisch)"
        
    def generate(self):
        self.sequence, op_sequence = [self.start], []
        current_op_val = self.op_start
        for _ in range(1, self.length):
            op_sequence.append(current_op_val)
            self.sequence.append(self.sequence[-1] + current_op_val)
            current_op_val += self.op_diff
        op_str = ", ".join([f"+{op}" if op >= 0 else str(op) for op in op_sequence[:4]])
        op_diff_str = f"+{self.op_diff}" if self.op_diff >= 0 else str(self.op_diff)
        self.solution_text = (f"Mehrstufige Regel. Die Rechenschritte bilden eine arithmetische Folge (beginnend mit {self.op_start}, Differenz {op_diff_str}).<br/>Rechenschritte: {op_str}...")

class AlternatingOperationsSequence(NumberSequence):
    def __init__(self, start_range, operations, **kwargs):
        super().__init__(**kwargs)
        self.start_range, self.operations_config = start_range, operations
        self.rule_type = "Wechselnde Operationen"

    def generate(self):
        while True:
            self.start = random.randint(*self.start_range)
            ops, op_descriptions = [], []
            for op_type, op_range in self.operations_config:
                val = self._ensure_no_zero_param(random.randint(*op_range), op_range)
                op_map = {'add': (lambda x, v=val: x + v, f"+{val}"), 'sub': (lambda x, v=val: x - v, f"-{val}"),
                          'mul': (lambda x, v=val: x * v, f"x{val}"), 'div': (lambda x, v=val: x / v, f"÷{val}")}
                op_func, op_desc = op_map[op_type]
                ops.append(op_func); op_descriptions.append(op_desc)
            self.sequence, op_cycle, valid = [self.start], cycle(ops), True
            for _ in range(1, self.length):
                next_val = op_cycle.__next__()(self.sequence[-1])
                if isinstance(next_val, float) and next_val != int(next_val): valid = False; break
                if abs(int(next_val)) > 50000: valid = False; break
                self.sequence.append(int(next_val))
            if valid:
                self.solution_text = f"Wechselnde Operationen im Zyklus: {', '.join(op_descriptions)}."
                break

class InterleavedSequence(NumberSequence):
    def __init__(self, sub_sequence_configs, **kwargs):
        super().__init__(**kwargs)
        self.num_interleaved = len(sub_sequence_configs)
        self.rule_type = f"{self.num_interleaved}er-Sprung"
        
        self.sub_sequences = []
        if self.num_interleaved == 4:
            seq_a_conf, seq_b_conf = sub_sequence_configs[0], sub_sequence_configs[1]
            seq_a1 = seq_a_conf["class"](**{k: v for k, v in seq_a_conf.items() if k != 'class'})
            seq_b1 = seq_b_conf["class"](**{k: v for k, v in seq_b_conf.items() if k != 'class'})
            seq_a2 = seq_a_conf["class"](**{k: v for k, v in seq_a_conf.items() if k != 'class'})
            seq_b2 = seq_b_conf["class"](**{k: v for k, v in seq_b_conf.items() if k != 'class'})

            for attr in ['diff', 'ratio']:
                if hasattr(seq_a1, attr): setattr(seq_a2, attr, getattr(seq_a1, attr))
                if hasattr(seq_b1, attr): setattr(seq_b2, attr, getattr(seq_b1, attr))

            self.sub_sequences = [seq_a1, seq_b1, seq_a2, seq_b2]
        else:
            self.sub_sequences = [config["class"](**{k: v for k, v in config.items() if k != 'class'}) for config in sub_sequence_configs]

    def generate(self):
        for seq in self.sub_sequences:
            if not seq.sequence: seq.generate()
        
        self.sequence = []
        generated_length, i = 0, 0
        while generated_length < self.length:
            for j in range(self.num_interleaved):
                if i < len(self.sub_sequences[j].sequence):
                    self.sequence.append(self.sub_sequences[j].sequence[i])
                    generated_length += 1
                    if generated_length >= self.length: break
            i += 1
        
        if self.num_interleaved == 4:
            self.solution_text = (f"Verschachtelte Folgen (A-B-A-B Muster).<br/>"
                                f"<b>Schritt 1:</b> {self.sub_sequences[0].solution_text}<br/>"
                                f"<b>Schritt 2:</b> {self.sub_sequences[1].solution_text}")
        else:
            solution_parts = [f"<b>Sequenz {i+1} (jede {self.num_interleaved}. Zahl):</b> {seq.solution_text}" for i, seq in enumerate(self.sub_sequences)]
            self.solution_text = "Verschachtelte Folgen.<br/>" + "<br/>".join(solution_parts)


# ==============================================================================
# 3. FACTORY & SCHWIERIGKEITS-KONFIGURATION
# ==============================================================================

schwer_4er_pool = [
    {"class": ArithmeticSequence, "start_range": (0, 15), "diff_range": (2, 7)},
    {"class": ArithmeticSequence, "start_range": (80, 100), "diff_range": (-7, -2)},
    {"class": MultiplicativeSequence, "start_range": (1, 4), "ratio_range": (2, 3)}
]

DIFFICULTY_CONFIG = {
    "Einfach": {"types": [
        {"class": ArithmeticSequence, "start_range": (1, 20), "diff_range": (2, 10)},
        {"class": ArithmeticSequence, "start_range": (20, 50), "diff_range": (-10, -2)},
    ]},
    "Mittel": {"types": [
        {"class": ArithmeticSequence, "start_range": (-20, 40), "diff_range": (-15, 15)},
        {"class": MultiplicativeSequence, "start_range": (1, 5), "ratio_range": (2, 4)},
        {"class": FibonacciSequence},
        {"class": MultiLevelSequence, "start_range": (0, 10), "op_start_range": (1, 5), "op_diff_range": (1, 3)},
        {"class": InterleavedSequence, "sub_sequence_configs": [
            {"class": ArithmeticSequence, "start_range": (1, 10), "diff_range": (2, 10)},
            {"class": ArithmeticSequence, "start_range": (50, 60), "diff_range": (-10, -2)}
        ]},
    ]},
    "Schwer": {"types": [
        {"class": MultiplicativeSequence, "start_range": (2, 4), "ratio_range": (-4, -2)},
        {"class": MultiLevelSequence, "start_range": (-30, 30), "op_start_range": (-10, 10), "op_diff_range": (-4, 4)},
        {"class": InterleavedSequence, "sub_sequence_configs": [ # 3er Sprung
            {"class": ArithmeticSequence, "start_range": (0, 10), "diff_range": (5, 15)},
            {"class": MultiplicativeSequence, "start_range": (1, 3), "ratio_range": (2, 3)},
            {"class": ArithmeticSequence, "start_range": (80, 100), "diff_range": (-15, -5)}
        ]},
        {"class": InterleavedSequence, "sub_sequence_configs": lambda: random.sample(schwer_4er_pool, 2) * 2},
        {"class": AlternatingOperationsSequence, "start_range": (200, 400), "operations": [('div', (2, 5)), ('sub', (10, 25))]},
        {"class": AlternatingOperationsSequence, "start_range": (10, 30), "operations": [('mul', (2, 3)), ('add', (5, 15))]},
    ]}
}

class SequenceFactory:
    @staticmethod
    def create_sequence(difficulty="Mittel"):
        seq_config = random.choice(DIFFICULTY_CONFIG[difficulty]["types"])
        params = {k: v for k, v in seq_config.items() if k != 'class'}
        
        if 'sub_sequence_configs' in params and callable(params['sub_sequence_configs']):
            params['sub_sequence_configs'] = params['sub_sequence_configs']()

        instance = seq_config["class"](**params)
        instance.generate()
        return instance

# ==============================================================================
# 4. PDF-GENERIERUNG
# ==============================================================================

def generate_distractors(correct_answer, count=3):
    distractors = set()
    n1, n2 = correct_answer
    while len(distractors) < count:
        offset1, offset2 = random.randint(-5, 5) or 1, random.randint(-5, 5) or 1
        d1, d2 = n1 + offset1, n2 + offset2
        if (d1, d2) != (n1, n2) and (d1, d2) not in distractors: distractors.add((d1, d2))
    return [f"{d[0]}, {d[1]}" for d in distractors]

def generate_number_sequence_pdf(filename, num_sequences=10, difficulty="Mittel"):
    doc = SimpleDocTemplate(filename, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    story.append(Spacer(1, 2 * inch))
    story.append(Paragraph(f"MedAT - Zahlenfolgen {difficulty.upper()}", styles['h1']))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph("Zeit: 15 Minuten", styles['h2']))
    story.append(PageBreak())

    sequences_data, generated_sequences = [], set()
    
    for i in range(num_sequences):
        while True:
            seq_obj = SequenceFactory.create_sequence(difficulty)
            if seq_obj.get_sequence_str() not in generated_sequences:
                generated_sequences.add(seq_obj.get_sequence_str()); break
        
        correct_answer = seq_obj.get_missing_numbers()
        correct_answer_str = f"{correct_answer[0]}, {correct_answer[1]}"
        options = generate_distractors(correct_answer, 3)
        e_is_correct = random.random() < E_IS_CORRECT_PROBABILITY
        
        if not e_is_correct:
            options.append(correct_answer_str); random.shuffle(options)
            correct_letter = chr(ord('A') + options.index(correct_answer_str))
        else:
            random.shuffle(options); correct_letter = "E"

        sequences_data.append({"id": i + 1, "correct_letter": correct_letter, "solution_text": seq_obj.solution_text, "full_sequence": seq_obj.sequence})

        question_block = [
            Paragraph(f"<b>Aufgabe {i + 1}:</b>", styles['Normal']),
            Spacer(1, 0.05 * inch),
            Paragraph(seq_obj.get_sequence_str() + " , ___ , ___", styles['Code']),
            Spacer(1, 0.1 * inch)
        ]
        for j, opt in enumerate(options): question_block.append(Paragraph(f"<b>{chr(ord('A') + j)}:</b> {opt}", styles['Normal']))
        question_block.append(Paragraph("<b>E:</b> Keine der Antworten ist richtig.", styles['Normal']))
        # Reduzierter Abstand, damit 5 Aufgaben auf eine Seite passen
        question_block.append(Spacer(1, 0.35 * inch))
        story.append(KeepTogether(question_block))
        
        if (i + 1) % 5 == 0 and (i + 1) < num_sequences: story.append(PageBreak())

    story.append(PageBreak())

    # FZ-style Antwortbogen as a Flowable so the look matches the FZ generator exactly.
    class AnswerSheetFlowable(Flowable):
        def __init__(self, n_items, width=8.5*inch, height=11*inch):
            super().__init__()
            self.n_items = n_items
            self.width = width
            self.height = height

        def wrap(self, availWidth, availHeight):
            return (availWidth, availHeight)

        def draw(self):
            c = self.canv
            w, h = self.width, self.height
            # Title centered
            c.setFont('Helvetica-Bold', 16)
            c.drawCentredString(w/2, h - 40*mm, 'Antwortbogen')
            c.setFont('Helvetica', 12)
            start_y_ans = h - 60*mm
            # Use left margin positioning for the answer sheet content
            left_margin = 20*mm  # Standard document left margin
            for i in range(self.n_items):
                y = start_y_ans - (i * 10 * mm)
                c.drawString(left_margin, y, f"Aufgabe {i+1}:")
                # Position boxes relative to left margin
                boxes_start_x = left_margin + 40*mm  # Offset from left margin
                for j, opt in enumerate(['A','B','C','D','E']):
                    c.rect(boxes_start_x + j*20*mm, y-1, 4*mm, 4*mm, fill=0, stroke=1)
                    c.drawString(boxes_start_x + j*20*mm + 6*mm, y, opt)

    story.append(AnswerSheetFlowable(num_sequences, width=8.5*inch, height=11*inch))
    story.append(PageBreak())
    
    story.append(Paragraph("Lösungsbogen", styles['h2']))
    story.append(Spacer(1, 0.2 * inch))
    for data in sequences_data:
        solution_block = [Paragraph(f"<b>Aufgabe {data['id']}: Korrekte Antwort ist {data['correct_letter']}</b>", styles['Normal']),
                          Paragraph(f"<b>Lösungszahlen:</b> {data['full_sequence'][-2]}, {data['full_sequence'][-1]}", styles['Normal']),
                          Paragraph(f"<b>Regel:</b> {data['solution_text']}", styles['Normal']),
                          Spacer(1, 0.4 * inch)]
        story.append(KeepTogether(solution_block))

    try:
        doc.build(story); print(f"PDF '{filename}' wurde erfolgreich erstellt.")
    except Exception as e: print(f"Fehler bei der PDF-Erstellung: {e}")

# ==============================================================================
# JSON EXPORT FÜR WEBSITE
# ==============================================================================

def export_json(difficulty, num_sequences=10):
    """Exportiert Zahlenfolgen als JSON für die Next.js Website."""
    questions = []
    generated_sequences = set()
    
    for i in range(num_sequences):
        while True:
            seq_obj = SequenceFactory.create_sequence(difficulty)
            if seq_obj.get_sequence_str() not in generated_sequences:
                generated_sequences.add(seq_obj.get_sequence_str()); break
        
        correct_answer = seq_obj.get_missing_numbers()
        correct_answer_str = f"{correct_answer[0]}, {correct_answer[1]}"
        options = generate_distractors(correct_answer, 3)
        
        e_is_correct = random.random() < E_IS_CORRECT_PROBABILITY
        if e_is_correct:
            options.append("Keine der Antworten ist richtig")
            correct_letter = "e"
        else:
            replace_idx = random.randint(0, 2)
            options[replace_idx] = "Keine der Antworten ist richtig"
            correct_letter = chr(97 + replace_idx)
        
        options_list = [{"letter": chr(97 + j), "text": opt} for j, opt in enumerate(options)]
        
        question = {
            "id": f"zf_{difficulty}_{i+1}",
            "type": "number_sequence",
            "difficulty": difficulty.lower(),
            "question": seq_obj.get_sequence_str() + " ? ?",
            "options": options_list,
            "correct_answer": correct_letter,
            "correct_values": correct_answer,
            "full_sequence": seq_obj.sequence,
            "rule_type": seq_obj.rule_type,
            "explanation": seq_obj.solution_text
        }
        questions.append(question)
    
    return {
        "module": "zahlenfolgen",
        "difficulty": difficulty,
        "count": len(questions),
        "questions": questions
    }

def batch_export_json(difficulty, num_sequences, num_batches, output_dir="json_export"):
    """Exportiert mehrere JSON-Dateien."""
    os.makedirs(output_dir, exist_ok=True)
    
    for i in range(num_batches):
        data = export_json(difficulty, num_sequences)
        filename = os.path.join(output_dir, f"zf_{difficulty.lower()}_{i+1:03d}.json")
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Exported: {filename}")
    
    print(f"\nJSON export complete: {num_batches} files in '{output_dir}/'")

# ==============================================================================
# 5. AUSFÜHRUNGSPUNKT
# ==============================================================================

def main():
    print("Starte die Generierung der Zahlenfolgen-Übungen...")

    parser = argparse.ArgumentParser(description="MedAT Zahlenfolgen PDF-Generator")
    parser.add_argument("--difficulty", type=str, default="all", choices=["Einfach", "Mittel", "Schwer", "all"], help="Schwierigkeitsgrad oder 'all' für alle drei (Standard: all)")
    parser.add_argument("--num-sequences", "-n", type=int, default=10, help="Anzahl Aufgaben pro PDF (Standard: 10)")
    parser.add_argument("--batch", type=int, default=1, help="Anzahl PDFs pro Schwierigkeitsgrad (Standard: 1)")
    parser.add_argument("--output-dir", type=str, default="output", help="Ausgabeverzeichnis relativ zum Skript (Standard: output)")
    parser.add_argument("--base-name", type=str, default="MedAT_Uebung", help="Basisname der PDF-Dateien (Standard: MedAT_Uebung)")
    args = parser.parse_args()

    # Ausgabeverzeichnis sicherstellen (relativ zum Skriptpfad)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(base_dir, args.output_dir)
    try:
        os.makedirs(output_dir, exist_ok=True)
    except Exception as e:
        print(f"FEHLER: Konnte Ausgabeverzeichnis '{output_dir}' nicht erstellen: {e}")
        raise

    difficulties = ["Einfach", "Mittel", "Schwer"] if args.difficulty == "all" else [args.difficulty]

    for diff in difficulties:
        for i in range(1, args.batch + 1):
            # Dateinamen: kompatibel zu früherem Verhalten, aber mit optionaler Nummer, wenn batch>1
            if args.batch == 1 and args.difficulty != "all":
                filename = f"{args.base_name}_{diff}.pdf"
            else:
                filename = f"{args.base_name}_{diff}_{i}.pdf"
            full_path = os.path.join(output_dir, filename)
            generate_number_sequence_pdf(filename=full_path, num_sequences=args.num_sequences, difficulty=diff)

    print("\nAlle PDF-Dateien wurden generiert.")


if __name__ == "__main__":
    main()