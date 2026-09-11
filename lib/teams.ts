export type Team = {
  id: number
  name: string
  shortName: string
  tla: string
  crest: string
}

const teamsData: Team[] = [
  {
    id: 57,
    name: "Arsenal",
    shortName: "Arsenal",
    tla: "ARS",
    crest: "https://crests.football-data.org/57.svg",
  },
  {
    id: 58,
    name: "Aston Villa",
    shortName: "Aston Villa",
    tla: "AVL",
    crest: "https://crests.football-data.org/58.svg",
  },
  {
    id: 1044,
    name: "Bournemouth",
    shortName: "Bournemouth",
    tla: "BOU",
    crest: "https://crests.football-data.org/1044.svg",
  },
  {
    id: 337,
    name: "Brentford",
    shortName: "Brentford",
    tla: "BRE",
    crest: "https://crests.football-data.org/337.svg",
  },
  {
    id: 397,
    name: "Brighton & Hove Albion",
    shortName: "Brighton",
    tla: "BHA",
    crest: "https://crests.football-data.org/397.svg",
  },
  {
    id: 61,
    name: "Chelsea",
    shortName: "Chelsea",
    tla: "CHE",
    crest: "https://crests.football-data.org/61.svg",
  },
  {
    id: 354,
    name: "Crystal Palace",
    shortName: "Crystal Palace",
    tla: "CRY",
    crest: "https://crests.football-data.org/354.svg",
  },
  {
    id: 62,
    name: "Everton",
    shortName: "Everton",
    tla: "EVE",
    crest: "https://crests.football-data.org/62.svg",
  },
  {
    id: 63,
    name: "Fulham",
    shortName: "Fulham",
    tla: "FUL",
    crest: "https://crests.football-data.org/63.svg",
  },
  {
    id: 341,
    name: "Leeds United",
    shortName: "Leeds United",
    tla: "LEE",
    crest: "https://crests.football-data.org/341.svg",
  },
  {
    id: 64,
    name: "Liverpool",
    shortName: "Liverpool",
    tla: "LIV",
    crest: "https://crests.football-data.org/64.svg",
  },
  {
    id: 65,
    name: "Manchester City",
    shortName: "Manchester City",
    tla: "MCI",
    crest: "https://crests.football-data.org/65.svg",
  },
  {
    id: 66,
    name: "Manchester United",
    shortName: "Manchester United",
    tla: "MUN",
    crest: "https://crests.football-data.org/66.svg",
  },
  {
    id: 67,
    name: "Newcastle United",
    shortName: "Newcastle",
    tla: "NEW",
    crest: "https://crests.football-data.org/67.svg",
  },
  {
    id: 351,
    name: "Nottingham Forest",
    shortName: "Nottingham Forest",
    tla: "NFO",
    crest: "https://crests.football-data.org/351.svg",
  },
  {
    id: 71,
    name: "Sunderland",
    shortName: "Sunderland",
    tla: "SUN",
    crest: "https://crests.football-data.org/71.svg",
  },
  {
    id: 73,
    name: "Tottenham Hotspur",
    shortName: "Tottenham",
    tla: "TOT",
    crest: "https://crests.football-data.org/73.svg",
  },
  {
    id: 1076,
    name: "Coventry City",
    shortName: "Coventry City",
    tla: "COV",
    crest: "https://crests.football-data.org/1076.svg",
  },
  {
    id: 349,
    name: "Ipswich Town",
    shortName: "Ipswich Town",
    tla: "IPS",
    crest: "https://crests.football-data.org/349.svg",
  },
  {
    id: 322,
    name: "Hull City",
    shortName: "Hull City",
    tla: "HUL",
    crest: "https://crests.football-data.org/322.svg",
  },
]

export const teams: Team[] = teamsData.sort((a, b) =>
  a.name.localeCompare(b.name)
)
