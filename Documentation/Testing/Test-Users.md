# Test Users

50 pre-seeded test accounts for development and QA. All accounts are email-verified and phone-verified.

## Credentials

| # | Username | Display Name | Email | Password |
|---|----------|--------------|-------|----------|
| 1 | @alexmorgan | Alex Morgan | alex@emberlynband.com | Test@1234! |
| 2 | @jamiechen | Jamie Chen | jamie@emberlynband.com | Test@1234! |
| 3 | @rileyscott | Riley Scott | riley@emberlynband.com | Test@1234! |
| 4 | @taylorwade | Taylor Wade | taylor@emberlynband.com | Test@1234! |
| 5 | @jordanblake | Jordan Blake | jordan@emberlynband.com | Test@1234! |
| 6 | @caseyreed | Casey Reed | casey@emberlynband.com | Test@1234! |
| 7 | @morganfox | Morgan Fox | morgan@emberlynband.com | Test@1234! |
| 8 | @drewlane | Drew Lane | drew@emberlynband.com | Test@1234! |
| 9 | @samhayes | Sam Hayes | sam@emberlynband.com | Test@1234! |
| 10 | @quinnbrooks | Quinn Brooks | quinn@emberlynband.com | Test@1234! |
| 11 | @averycross | Avery Cross | avery@emberlynband.com | Test@1234! |
| 12 | @blakehunt | Blake Hunt | blake@emberlynband.com | Test@1234! |
| 13 | @charlieprice | Charlie Price | charlie@emberlynband.com | Test@1234! |
| 14 | @dakotahill | Dakota Hill | dakota@emberlynband.com | Test@1234! |
| 15 | @elliotjames | Elliot James | elliot@emberlynband.com | Test@1234! |
| 16 | @finleycross | Finley Cross | finley@emberlynband.com | Test@1234! |
| 17 | @graystone | Gray Stone | gray@emberlynband.com | Test@1234! |
| 18 | @harperquinn | Harper Quinn | harper@emberlynband.com | Test@1234! |
| 19 | @indigowest | Indigo West | indigo@emberlynband.com | Test@1234! |
| 20 | @juderivers | Jude Rivers | jude@emberlynband.com | Test@1234! |
| 21 | @kaistorm | Kai Storm | kai@emberlynband.com | Test@1234! |
| 22 | @lanefoster | Lane Foster | lane@emberlynband.com | Test@1234! |
| 23 | @maxturner | Max Turner | max@emberlynband.com | Test@1234! |
| 24 | @noelgrey | Noel Grey | noel@emberlynband.com | Test@1234! |
| 25 | @oakleymarsh | Oakley Marsh | oakley@emberlynband.com | Test@1234! |
| 26 | @paigebell | Paige Bell | paige@emberlynband.com | Test@1234! |
| 27 | @remyknight | Remy Knight | remy@emberlynband.com | Test@1234! |
| 28 | @sagemoore | Sage Moore | sage@emberlynband.com | Test@1234! |
| 29 | @tateward | Tate Ward | tate@emberlynband.com | Test@1234! |
| 30 | @umafrey | Uma Frey | uma@emberlynband.com | Test@1234! |
| 31 | @valecross | Vale Cross | vale@emberlynband.com | Test@1234! |
| 32 | @wrencolt | Wren Colt | wren@emberlynband.com | Test@1234! |
| 33 | @xenpage | Xen Page | xen@emberlynband.com | Test@1234! |
| 34 | @yalemoon | Yale Moon | yale@emberlynband.com | Test@1234! |
| 35 | @zaraswift | Zara Swift | zara@emberlynband.com | Test@1234! |
| 36 | @aceburns | Ace Burns | ace@emberlynband.com | Test@1234! |
| 37 | @beaustone | Beau Stone | beau@emberlynband.com | Test@1234! |
| 38 | @cleovance | Cleo Vance | cleo@emberlynband.com | Test@1234! |
| 39 | @dexholt | Dex Holt | dex@emberlynband.com | Test@1234! |
| 40 | @edenlake | Eden Lake | eden@emberlynband.com | Test@1234! |
| 41 | @flintray | Flint Ray | flint@emberlynband.com | Test@1234! |
| 42 | @gemlocke | Gem Locke | gem@emberlynband.com | Test@1234! |
| 43 | @hazecole | Haze Cole | haze@emberlynband.com | Test@1234! |
| 44 | @irisdane | Iris Dane | iris@emberlynband.com | Test@1234! |
| 45 | @jaxmercer | Jax Mercer | jax@emberlynband.com | Test@1234! |
| 46 | @kodapine | Koda Pine | koda@emberlynband.com | Test@1234! |
| 47 | @lyrabanks | Lyra Banks | lyra@emberlynband.com | Test@1234! |
| 48 | @milocrane | Milo Crane | milo@emberlynband.com | Test@1234! |
| 49 | @novaash | Nova Ash | nova@emberlynband.com | Test@1234! |
| 50 | @pixeldawn | Pixel Dawn | pixel@emberlynband.com | Test@1234! |

## Shared Account Details

| Field | Value |
|-------|-------|
| **Password** | `Test@1234!` |
| **Phone** | `+447940147138` |
| **Email domain** | `@emberlynband.com` |
| **Email verified** | ✅ Yes |
| **Phone verified** | ✅ Yes |

## Re-running the Seed

The seed script is idempotent — running it multiple times will update existing accounts rather than creating duplicates.

```bash
cd backend && npm run seed:users
```

Or directly:

```bash
cd backend && npx ts-node --project tsconfig.seed.json prisma/seed-test-users.ts
```
