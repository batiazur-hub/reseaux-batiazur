# Réseaux sociaux automatiques Bati Azur

Robot qui publie seul sur la page Facebook **Bati Azur Piscine** et sur
Instagram **@bati_azur03**, depuis GitHub Actions (aucun ordinateur allumé).

## Ce qui est publié

- **Chaque matin, toute l'année** (vers 7 h l'hiver, 8 h l'été) : story
  « Météo piscine » pour Moulins et le secteur, avec la filtration du jour.
  - Novembre à mars : hivernage actif, 2 h / jour de 4 h à 6 h.
  - Gel annoncé : marche forcée de la filtration.
  - En saison : durée selon la température ; canicule (≥ 33 °C) : en continu.
  - Orages : gestes après l'orage.
- À venir : réalisations (Photothèque), L'Expert, annonces du magasin.

## Réglages

- `src/config.json` : page Facebook (1106986629166023), portefeuille Meta Bati Azur.
- `src/charte.json` + `src/marque/` : charte graphique officielle et logos.
- Secret GitHub `META_TOKEN_BATIAZUR` : clé de l'utilisateur système
  « Publieur Bati Azur » (portefeuille Meta Bati Azur).

Lancer à la main : onglet Actions → « Bati Azur (publication automatique) »
→ Run workflow (case « Essai » pour préparer sans publier).
