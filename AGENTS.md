# Alpha - React Native Android Household Finance App

## Architectural Boundaries
- Target Platform: Android only (API 30+)
- Framework: Expo SDK 56 / React Native 0.85
- Database: Local-first SQLite (`expo-sqlite` with SQLCipher). All balances are derived dynamically from an append-only postings model.
- App state: Ephemeral UI state via Zustand.
- Currency: BDT in paisa (integer). Never use floats for money.
- Network sync: Shared authority via Supabase (Postgres RLS).

## Repository Commands
- `pnpm dev` (start dev server for Web/Local)
- `pnpm android` (run Android build)
- `pnpm build:android:release` (build release APK)

## Security Constraints
- No service-role or personal access tokens in the source code.
- Ensure all public `.env.example` configurations remain valid.
- Local auth PIN/biometrics via `expo-local-authentication` prior to sensitive operations.

## Postings Model Overview
- Accounts + Funding Pool represent logical money segregation.
- Always check that expenses don't result in negative cash balances without prompting.

## Agents Protocol
- When modifying the ledger, respect the atomicity invariants and ensure that UI elements derive totals exactly matching database values.
- Respect the "liquid-glass-inspired" design constraint on Android 12+, but gracefully fallback on Android 11.
