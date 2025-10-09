// src/scenario.ts
export type MissionScenario = {
  introTitle: string;
  intro: string[];
  objectives: string[];
  debriefTitle: string;
  debrief: string[];
};

export const scenarios: Record<number, MissionScenario> = {
  // Mission 1 (ex: Premiers secours)
  1: {
    introTitle: "Briefing — Urgence premiers secours",
    intro: [
      "Un patient présente une détresse potentielle (saignement/brûlure/étouffement).",
      "Votre objectif : appliquer les bons réflexes en un minimum de temps.",
      "Chaque énigme valide une étape clé (quiz, code, glisser-déposer, schéma).",
    ],
    objectives: [
      "Identifier le bon geste face au saignement abondant",
      "Réagir à une brûlure / à un étouffement",
      "Reconnaître un AVC (test FAST)",
      "Associer symptômes → actions",
    ],
    debriefTitle: "Débrief — Ce qu’il faut retenir",
    debrief: [
      "Saignement : compression directe + alerte.",
      "Brûlure : refroidir 10–20 min à l’eau, protéger, pas de corps gras.",
      "Étouffement : claques dorsales puis compressions abdominales si besoin.",
      "AVC : FAST (Face-Arm-Speech) → appeler le 112 sans délai.",
    ],
  },

  // Mission 2 (Hygiène & prévention — tu viens de la créer)
  2: {
    introTitle: "Briefing — Hygiène & prévention des infections",
    intro: [
      "Vous intervenez dans un service où circulent des agents infectieux.",
      "Votre rôle : casser les chaînes de transmission par de bons réflexes.",
    ],
    objectives: [
      "Connaître les 5 moments OMS de l’hygiène des mains",
      "Choisir le bon EPI selon le risque",
      "Gérer les DASRI / déchets",
      "Réaliser une friction SHA efficace",
    ],
    debriefTitle: "Débrief — Points clés",
    debrief: [
      "SHA sur mains non souillées (20–30 s) ; lavage si mains sales.",
      "EPI : adapter au risque (gouttelettes, aérosols, projections).",
      "Déchets : tri / conditionnement / collecte / traitement.",
      "Friction SHA : enchaînement des zones pour couvrir toute la main.",
    ],
  },
};
