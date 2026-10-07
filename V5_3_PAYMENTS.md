# BizManager V5.3 — Paiements

Cette version ajoute une couche de commandes de paiement et de webhooks idempotents.

## Important
Le fournisseur `GENERIC` est volontairement un adaptateur de développement : il **ne prélève aucun argent réel**. Avant la production, il faut brancher un prestataire officiellement disponible au pays ciblé, avec ses clés, sa documentation et sa vérification de signature.

## Variables
`PAYMENT_WEBHOOK_SECRET` doit être défini en production.

## Flux
1. Owner/Admin choisit Business ou Enterprise.
2. `POST /api/companies/:companyId/subscription/payment` crée une commande.
3. Le prestataire réel retournera un identifiant externe / checkout.
4. Son webhook appelle `/api/payments/webhook`.
5. La signature HMAC est vérifiée.
6. Le webhook est idempotent : une commande déjà `PAID` n'est pas retraitée.
7. L'abonnement est activé automatiquement et un audit est enregistré.
