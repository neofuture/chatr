# Test Users

50 pre-seeded test accounts for development and QA. All accounts are email-verified and phone-verified.

## Credentials

| # | Username | Display Name | Email | Password |
|---|----------|--------------|-------|----------|
| 1 | @alexmorgan | Alex Morgan | alex@test.chatr-app.online | Test@1234! |
| 2 | @jamiechen | Jamie Chen | jamie@test.chatr-app.online | Test@1234! |
| 3 | @rileyscott | Riley Scott | riley@test.chatr-app.online | Test@1234! |
| 4 | @taylorwade | Taylor Wade | taylor@test.chatr-app.online | Test@1234! |
| 5 | @jordanblake | Jordan Blake | jordan@test.chatr-app.online | Test@1234! |
| 6 | @caseyreed | Casey Reed | casey@test.chatr-app.online | Test@1234! |
| 7 | @morganfox | Morgan Fox | morgan@test.chatr-app.online | Test@1234! |
| 8 | @drewlane | Drew Lane | drew@test.chatr-app.online | Test@1234! |
| 9 | @samhayes | Sam Hayes | sam@test.chatr-app.online | Test@1234! |
| 10 | @quinnbrooks | Quinn Brooks | quinn@test.chatr-app.online | Test@1234! |
| 11 | @averycross | Avery Cross | avery@test.chatr-app.online | Test@1234! |
| 12 | @blakehunt | Blake Hunt | blake@test.chatr-app.online | Test@1234! |
| 13 | @charlieprice | Charlie Price | charlie@test.chatr-app.online | Test@1234! |
| 14 | @dakotahill | Dakota Hill | dakota@test.chatr-app.online | Test@1234! |
| 15 | @elliotjames | Elliot James | elliot@test.chatr-app.online | Test@1234! |
| 16 | @finleycross | Finley Cross | finley@test.chatr-app.online | Test@1234! |
| 17 | @graystone | Gray Stone | gray@test.chatr-app.online | Test@1234! |
| 18 | @harperquinn | Harper Quinn | harper@test.chatr-app.online | Test@1234! |
| 19 | @indigowest | Indigo West | indigo@test.chatr-app.online | Test@1234! |
| 20 | @juderivers | Jude Rivers | jude@test.chatr-app.online | Test@1234! |
| 21 | @kaistorm | Kai Storm | kai@test.chatr-app.online | Test@1234! |
| 22 | @lanefoster | Lane Foster | lane@test.chatr-app.online | Test@1234! |
| 23 | @maxturner | Max Turner | max@test.chatr-app.online | Test@1234! |
| 24 | @noelgrey | Noel Grey | noel@test.chatr-app.online | Test@1234! |
| 25 | @oakleymarsh | Oakley Marsh | oakley@test.chatr-app.online | Test@1234! |
| 26 | @paigebell | Paige Bell | paige@test.chatr-app.online | Test@1234! |
| 27 | @remyknight | Remy Knight | remy@test.chatr-app.online | Test@1234! |
| 28 | @sagemoore | Sage Moore | sage@test.chatr-app.online | Test@1234! |
| 29 | @tateward | Tate Ward | tate@test.chatr-app.online | Test@1234! |
| 30 | @umafrey | Uma Frey | uma@test.chatr-app.online | Test@1234! |
| 31 | @valecross | Vale Cross | vale@test.chatr-app.online | Test@1234! |
| 32 | @wrencolt | Wren Colt | wren@test.chatr-app.online | Test@1234! |
| 33 | @xenpage | Xen Page | xen@test.chatr-app.online | Test@1234! |
| 34 | @yalemoon | Yale Moon | yale@test.chatr-app.online | Test@1234! |
| 35 | @zaraswift | Zara Swift | zara@test.chatr-app.online | Test@1234! |
| 36 | @aceburns | Ace Burns | ace@test.chatr-app.online | Test@1234! |
| 37 | @beaustone | Beau Stone | beau@test.chatr-app.online | Test@1234! |
| 38 | @cleovance | Cleo Vance | cleo@test.chatr-app.online | Test@1234! |
| 39 | @dexholt | Dex Holt | dex@test.chatr-app.online | Test@1234! |
| 40 | @edenlake | Eden Lake | eden@test.chatr-app.online | Test@1234! |
| 41 | @flintray | Flint Ray | flint@test.chatr-app.online | Test@1234! |
| 42 | @gemlocke | Gem Locke | gem@test.chatr-app.online | Test@1234! |
| 43 | @hazecole | Haze Cole | haze@test.chatr-app.online | Test@1234! |
| 44 | @irisdane | Iris Dane | iris@test.chatr-app.online | Test@1234! |
| 45 | @jaxmercer | Jax Mercer | jax@test.chatr-app.online | Test@1234! |
| 46 | @kodapine | Koda Pine | koda@test.chatr-app.online | Test@1234! |
| 47 | @lyrabanks | Lyra Banks | lyra@test.chatr-app.online | Test@1234! |
| 48 | @milocrane | Milo Crane | milo@test.chatr-app.online | Test@1234! |
| 49 | @novaash | Nova Ash | nova@test.chatr-app.online | Test@1234! |
| 50 | @pixeldawn | Pixel Dawn | pixel@test.chatr-app.online | Test@1234! |

## Shared Account Details

| Field | Value |
|-------|-------|
| **Password** | `Test@1234!` |
| **Phone** | `+447940147138` |
| **Email domain** | `@test.chatr-app.online` |
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
