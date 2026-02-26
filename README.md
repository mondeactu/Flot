# 🚛 Flot — Gestion de flotte

Système interne de gestion de flotte pour **Saveurs & Vie** (saveursetvie.fr).

## Architecture

| Couche | Technologie |
|--------|-------------|
| App mobile | React Native + Expo SDK 51 + Expo Router v3 |
| Panel admin web | React 18 + Vite + TailwindCSS |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) |
| OCR | Google Cloud Vision API |
| État | Zustand |
| Charts | Recharts |
| Export Excel | SheetJS |
| Export PDF | jsPDF + autoTable |

## Installation

### 1. Base de données Supabase

Exécuter `supabase/migrations/001_initial.sql` dans le SQL Editor de Supabase.

### 2. Buckets Storage

Créer 4 buckets privés dans Supabase Storage :
- `receipts`
- `cleanings`
- `incidents`
- `documents`

### 3. Edge Functions

Déployer les deux fonctions :
```bash
supabase functions deploy check-alerts
supabase functions deploy admin-actions
```

### 4. Variables d'environnement

#### Mobile (`mobile/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=<votre url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<votre clé anon>
EXPO_PUBLIC_GOOGLE_VISION_API_KEY=<votre clé Vision>
EXPO_PUBLIC_PROJECT_ID=<votre project id Expo>
```

#### Admin (`admin/.env`)
```
VITE_SUPABASE_URL=<votre url>
VITE_SUPABASE_ANON_KEY=<votre clé anon>
VITE_SUPABASE_SERVICE_ROLE_KEY=<votre clé service role>
```

### 5. Lancer en local

```bash
# Panel admin
cd admin && npm install && npm run dev

# App mobile
cd mobile && npm install && npx expo start
```

### 6. Déployer le panel admin sur Vercel

```bash
cd admin && vercel --prod
```

### 7. Premier lancement

1. Ouvrir le panel admin → `/setup`
2. Créer le compte administrateur
3. Distribuer l'app mobile aux conducteurs via QR code Expo

## Structure du projet

```
Flot/
├── mobile/          # App React Native (Expo)
├── admin/           # Panel web (Vite + React + Tailwind)
├── supabase/        # Migrations, Edge Functions, Seed
└── README.md
```
