# 📋 Guide de Test - Application G.S.A

## Connexion
- **Code d'accès** : `1425`
- Tapez le code et appuyez sur Entrée (ou le code s'active automatiquement à 4 chiffres)

---

## ✅ Checklist de Test Complète

### 1️⃣ Tableau de Bord
- [ ] Les 4 cartes statistiques s'affichent (0 par défaut)
- [ ] Tableau "Inscriptions Récentes" vide au démarrage
- [ ] Horloge numérique affiche l'heure correcte
- [ ] Date affichée en français complet

### 2️⃣ Gestion Élèves
- [ ] Cliquer "Ajouter un élève"
- [ ] Remplir les champs : Prénom, Nom, Classe
- [ ] **Optionnels** : Parent, Téléphone
- [ ] Ajouter une photo (< 2MB)
- [ ] Voir l'image en prévisualisation
- [ ] Cliquer Enregistrer
- [ ] **Message** : "Élève enregistré avec succès"
- [ ] L'élève apparaît dans le tableau
- [ ] Matricule auto-généré : GSA-2026-001
- [ ] Modifier l'élève (clic crayon)
- [ ] Supprimer l'élève (clic poubelle + confirmation)

### 3️⃣ Planning Hebdomadaire
- [ ] Cliquer "Ajouter cours"
- [ ] Remplir Matière, Jour, Créneau
- [ ] **Optionnels** : Professeur, Salle
- [ ] Enregistrer
- [ ] Le cours apparaît dans le tableau planning
- [ ] Tenter l'ajouter un cours au même créneau
- [ ] **Erreur** : "Ce créneau est déjà occupé"
- [ ] Cliquer X sur un cours pour supprimer

### 4️⃣ Bulletins & Notes
- [ ] Sélectionner un élève dans la dropdown
- [ ] Voir les 7 matières affichées
- [ ] Entrer une note (0-20) pour chaque matière
- [ ] **Auto-calcul** : Colonne "Points" met à jour
- [ ] **Moyenne générale** : Se recalcule automatiquement
- [ ] Changer de trimestre (T1, T2, T3)
- [ ] Les notes changent par trimestre
- [ ] Cliquer "Enregistrer"
- [ ] **Message** : "Notes enregistrées"
- [ ] Boutton change 2s : "ENREGISTRÉ" ✓
- [ ] Clicker "Imprimer Bulletin" pour le PDF

### 5️⃣ Certificats de Scolarité
- [ ] Sélectionner un élève
- [ ] Voir la prévisualisation du certificat
- [ ] Modifier l'année scolaire
- [ ] Vérifier les données affichées
- [ ] Cliquer "Imprimer" (Ctrl+P)
- [ ] Cliquer "Exporter PDF"
- [ ] **Message** : "PDF généré et téléchargé"

### 6️⃣ Cartes Scolaires
- [ ] Sélectionner un élève
- [ ] Voir la carte avec sa photo
- [ ] Vérifier : Nom, Matricule, Classe
- [ ] Cliquer "Imprimer la carte"
- [ ] Format A6 (petit carton)

### 7️⃣ Paiements Scolarité
- [ ] Cliquer "Encaisser"
- [ ] Modal avec champs : Élève, Montant, Motif
- [ ] Sélectionner un élève
- [ ] Entrer montant (ex: 500000)
- [ ] Entrer motif (ex: Premier trimestre)
- [ ] Cliquer "Confirmer Paiement"
- [ ] **Message** : "Paiement de 500 000 GNF enregistré"
- [ ] Ligne ajoutée au tableau
- [ ] Montant formaté avec séparateurs
- [ ] Cliquer poubelle pour supprimer
- [ ] Tableau de bord MAJ automatique

### 8️⃣ Dépenses
- [ ] Cliquer "Nouvelle Dépense"
- [ ] Modal avec : Libellé, Montant, Catégorie
- [ ] Entrer "Fournitures scolaires"
- [ ] Montant : 150000
- [ ] Catégorie : "Fournitures"
- [ ] Cliquer "Valider Sortie"
- [ ] **Message** : "Dépense de 150 000 GNF enregistrée"
- [ ] Ligne ajoutée au tableau
- [ ] Montant en rouge avec tiret
- [ ] Cliquer poubelle pour supprimer

### 9️⃣ Tableau de Bord (Mise à Jour)
- [ ] Effectif Total : doit être > 0
- [ ] Recettes : somme des paiements
- [ ] Dépenses : somme des dépenses
- [ ] Solde : Recettes - Dépenses
- [ ] Tous formatés en GNF
- [ ] Récents inscrits : dernier 5 élèves

### 🔟 Responsive & Mobile
- [ ] Redimensionner la fenêtre
- [ ] Menu burger visible < 992px
- [ ] Cliquer le burger (hamburger)
- [ ] Sidebar slide in depuis la gauche
- [ ] Overlay transparent apparaît
- [ ] Cliquer overlay ferme le menu
- [ ] Tous les onglets fonctionnels

### 1️⃣1️⃣ Déconnexion
- [ ] Cliquer "Déconnexion"
- [ ] **Confirmation** : "Êtes-vous sûr?"
- [ ] Page réinitialise au login
- [ ] Données persistent (localStorage)

---

## 🔴 Cas d'Erreur à Tester

| Cas | Résultat Attendu |
|-----|------------------|
| Code PIN incorrect | Message rouge temporaire |
| Ajouter élève sans prénom | Erreur : "Champs obligatoires" |
| Note > 20 | Forcé à 20 |
| Note < 0 | Forcé à 0 |
| Montant dépense = 0 | Erreur : "Positif obligatoire" |
| Ajouter cours doublon | Erreur : "Créneau occupé" |
| Aucun élève sélectionné (notes) | Msg : "Sélectionnez un élève" |

---

## 💾 Vérification Data Persistence

1. Ajouter un élève
2. Ajouter un paiement
3. **Fermer complètement l'onglet**
4. Rouvrir le site
5. **Données doivent persistence** ✓
6. Ouvrir DevTools (F12)
7. Application → LocalStorage
8. Vérifier clés : `gsa_students`, `gsa_payments`, etc.

---

## 🖨️ Tests Impression

- [ ] Imprimer depuis Firebase (Ctrl+P)
- [ ] Vérifier qu'aucun bouton ne s'affiche
- [ ] Vérifier que les données sont complets
- [ ] Tester impression à PDF (navigateur)
- [ ] Tester export PDF JS (html2pdf)

---

## ✨ Résultat Final

Si tous les **✅** sont cochés, l'application est **100% opérationnelle**! 🎉

**Signaler tout bug** : Ouvrir DevTools (F12) → Console → voir les erreurs affichées
