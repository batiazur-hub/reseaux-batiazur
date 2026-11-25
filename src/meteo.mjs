// Météo piscine Bati Azur : prévisions du jour (Open-Meteo, sans clé) et conseil de filtration, toute l'année.
// Règles Bati Azur :
//  - hivernage actif (eau froide, de novembre à mars ou maximum < 12 °C) : filtration 2 h / jour, de 4 h à 6 h ;
//  - gel annoncé : marche forcée de la filtration ;
//  - en saison : durée selon la température (même calcul que la story météo publiée en juin 2026) ;
//  - alertes canicule et orage avec les gestes à faire.

export const VILLES = [
  { nom: "Moulins", lat: 46.566, lon: 3.333 },
  { nom: "Vichy", lat: 46.127, lon: 3.426 },
  { nom: "Nevers", lat: 46.990, lon: 3.159 },
  { nom: "Decize", lat: 46.828, lon: 3.461 },
];

// Codes météo WMO → texte
const CIEL = [
  [[0], "Ciel dégagé"], [[1], "Plutôt ensoleillé"], [[2], "Éclaircies"], [[3], "Couvert"],
  [[45, 48], "Brouillard"], [[51, 53, 55, 56, 57], "Bruine"], [[61, 63, 80, 81], "Pluie"], [[65, 82], "Fortes pluies"],
  [[66, 67], "Pluie verglaçante"], [[71, 73, 75, 77, 85, 86], "Neige"], [[95, 96, 99], "Orages"],
];
const ciel = (code) => (CIEL.find(([c]) => c.includes(code)) || [, "Variable"])[1];

export async function previsions(fetcher = fetch) {
  const q = new URLSearchParams({
    latitude: VILLES.map((v) => v.lat).join(","), longitude: VILLES.map((v) => v.lon).join(","),
    daily: "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
    timezone: "Europe/Paris", forecast_days: "2",
  });
  // Open-Meteo répond parfois lentement : jusqu'à 5 essais espacés.
  let d;
  for (let essai = 1; ; essai++) {
    try {
      const r = await fetcher(`https://api.open-meteo.com/v1/forecast?${q}`, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`Open-Meteo : ${r.status}`);
      d = await r.json();
      break;
    } catch (e) {
      if (essai >= 5) throw e;
      console.warn(`! météo indisponible (${e.message}), nouvel essai dans ${essai * 15} s`);
      await new Promise((ok) => setTimeout(ok, essai * 15000));
    }
  }
  const liste = Array.isArray(d) ? d : [d];
  return VILLES.map((v, i) => {
    const j = liste[i].daily;
    return { nom: v.nom, max: Math.round(j.temperature_2m_max[0]), min: Math.round(j.temperature_2m_min[0]),
      minDemain: Math.round(j.temperature_2m_min[1]), code: j.weather_code[0], pluie: j.precipitation_probability_max[0] ?? 0 };
  });
}

const h2 = (n) => `${n} h`;

/** Conseil du jour à partir de la météo de Moulins. */
export function conseil(m, date = new Date()) {
  const mois = date.getMonth() + 1;
  const gel = m.min <= 0 || m.minDemain <= 0;
  const orage = [95, 96, 99].includes(m.code);
  const hiver = [11, 12, 1, 2, 3].includes(mois) || m.max < 12;
  if (hiver) {
    return {
      type: gel ? "gel" : "hivernage",
      titre: "HIVERNAGE ACTIF", valeur: "2 h / jour", detail: "de 4 h à 6 h du matin",
      alerte: gel ? `Gel annoncé ${m.min <= 0 ? "ce matin" : "cette nuit"} : passez la filtration en marche forcée.` : null,
    };
  }
  let h = Math.max(6, Math.min(14, (m.max - 3) / 2));
  if (m.max > 30) h *= 1.2;
  if (orage || m.code >= 61) h += 2;
  h = m.max >= 33 ? 24 : Math.round(Math.min(14, h));
  const debut = h >= 24 ? 0 : Math.max(6, 12 - Math.floor(h / 2)), fin = h >= 24 ? 24 : Math.min(22, debut + h);
  const c = { type: "saison", titre: "FILTRATION CONSEILLÉE", valeur: h >= 24 ? "24 h / 24" : `${h} h / jour`, detail: h >= 24 ? "en continu pendant la canicule" : `entre ${h2(debut)} et ${h2(fin)}`, alerte: null };
  if (m.max >= 33) { c.type = "canicule"; c.alerte = "Canicule : filtrez en continu, contrôlez pH et chlore chaque soir et complétez le niveau d'eau."; }
  else if (orage) { c.type = "orage"; c.alerte = "Orages annoncés : après l'orage, videz le panier du skimmer, contrôlez le pH et filtrez 24 h si l'eau se trouble."; }
  else if (gel) { c.type = "gel"; c.alerte = "Gel annoncé cette nuit : passez la filtration en marche forcée."; }
  return c;
}

/** Données de la story météo du jour. */
export async function meteoDuJour(date = new Date(), fetcher = fetch) {
  const villes = await previsions(fetcher);
  const moulins = villes[0];
  const c = conseil(moulins, date);
  return {
    ville: "Moulins", temp: moulins.max, min: moulins.min, max: moulins.max, ciel: ciel(moulins.code), code: moulins.code,
    villes: villes.map(({ nom, min, max }) => ({ nom, min, max })), conseil: c,
  };
}

// Conseils du jour (tournent chaque jour, selon la saison) et questions pour faire réagir.
const CONSEILS = {
  hiver: [
    "En hivernage actif, un galet de chlore par mois suffit.",
    "Ne videz jamais votre piscine en hiver : l'eau protège la structure.",
    "Gardez le niveau d'eau au milieu du skimmer, même en hiver.",
    "Videz régulièrement les feuilles sur la bâche : leur poids l'abîme.",
    "Pompe, filtre, électrolyseur : un coup d'œil au local technique une fois par mois évite les surprises.",
    "Avec un électrolyseur qui se coupe seul en eau froide, l'hivernage actif devient presque sans entretien.",
  ],
  saison: [
    "Le pH idéal se situe entre 7,0 et 7,4 : au-delà, le chlore perd de son efficacité.",
    "Videz le panier du skimmer chaque semaine, plus souvent après le vent.",
    "Brossez parois et ligne d'eau une fois par semaine pour éviter les dépôts.",
    "Ajoutez le pH par petites doses, diluées dans un seau, devant les refoulements.",
    "Après une grosse baignade, un peu plus de filtration aide l'eau à rester claire.",
    "Une eau qui verdit ? Brossez, corrigez le pH, traitez puis filtrez 24 h.",
  ],
};
const QUESTIONS = {
  hiver: [
    "Et vous, hivernage actif ou passif ?",
    "Votre piscine passe l'hiver bâchée ou à découvert ?",
    "Qui a déjà remis sa piscine en route au printemps avec une eau parfaite ?",
  ],
  saison: [
    "Combien d'heures tourne votre filtration en ce moment ?",
    "Votre eau est à combien de degrés aujourd'hui ?",
    "Première baignade de la saison, c'est fait ?",
  ],
};
const ACCROCHE = {
  gel: "❄️ Gel annoncé : protégez votre piscine",
  canicule: "🔥 Canicule : votre piscine a besoin de vous",
  orage: "⛈️ Orages annoncés : les bons réflexes pour votre piscine",
  hivernage: "💧 Météo piscine du jour",
  saison: "☀️ Météo piscine du jour",
};

export function legendeMeteo(m, date = new Date()) {
  const saison = m.conseil.titre === "HIVERNAGE ACTIF" ? "hiver" : "saison";
  const jourAn = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 864e5);
  const conseilJour = CONSEILS[saison][jourAn % CONSEILS[saison].length];
  const question = QUESTIONS[saison][jourAn % QUESTIONS[saison].length];
  const villes = m.villes.map((v) => `${v.nom} ${v.max}°`).join(" · ");
  const lignes = [
    `${ACCROCHE[m.conseil.type] || ACCROCHE.saison} — ${m.max}°C à Moulins, ${m.ciel.toLowerCase()}.`,
    "",
    m.conseil.alerte ? `👉 ${m.conseil.alerte}\n` : null,
    `${saison === "hiver" ? "Hivernage actif" : "Filtration conseillée"} aujourd'hui : ${m.conseil.valeur}, ${m.conseil.detail}.`,
    "",
    `💡 Le conseil du jour : ${conseilJour}`,
    "",
    `📍 ${villes}`,
    "",
    `${question} Dites-le-nous en commentaire 👇`,
    "",
    "Bati Azur, votre pisciniste à Avermes · 04 70 34 21 96",
    "#piscine #meteo #Moulins #Allier #Vichy #Nevers #Decize #batiazur",
  ];
  return lignes.filter((l) => l !== null).join("\n");
}
