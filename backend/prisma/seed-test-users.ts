import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TEST_PASSWORD  = 'Vertinero2835!';
const TEST_PHONE     = '+447940147138';
const EMAIL_DOMAIN   = 'emberlynband.com';

interface UserSeed {
  username: string;
  firstName: string;
  lastName: string;
  emailPrefix: string;
}

const users: UserSeed[] = [
  { username: 'alexmorgan',   firstName: 'Alex',    lastName: 'Morgan',  emailPrefix: 'alex'    },
  { username: 'jamiechen',    firstName: 'Jamie',   lastName: 'Chen',    emailPrefix: 'jamie'   },
  { username: 'rileyscott',   firstName: 'Riley',   lastName: 'Scott',   emailPrefix: 'riley'   },
  { username: 'taylorwade',   firstName: 'Taylor',  lastName: 'Wade',    emailPrefix: 'taylor'  },
  { username: 'jordanblake',  firstName: 'Jordan',  lastName: 'Blake',   emailPrefix: 'jordan'  },
  { username: 'caseyreed',    firstName: 'Casey',   lastName: 'Reed',    emailPrefix: 'casey'   },
  { username: 'morganfox',    firstName: 'Morgan',  lastName: 'Fox',     emailPrefix: 'morgan'  },
  { username: 'drewlane',     firstName: 'Drew',    lastName: 'Lane',    emailPrefix: 'drew'    },
  { username: 'samhayes',     firstName: 'Sam',     lastName: 'Hayes',   emailPrefix: 'sam'     },
  { username: 'quinnbrooks',  firstName: 'Quinn',   lastName: 'Brooks',  emailPrefix: 'quinn'   },
  { username: 'averycross',   firstName: 'Avery',   lastName: 'Cross',   emailPrefix: 'avery'   },
  { username: 'blakehunt',    firstName: 'Blake',   lastName: 'Hunt',    emailPrefix: 'blake'   },
  { username: 'charlieprice', firstName: 'Charlie', lastName: 'Price',   emailPrefix: 'charlie' },
  { username: 'dakotahill',   firstName: 'Dakota',  lastName: 'Hill',    emailPrefix: 'dakota'  },
  { username: 'elliotjames',  firstName: 'Elliot',  lastName: 'James',   emailPrefix: 'elliot'  },
  { username: 'finleycross',  firstName: 'Finley',  lastName: 'Cross',   emailPrefix: 'finley'  },
  { username: 'graystone',    firstName: 'Gray',    lastName: 'Stone',   emailPrefix: 'gray'    },
  { username: 'harperquinn',  firstName: 'Harper',  lastName: 'Quinn',   emailPrefix: 'harper'  },
  { username: 'indigowest',   firstName: 'Indigo',  lastName: 'West',    emailPrefix: 'indigo'  },
  { username: 'juderivers',   firstName: 'Jude',    lastName: 'Rivers',  emailPrefix: 'jude'    },
  { username: 'kaistorm',     firstName: 'Kai',     lastName: 'Storm',   emailPrefix: 'kai'     },
  { username: 'lanefoster',   firstName: 'Lane',    lastName: 'Foster',  emailPrefix: 'lane'    },
  { username: 'maxturner',    firstName: 'Max',     lastName: 'Turner',  emailPrefix: 'max'     },
  { username: 'noelgrey',     firstName: 'Noel',    lastName: 'Grey',    emailPrefix: 'noel'    },
  { username: 'oakleymarsh',  firstName: 'Oakley',  lastName: 'Marsh',   emailPrefix: 'oakley'  },
  { username: 'paigebell',    firstName: 'Paige',   lastName: 'Bell',    emailPrefix: 'paige'   },
  { username: 'remyknight',   firstName: 'Remy',    lastName: 'Knight',  emailPrefix: 'remy'    },
  { username: 'sagemoore',    firstName: 'Sage',    lastName: 'Moore',   emailPrefix: 'sage'    },
  { username: 'tateward',     firstName: 'Tate',    lastName: 'Ward',    emailPrefix: 'tate'    },
  { username: 'umafrey',      firstName: 'Uma',     lastName: 'Frey',    emailPrefix: 'uma'     },
  { username: 'valecross',    firstName: 'Vale',    lastName: 'Cross',   emailPrefix: 'vale'    },
  { username: 'wrencolt',     firstName: 'Wren',    lastName: 'Colt',    emailPrefix: 'wren'    },
  { username: 'xenpage',      firstName: 'Xen',     lastName: 'Page',    emailPrefix: 'xen'     },
  { username: 'yalemoon',     firstName: 'Yale',    lastName: 'Moon',    emailPrefix: 'yale'    },
  { username: 'zaraswift',    firstName: 'Zara',    lastName: 'Swift',   emailPrefix: 'zara'    },
  { username: 'aceburns',     firstName: 'Ace',     lastName: 'Burns',   emailPrefix: 'ace'     },
  { username: 'beaustone',    firstName: 'Beau',    lastName: 'Stone',   emailPrefix: 'beau'    },
  { username: 'cleovance',    firstName: 'Cleo',    lastName: 'Vance',   emailPrefix: 'cleo'    },
  { username: 'dexholt',      firstName: 'Dex',     lastName: 'Holt',    emailPrefix: 'dex'     },
  { username: 'edenlake',     firstName: 'Eden',    lastName: 'Lake',    emailPrefix: 'eden'    },
  { username: 'flintray',     firstName: 'Flint',   lastName: 'Ray',     emailPrefix: 'flint'   },
  { username: 'gemlocke',     firstName: 'Gem',     lastName: 'Locke',   emailPrefix: 'gem'     },
  { username: 'hazecole',     firstName: 'Haze',    lastName: 'Cole',    emailPrefix: 'haze'    },
  { username: 'irisdane',     firstName: 'Iris',    lastName: 'Dane',    emailPrefix: 'iris'    },
  { username: 'jaxmercer',    firstName: 'Jax',     lastName: 'Mercer',  emailPrefix: 'jax'     },
  { username: 'kodapine',     firstName: 'Koda',    lastName: 'Pine',    emailPrefix: 'koda'    },
  { username: 'lyrabanks',    firstName: 'Lyra',    lastName: 'Banks',   emailPrefix: 'lyra'    },
  { username: 'milocrane',    firstName: 'Milo',    lastName: 'Crane',   emailPrefix: 'milo'    },
  { username: 'novaash',      firstName: 'Nova',    lastName: 'Ash',     emailPrefix: 'nova'    },
  { username: 'pixeldawn',    firstName: 'Pixel',   lastName: 'Dawn',    emailPrefix: 'pixel'   },
];

async function main() {
  console.log('🌱 Seeding 50 test users...\n');

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  let created = 0;
  let updated = 0;

  for (const u of users) {
    const username    = `@${u.username}`;
    const email       = `${u.emailPrefix}@${EMAIL_DOMAIN}`;
    const displayName = `${u.firstName} ${u.lastName}`;

    try {
      const result = await prisma.user.upsert({
        where: { username },
        create: {
          username,
          email,
          password:      passwordHash,
          firstName:     u.firstName,
          lastName:      u.lastName,
          displayName,
          phoneNumber:   TEST_PHONE,
          emailVerified: true,
          phoneVerified: true,
        },
        update: {
          email,
          password:      passwordHash,
          firstName:     u.firstName,
          lastName:      u.lastName,
          displayName,
          phoneNumber:   TEST_PHONE,
          emailVerified: true,
          phoneVerified: true,
        },
      });

      // Detect create vs update by comparing createdAt ≈ updatedAt
      const isNew = Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000;
      if (isNew) {
        console.log(`  ✅ Created  ${username.padEnd(18)} <${email}>`);
        created++;
      } else {
        console.log(`  🔄 Updated  ${username.padEnd(18)} <${email}>`);
        updated++;
      }
    } catch (err: any) {
      console.error(`  ❌ Failed   ${username}: ${err.message}`);
    }
  }

  console.log(`\n✨ Done — ${created} created, ${updated} updated out of ${users.length} users`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());


