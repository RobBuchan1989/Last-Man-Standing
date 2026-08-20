import { getCompetition, getCurrentEntry, getPicks, getLeaderboard, getFixtures } from "@/lib/store"
import { teams } from "@/lib/teams"
import { JoinGame } from "@/components/join-game"
import { GameDashboard } from "@/components/game-dashboard"
import { SiteHeader } from "@/components/site-header"

export const dynamic = "force-dynamic"

export default async function Home(){
  const competition=await getCompetition()
  const entry=await getCurrentEntry()
  if(!entry) return <><SiteHeader /><JoinGame gameName={competition.name} round={competition.round} defaultName="" /></>
  const [picks,leaderboard,fixtures]=await Promise.all([getPicks(entry.id),getLeaderboard(),getFixtures(competition.round)])
  return <><SiteHeader /><GameDashboard competition={competition} entry={entry} teams={teams} picks={picks} leaderboard={leaderboard} fixtures={fixtures} /></>
}
