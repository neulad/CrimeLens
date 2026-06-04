import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

const CRIME_TYPES = ['pickpocketing', 'bicycle_stolen', 'street_fight', 'robbery', 'street_scams'] as const;

const DESCRIPTIONS: Record<string, string[]> = {
  pickpocketing: [
    'Wallet lifted from jacket pocket on crowded metro platform.',
    'Phone stolen from hand while distracted by someone asking for directions.',
    'Bag unzipped and valuables removed while standing in tourist queue.',
    'Credit cards taken from back pocket near city centre market.',
    'Phone snatched from outside jacket pocket on busy tram.',
    'Wallet removed from bag zip during rush hour on bus.',
    'Tourist had camera stolen from open bag at popular viewpoint.',
    'Cards and cash lifted from front pocket near cathedral.',
    'Pickpocket worked in pair — one bumped victim, other took wallet.',
    'Phone taken from hand while victim was photographing landmark.',
  ],
  bicycle_stolen: [
    'Bicycle cut free from post with angle grinder in broad daylight.',
    'Locked bike disappeared overnight from residential street.',
    'E-bike stolen from outside supermarket, lock was cut.',
    'Racing bike taken from communal bike rack in apartment building.',
    'Bike stolen within minutes of being left outside café.',
    'Two bikes taken from locked courtyard, fence was cut.',
    'Folding bike snatched from train station bike rack.',
    'Bike disappeared from outside gym despite heavy-duty lock.',
    'Cargo bike stolen from loading bay, CCTV footage unclear.',
    'Bike taken during peak shopping hours from high street.',
  ],
  street_fight: [
    'Altercation outside bar escalated into brawl, police called.',
    'Group fight broke out near nightclub at closing time.',
    'Argument over parking ended in physical assault.',
    'Two men fought near the central square, one hospitalised.',
    'Football fans clashed near stadium after the match.',
    'Fight broke out in fast food restaurant queue late night.',
    'Domestic dispute spilled into street, neighbours called police.',
    'Brawl between groups near the river embankment.',
    'Assault outside convenience store caught on CCTV.',
    'Fight erupted at taxi rank in early hours of morning.',
  ],
  robbery: [
    'Victim threatened at knifepoint and forced to hand over phone and wallet.',
    'Muggers followed victim from ATM and demanded cash.',
    'Bag snatched by moped riders at traffic lights.',
    'Tourist surrounded by group and wallet forcibly taken.',
    'Victim grabbed from behind, jewellery ripped off.',
    'Man threatened with bottle and robbed of phone near park.',
    'Woman pushed to ground and bag grabbed by fleeing thief.',
    'Robbery at ATM — attacker waited until cash was withdrawn.',
    'Phone snatched while victim was on call at bus stop.',
    'Victim followed from nightclub and mugged in side street.',
  ],
  street_scams: [
    'Fake petition collectors distracted victim while accomplice took wallet.',
    'Shell game scam near tourist square — lost €200.',
    'Stranger offered "found" gold ring worth nothing, demanded reward.',
    'Bogus charity collectors took cash and personal details.',
    'Taxi driver took extreme detour and charged triple the fare.',
    'Friendship bracelet tied on wrist then aggressive payment demanded.',
    'Three-card trick on pavement, victim lost €150.',
    'Street vendor sold fake designer goods, refused refund.',
    'Someone "spilled" on victim, accomplice picked their pocket during clean-up.',
    'Fake police officers demanded to check wallet for "counterfeit notes".',
  ],
};

const CITIES = [
  { name: 'London',       country: 'UK',          lat: 51.5074, lng: -0.1278,  spread: 0.06 },
  { name: 'Paris',        country: 'France',       lat: 48.8566, lng:  2.3522,  spread: 0.05 },
  { name: 'Berlin',       country: 'Germany',      lat: 52.5200, lng: 13.4050,  spread: 0.06 },
  { name: 'Madrid',       country: 'Spain',        lat: 40.4168, lng: -3.7038,  spread: 0.05 },
  { name: 'Rome',         country: 'Italy',        lat: 41.9028, lng: 12.4964,  spread: 0.05 },
  { name: 'Barcelona',    country: 'Spain',        lat: 41.3851, lng:  2.1734,  spread: 0.04 },
  { name: 'Warsaw',       country: 'Poland',       lat: 52.2297, lng: 21.0122,  spread: 0.05 },
  { name: 'Vienna',       country: 'Austria',      lat: 48.2082, lng: 16.3738,  spread: 0.05 },
  { name: 'Hamburg',      country: 'Germany',      lat: 53.5753, lng: 10.0153,  spread: 0.05 },
  { name: 'Budapest',     country: 'Hungary',      lat: 47.4979, lng: 19.0402,  spread: 0.04 },
  { name: 'Prague',       country: 'Czech Republic', lat: 50.0755, lng: 14.4378, spread: 0.04 },
  { name: 'Amsterdam',    country: 'Netherlands',  lat: 52.3676, lng:  4.9041,  spread: 0.03 },
  { name: 'Lisbon',       country: 'Portugal',     lat: 38.7169, lng: -9.1395,  spread: 0.04 },
  { name: 'Stockholm',    country: 'Sweden',       lat: 59.3293, lng: 18.0686,  spread: 0.05 },
  { name: 'Athens',       country: 'Greece',       lat: 37.9838, lng: 23.7275,  spread: 0.05 },
  { name: 'Brussels',     country: 'Belgium',      lat: 50.8503, lng:  4.3517,  spread: 0.04 },
  { name: 'Munich',       country: 'Germany',      lat: 48.1351, lng: 11.5820,  spread: 0.04 },
  { name: 'Milan',        country: 'Italy',        lat: 45.4654, lng:  9.1859,  spread: 0.04 },
  { name: 'Bucharest',    country: 'Romania',      lat: 44.4268, lng: 26.1025,  spread: 0.05 },
  { name: 'Copenhagen',   country: 'Denmark',      lat: 55.6761, lng: 12.5683,  spread: 0.04 },
  { name: 'Dublin',       country: 'Ireland',      lat: 53.3498, lng: -6.2603,  spread: 0.04 },
  { name: 'Oslo',         country: 'Norway',       lat: 59.9139, lng: 10.7522,  spread: 0.04 },
  { name: 'Helsinki',     country: 'Finland',      lat: 60.1699, lng: 24.9384,  spread: 0.04 },
  { name: 'Zurich',       country: 'Switzerland',  lat: 47.3769, lng:  8.5417,  spread: 0.03 },
  { name: 'Sofia',        country: 'Bulgaria',     lat: 42.6977, lng: 23.3219,  spread: 0.04 },
  { name: 'Belgrade',     country: 'Serbia',       lat: 44.8176, lng: 20.4569,  spread: 0.04 },
  { name: 'Zagreb',       country: 'Croatia',      lat: 45.8150, lng: 15.9819,  spread: 0.03 },
  { name: 'Bratislava',   country: 'Slovakia',     lat: 48.1486, lng: 17.1077,  spread: 0.03 },
  { name: 'Vilnius',      country: 'Lithuania',    lat: 54.6872, lng: 25.2797,  spread: 0.03 },
  { name: 'Riga',         country: 'Latvia',       lat: 56.9496, lng: 24.1052,  spread: 0.03 },
  { name: 'Tallinn',      country: 'Estonia',      lat: 59.4370, lng: 24.7536,  spread: 0.03 },
  { name: 'Kyiv',         country: 'Ukraine',      lat: 50.4501, lng: 30.5234,  spread: 0.06 },
  { name: 'Istanbul',     country: 'Turkey',       lat: 41.0082, lng: 28.9784,  spread: 0.07 },
  { name: 'Krakow',       country: 'Poland',       lat: 50.0647, lng: 19.9450,  spread: 0.04 },
  { name: 'Lyon',         country: 'France',       lat: 45.7640, lng:  4.8357,  spread: 0.04 },
  { name: 'Porto',        country: 'Portugal',     lat: 41.1579, lng: -8.6291,  spread: 0.04 },
  { name: 'Marseille',    country: 'France',       lat: 43.2965, lng:  5.3698,  spread: 0.04 },
  { name: 'Valencia',     country: 'Spain',        lat: 39.4699, lng: -0.3763,  spread: 0.04 },
  { name: 'Naples',       country: 'Italy',        lat: 40.8518, lng: 14.2681,  spread: 0.04 },
  { name: 'Seville',      country: 'Spain',        lat: 37.3891, lng: -5.9845,  spread: 0.04 },
];

// Incidents per city — bigger/more touristy cities get more
const INCIDENTS_PER_CITY = (city: typeof CITIES[0]) => {
  const big = ['London','Paris','Berlin','Madrid','Rome','Barcelona','Istanbul'];
  const medium = ['Warsaw','Vienna','Amsterdam','Lisbon','Prague','Budapest','Athens','Brussels','Munich','Milan','Krakow','Lyon','Porto','Marseille'];
  if (big.includes(city.name)) return 18;
  if (medium.includes(city.name)) return 12;
  return 8;
};

function rand(min: number, max: number) { return min + Math.random() * (max - min); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// Random date in the past 18 months
function randomDate(): string {
  const now = Date.now();
  const eighteenMonthsAgo = now - 18 * 30 * 24 * 60 * 60 * 1000;
  const ts = rand(eighteenMonthsAgo, now);
  return new Date(ts).toISOString();
}

const incidents: object[] = [];

for (const city of CITIES) {
  const count = INCIDENTS_PER_CITY(city);
  for (let i = 0; i < count; i++) {
    const crimeType = pick(CRIME_TYPES);
    const desc = pick(DESCRIPTIONS[crimeType]);
    incidents.push({
      id: randomUUID(),
      crimeType,
      occurredAt: randomDate(),
      lat: parseFloat((city.lat + rand(-city.spread, city.spread)).toFixed(6)),
      lng: parseFloat((city.lng + rand(-city.spread, city.spread)).toFixed(6)),
      city: city.name,
      description: desc,
      source: 'SEEDED',
    });
  }
}

writeFileSync('./seed/incidents.json', JSON.stringify(incidents, null, 2));
console.log(`Generated ${incidents.length} incidents across ${CITIES.length} cities.`);
