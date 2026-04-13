# 🌐 Guide Déploiement & Bonnes Pratiques

## 🚀 Déploiement de l'Application

### 1. **Sur un Serveur Web**

```bash
# Copier le fichier index.html sur votre serveur web
# Exemple : /var/www/gsa/index.html

# Accès : https://votre-domaine.com/index.html
```

### 2. **Localement (Développement)**

```bash
# Option 1 : Double-clic sur le fichier
# ⚠️ Limitations localStorage en file://

# Option 2 : Serveur Python (recommandé)
python -m http.server 8000

# Option 3 : Node.js (http-server)
npx http-server
```

### 3. **Hébergement Cloud**

| Plateforme | Installation |
|-----------|--------------|
| **Netlify** | Drag & drop le dossier du projet |
| **GitHub Pages** | Push dans repo + enable Pages |
| **Vercel** | Import project + auto-deploy |
| **Firebase Hosting** | `firebase deploy` |

### 4. **Publication Netlify (Recommandé)**

#### Option A: Déploiement rapide (sans CLI)
1. Ouvrir Netlify et se connecter.
2. Aller sur Sites puis Add new site.
3. Choisir Deploy manually.
4. Glisser-déposer le dossier du projet (ou le fichier zip puis extraire localement avant upload).

#### Option B: Déploiement avec GitHub (auto-déploiement)
1. Pousser le projet sur GitHub.
2. Dans Netlify, choisir Add new site -> Import an existing project.
3. Sélectionner le dépôt.
4. Build command: laisser vide.
5. Publish directory: `.`
6. Lancer Deploy site.

#### Option C: Déploiement via CLI Netlify
```bash
npm i -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

Le projet contient déjà un fichier `netlify.toml` prêt pour Netlify.

---

## 🔐 Sécurité

### ⚠️ Avertissements

- ❌ **Ne pas** : Utiliser en production sans HTTPS
- ❌ **Ne pas** : Changer le PIN sans raison
- ❌ **Ne pas** : Stocker données sensibles en localStorage

### ✅ Recommandations

- ✅ **HTTPS obligatoire** en production
- ✅ **Backup localStorage** hebdomadaire
- ✅ **Mot de passe fort** pour l'accès admin
- ✅ **Accès restreint** aux administrateurs

### 🔄 Changer le Code PIN

Dans le fichier **app.js** :
```javascript
const ACCESS_CODE = "1425";  // Changer ici
```

Modifier en :
```javascript
const ACCESS_CODE = "1524";  // Code actuel
```

---

## 📦 Architecture des Données

### LocalStorage Structure

```json
{
  "gsa_students": [
    {
      "id": 1712345678901,
      "matricule": "GSA-2026-001",
      "firstname": "Jean",
      "lastname": "Dupont",
      "class": "6ème",
      "parent": "Mrs. Dupont",
      "phone": "+224 620 123456",
      "photo": "data:image/jpeg;base64,...",
      "date": "2026-04-07T10:30:00.000Z"
    }
  ],
  "gsa_payments": [
    {
      "date": "2026-04-07T10:30:00.000Z",
      "studentName": "Jean Dupont",
      "matricule": "GSA-2026-001",
      "amount": 500000,
      "motif": "Scolarité T1"
    }
  ],
  "gsa_expenses": [
    {
      "date": "2026-04-07T10:30:00.000Z",
      "label": "Fournitures",
      "cat": "Fournitures",
      "amount": 150000
    }
  ],
  "gsa_schedule": [
    {
      "id": 1712345678901,
      "subject": "Mathématiques",
      "day": "Lundi",
      "time": "08:00 - 10:00",
      "prof": "M. Traore",
      "room": "Salle 04"
    }
  ],
  "gsa_notes_1712345678901_T1": [8, 9, 7...],
  "gsa_notes_1712345678901_T2": [7, 8, 8...]
}
```

---

## 🛠️ Maintenance & Troubleshooting

### 📋 Checklist Maintenance

- [ ] **Hebdomadaire** : Vérifier pas d'erreurs (F12 console)
- [ ] **Mensuel** : Backup les données
- [ ] **Trimestriel** : Nettoyer anciennes notes
- [ ] **Annuellement** : Audit sécurité

### 🐛 Problèmes Courants

| Problème | Solution |
|----------|----------|
| Données disparues | Vérifier localStorage (DevTools) |
| Photos ne chargent pas | Vérifier taille < 2MB |
| Notes ne sauvegardent pas | Vérifier localStorage activé |
| Sidebar non visible | F5 pour rafraîchir |
| Modal ne ferme pas | Clic sur X ou Esc |

### 🔍 Déboguer

```javascript
// Ouvrir la console (F12)

// Voir toutes les données
JSON.parse(localStorage.getItem('gsa_students'))

// Effacer une clé
localStorage.removeItem('gsa_students')

// Effacer tout
localStorage.clear()
```

---

## 📊 Statistiques & Rapports

### Générer un Rapport Mensuel

**Via la Console Navigateur :**
```javascript
// Paiements du mois courant
const payments = JSON.parse(localStorage.getItem('gsa_payments'));
const thisMonth = payments.filter(p => {
  const pDate = new Date(p.date);
  const now = new Date();
  return pDate.getMonth() === now.getMonth();
});
const total = thisMonth.reduce((s, p) => s + p.amount, 0);
console.log(`Total ${new Date().toLocaleString('fr-FR', {month:'long'})}: ${total.toLocaleString()} GNF`);
```

---

## 🎯 Optimisations Futures

### À Ajouter (v2.0)
- [ ] Backend Node.js + MongoDB
- [ ] Authentification JWT
- [ ] Sauvegarde cloud automatique
- [ ] Rapports PDF multi-élèves
- [ ] Graphiques statistiques
- [ ] SMS notifs parents
- [ ] Email automatiques

### Améliorations UI/UX
- [ ] Dark mode
- [ ] Édition en masse d'élèves
- [ ] Import CSV
- [ ] Statistiques par classe
- [ ] Calendrier interactif

---

## 💾 Sauvegarde & Restauration

### Sauvegarder les Données

```javascript
// Via Console
const allData = {
  students: localStorage.getItem('gsa_students'),
  payments: localStorage.getItem('gsa_payments'),
  expenses: localStorage.getItem('gsa_expenses'),
  schedule: localStorage.getItem('gsa_schedule')
};
console.log(JSON.stringify(allData, null, 2));
// Copier-coller dans un fichier backup.json
```

### Restaurer les Données

```javascript
// Via Console (charger depuis backup.json)
const backup = {...}; // Coller le contenu du backup
Object.entries(backup).forEach(([key, val]) => {
  if(val) localStorage.setItem(key, val);
});
location.reload();
```

---

## 📞 Support Technique

### Développeur

© Ibrahima Garki Diallo — Développeur  
📧 garkidi3@gmail.com  
📞 +32 466 05 37 45

### Avant de Contacter Support

1. ✅ Vider le cache (Ctrl+Shift+Supp)
2. ✅ Rafraîchir (F5)
3. ✅ Vérifier console (F12)
4. ✅ Tester sur autre navigateur
5. ✅ Vérifier localStorage actif

### Infos à Fournir

- Navigateur + version
- OS (Windows/Mac/Linux)
- Erreur exacte (copier-coller console)
- Étapes pour reproduire

---

## 📝 Changelog

### v1.0 (2026-04-07) ✨ Optimisation Complète
- ✅ CSS complet et animations
- ✅ Validation robuste formulaires
- ✅ Gestion erreurs complète
- ✅ Messages utilisateur clairs
- ✅ Suppression sécurisée
- ✅ Formatage dates français
- ✅ LocalStorage persistant
- ✅ Responsive design

### v0.1 (Initial Release)
- Structure HTML + Bootstrap
- Fonctionnalités basiques

---

**Application Prête pour Production ✅**

Développeur : G.S.A Team  
Dernière mise à jour : 7 avril 2026
