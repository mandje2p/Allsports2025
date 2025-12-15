# Guide de Configuration de l'Intégration Stripe pour les Abonnements

Ce guide vous aidera à configurer les abonnements Stripe pour l'application AllSports avec le système basé sur les crédits.

## 📋 Vue d'ensemble

Le système d'abonnement implémente :
- **Plan Gratuit** : €0 - 0 crédit
- **Plan Basique** : €70/mois - 50 crédits/mois
- **Plan Pro** : €60/mois (engagement 1 an) - 100 crédits/mois
- **Plan Premium** : €598/an - 200 crédits/mois (réinitialisation mensuelle)

Les crédits sont réinitialisés **UNIQUEMENT** lorsque la facture Stripe est payée (webhook `invoice.paid` avec `billing_reason === 'subscription_cycle'`).

## 🔑 Variables d'Environnement Requises

### Backend (fichier .env à la racine du projet)

```env
# Configuration Stripe
STRIPE_SECRET_KEY=sk_test_...  # Votre clé secrète Stripe (test ou production)
STRIPE_WEBHOOK_SECRET=whsec_...  # Secret de signature webhook depuis le tableau de bord Stripe

# URL Frontend (pour les redirections)
FRONTEND_URL=http://localhost:5173  # Votre URL frontend
```

### Frontend (fichier .env à la racine du projet)

```env
# Clé Publique Stripe (optionnelle, si nécessaire pour de futures fonctionnalités)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# IDs de Prix Stripe (depuis votre tableau de bord Stripe)
VITE_STRIPE_PRICE_BASIC=price_xxxxx  # ID du prix mensuel du plan Basique
VITE_STRIPE_PRICE_PRO=price_xxxxx    # ID du prix mensuel du plan Pro
VITE_STRIPE_PRICE_PREMIUM=price_xxxxx # ID du prix annuel du plan Premium

# URL de l'API Backend
VITE_API_BASE_URL=http://localhost:3001
```

## 🛠️ Configuration du Tableau de Bord Stripe

### Étape 1 : Créer les Produits et Prix

1. Allez sur [Tableau de Bord Stripe](https://dashboard.stripe.com) → **Produits**
2. Créez des produits pour chaque plan :

#### Plan Basique (Mensuel)
- **Nom** : Plan Basique
- **Prix** : €70,00
- **Période de facturation** : Mensuelle
- **Récurrent** : Oui
- **Métadonnées** : Ajoutez `plan: BASIC`

#### Plan Pro (Mensuel)
- **Nom** : Plan Pro
- **Prix** : €60,00
- **Période de facturation** : Mensuelle
- **Récurrent** : Oui
- **Métadonnées** : Ajoutez `plan: PRO`

#### Plan Premium (Annuel)
- **Nom** : Plan Premium
- **Prix** : €598,00
- **Période de facturation** : Annuelle
- **Récurrent** : Oui
- **Métadonnées** : Ajoutez `plan: PREMIUM`

3. **Copiez les IDs de Prix** (ils commencent par `price_`) et ajoutez-les à votre fichier `.env` frontend.

### Étape 2 : Configurer le Point de Terminaison Webhook

1. Allez dans **Développeurs** → **Webhooks** → **Ajouter un point de terminaison**
2. **URL du point de terminaison** : `https://votre-url-backend.com/api/subscriptions/webhook`
   - Pour les tests locaux, utilisez [Stripe CLI](https://stripe.com/docs/stripe-cli) ou [ngrok](https://ngrok.com)
3. **Événements à écouter** :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid` ⭐ **CRITIQUE** - C'est ici que les crédits sont réinitialisés
   - `invoice.payment_failed`

4. **Copiez le Secret de Signature Webhook** (commence par `whsec_`) et ajoutez-le à votre fichier `.env` backend.

### Étape 3 : Mettre à Jour le Mapping des Prix dans le Backend

Dans `backend/index.js`, mettez à jour la fonction `getPlanFromPriceId` avec vos IDs de prix réels :

```javascript
const getPlanFromPriceId = (priceId) => {
  const priceToPlan = {
    'price_basic_monthly': 'BASIC',      // Remplacez par votre ID de prix réel
    'price_pro_monthly': 'PRO',          // Remplacez par votre ID de prix réel
    'price_premium_annual': 'PREMIUM'    // Remplacez par votre ID de prix réel
  };
  return priceToPlan[priceId] || 'FREE';
};
```

Alternativement, vous pouvez utiliser les métadonnées de prix Stripe pour stocker le nom du plan, ce qui est plus flexible.

## 🧪 Tests avec Stripe CLI

Pour le développement local, utilisez Stripe CLI pour transférer les webhooks :

```bash
# Installer Stripe CLI
# https://stripe.com/docs/stripe-cli

# Se connecter
stripe login

# Transférer les webhooks vers le serveur local
stripe listen --forward-to localhost:3001/api/subscriptions/webhook

# Cela vous donnera un secret de signature webhook (whsec_...)
# Ajoutez-le à votre fichier .env comme STRIPE_WEBHOOK_SECRET
```

## 🔄 Fonctionnement de la Réinitialisation des Crédits

### La Règle d'Or
**Les crédits sont réinitialisés UNIQUEMENT lorsque le webhook `invoice.paid` est reçu avec `billing_reason === 'subscription_cycle'`**

### Flux :
1. L'utilisateur s'abonne → `checkout.session.completed` → Abonnement créé dans Firestore
2. Cycle de facturation mensuel → Stripe envoie `invoice.paid` avec `billing_reason: 'subscription_cycle'`
3. Le backend vérifie :
   - ✅ La facture est pour un cycle d'abonnement (pas une mise à niveau/prorata)
   - ✅ La facture n'a pas été traitée auparavant (protection contre la double réinitialisation)
   - ✅ L'utilisateur a un abonnement actif
4. Les crédits sont réinitialisés à la limite du plan :
   - Basique : 50 crédits
   - Pro : 100 crédits
   - Premium : 200 crédits (réinitialisation mensuelle même si c'est annuel)

### Gestion Spéciale du Plan Premium
Le plan Premium est annuel mais les crédits sont réinitialisés mensuellement. Le système :
- Vérifie si 30 jours se sont écoulés depuis la dernière réinitialisation
- Réinitialise les crédits mensuellement basé sur le temps, pas seulement sur les événements de facture

## 🗄️ Collections Firestore

### `subscriptions/{userId}`
```javascript
{
  userId: string,
  stripeSubscriptionId: string,
  plan: 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM',
  status: 'active' | 'past_due' | 'canceled' | 'unpaid',
  currentPeriodStart: Timestamp,
  currentPeriodEnd: Timestamp,
  lastInvoiceId: string,  // Empêche la double réinitialisation
  updatedAt: Timestamp
}
```

### `credit_balance/{userId}`
```javascript
{
  monthlyCredits: number,      // Limite du plan (50/100/200)
  usedCredits: number,         // Crédits utilisés cette période
  remainingCredits: number,     // Crédits disponibles
  periodStart: Timestamp,       // Début de la période actuelle
  periodEnd: Timestamp,         // Fin de la période actuelle
  updatedAt: Timestamp
}
```

## 🔒 Notes de Sécurité

1. **Vérification des Webhooks** : Vérifiez toujours les signatures des webhooks en utilisant `STRIPE_WEBHOOK_SECRET`
2. **Protection contre la Double Réinitialisation** : Utilise `lastInvoiceId` pour empêcher le traitement de la même facture deux fois
3. **Déduction des Crédits** : Utilise des transactions Firestore pour des opérations atomiques
4. **Vérification du Statut d'Abonnement** : La génération est bloquée si le statut n'est pas `active`

## 🚨 Notes Importantes

1. **Pas d'Accumulation de Crédits** : Les crédits ne se cumulent pas. Les crédits non utilisés sont perdus à la fin de la période.
2. **Paiement Requis** : Pas de paiement = pas de crédits. Le statut doit être `active` pour générer.
3. **Réinitialisation Mensuelle Premium** : Même si Premium est annuel, les crédits sont réinitialisés mensuellement (intervalles de 30 jours).
4. **Engagement Pro** : L'engagement d'un an est actuellement géré dans l'interface utilisateur/portail client. Vous pouvez vouloir ajouter une application côté serveur.

## 📝 Prochaines Étapes

1. ✅ Configurer les produits et prix Stripe
2. ✅ Configurer le point de terminaison webhook
3. ✅ Ajouter les variables d'environnement
4. ✅ Mettre à jour les IDs de prix dans le backend
5. ✅ Tester avec les cartes de test Stripe
6. ✅ Vérifier la réinitialisation des crédits lors du paiement de la facture
7. ✅ Tester l'annulation d'abonnement
8. ✅ Tester la rétrogradation Premium → Pro (lorsqu'implémentée)

## 🧪 Cartes de Test

Utilisez les cartes de test Stripe pour les tests :
- **Succès** : `4242 4242 4242 4242`
- **Refus** : `4000 0000 0000 0002`
- **3D Secure** : `4000 0025 0000 3155`

Date d'expiration : Toute date future  
CVC : N'importe quels 3 chiffres  
Code postal : N'importe quels 5 chiffres

## 📞 Support

Pour les problèmes spécifiques à Stripe, consultez :
- [Documentation Stripe](https://stripe.com/docs)
- [Référence API Stripe](https://stripe.com/docs/api)
- [Guide des Webhooks Stripe](https://stripe.com/docs/webhooks)




