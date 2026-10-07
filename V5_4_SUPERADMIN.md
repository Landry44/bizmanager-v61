# BizManager V5.4 — Superadmin & paiements espèces

- Tarifs : Basic 7 500 FCFA/mois ; Avancé 10 000 FCFA/mois.
- Paiement en ligne désactivé pour le moment.
- Les paiements clients sont validés manuellement en espèces par le Superadmin.
- `admin@bizmanager.local` / `admin123` est Superadmin + Owner de `Mon Entreprise`.
- Espace : `/superadmin`.
- Le Superadmin peut voir les entreprises, propriétaires, utilisateurs, abonnements, dates d'échéance, et activer/suspendre/changer un abonnement.
- Chaque activation payante crée un `PaymentOrder` MANUAL/PAID et une entrée d'audit.
