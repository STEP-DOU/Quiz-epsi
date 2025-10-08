# Exemple de logique simple pour le niveau 1 : Diagnostic rapide

def play_diagnostic_rapide(answer: str) -> dict:
    """
    Évalue la réponse du joueur et retourne le résultat.
    """
    correct_answer = "infection respiratoire"
    score = 0

    if answer.lower().strip() == correct_answer:
        score = 100
        result = "Bravo ! Diagnostic correct. Le patient est sauvé. 🚑"
    else:
        score = 40
        result = "Diagnostic partiel, le patient est stabilisé mais pas guéri."

    return {
        "score": score,
        "result": result
    }
