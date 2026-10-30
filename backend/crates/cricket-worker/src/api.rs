//! The wire types for the HTTP API. Each one mirrors a zod schema in
//! `frontend/src/shared/types/`, so the frontend parses these bodies unchanged.
//!
//! Nullable fields serialise as `null`, never as a missing key. Money is in lakhs and every
//! count is an integer. Both directions use `camelCase`.

use cricket_core::match_log::Milestone;
use cricket_core::models::{Player, WicketKind};
use serde::{Deserialize, Serialize};

/// A lobby, as `lobbySchema` describes it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LobbyDto {
    /// The lobby identifier. Equal to its code.
    pub id: String,
    /// The shareable code.
    pub code: String,
    /// The name the creator gave it.
    pub name: String,
    /// `auction`, `league`, `playoffs` or `complete`.
    pub phase: String,
    /// `waiting`, `running` or `complete`.
    pub auction_status: String,
    /// 0 before the first match, then the round reached, up to 18.
    pub round: u32,
    /// Every guest who has joined, in join order.
    pub owners: Vec<OwnerDto>,
    /// The seed data version the lobby was created with.
    pub seed_version: String,
    /// Whether a substitution is open. The sim waits for it, for every guest.
    pub sim_paused: bool,
    /// The guests whose substitution is open, by guest ID.
    pub substituting: Vec<String>,
    /// The connected owners voting to skip the rest of the league, by guest ID.
    pub skip_voters: Vec<String>,
    /// How many connected owners must vote to skip: strictly more than half of the owners.
    pub skip_threshold: u32,
    /// Every substitution made, in order, so a view can rebuild the XI at any point.
    pub substitutions: Vec<SubstitutionDto>,
    /// How many matches had been played when the league was skipped, or `null` if it was not.
    pub skipped_after_matches: Option<u32>,
}

/// A substitution, as `substitutionRecordSchema` describes it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubstitutionDto {
    /// The owner who made the swap.
    pub guest_id: String,
    /// The XI player who left.
    pub out_player_id: String,
    /// The squad player who came in.
    pub in_player_id: String,
    /// How many matches had been played when the swap was confirmed.
    pub matches_played: u32,
}

/// A guest in a lobby, as `ownerSchema` describes it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnerDto {
    /// The guest.
    pub guest_id: String,
    /// The name shown in the lobby.
    pub display_name: String,
    /// The franchise they claimed, or `null` until they claim one.
    pub franchise_id: Option<String>,
}

/// The auction, as `auctionSchema` describes it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuctionDto {
    /// The lobby code.
    pub lobby_code: String,
    /// `running` or `complete`.
    pub status: String,
    /// The open lot, or `null` between lots and after the auction.
    pub lot: Option<LotDto>,
    /// Players not yet on a lot.
    pub remaining: u32,
    /// Every sale, in the order they closed.
    pub sold: Vec<SoldDto>,
    /// Players nobody bid on.
    pub unsold: Vec<Player>,
    /// Every accepted bid, in order.
    pub log: Vec<BidLogDto>,
    /// Every owner's purse and squad so far.
    pub purses: Vec<PurseDto>,
}

/// The lot on the block, as `lotSchema` describes it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LotDto {
    /// The player up for auction.
    pub player: Player,
    /// The high bid, or `null` if nobody has bid.
    pub high_bid: Option<HighBidDto>,
    /// The only amount the next bid may offer.
    pub minimum_bid_lakhs: u32,
    /// Epoch milliseconds when the hammer falls if no one bids again.
    pub ends_at: u64,
}

/// The current high bid on a lot.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HighBidDto {
    /// The leading guest.
    pub guest_id: String,
    /// The leading guest's name.
    pub display_name: String,
    /// The bid in lakhs.
    pub amount_lakhs: u32,
}

/// One bid in the log, as `bidLogEntrySchema` describes it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BidLogDto {
    /// One-based position in the log.
    pub sequence: u32,
    /// The player bid for.
    pub player_name: String,
    /// The bidder.
    pub guest_id: String,
    /// The bidder's name.
    pub display_name: String,
    /// The bid in lakhs.
    pub amount_lakhs: u32,
    /// Epoch milliseconds when the bid was placed.
    pub at: u64,
}

/// A sale, as `soldRecordSchema` describes it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SoldDto {
    /// The player sold.
    pub player: Player,
    /// The buyer.
    pub guest_id: String,
    /// The buyer's name.
    pub display_name: String,
    /// The price in lakhs.
    pub amount_lakhs: u32,
}

/// An owner's money and squad during the auction, as `auctionPurseSchema` describes it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PurseDto {
    /// The owner.
    pub guest_id: String,
    /// The owner's name.
    pub display_name: String,
    /// Money left, in lakhs.
    pub purse_lakhs: u32,
    /// The players bought so far.
    pub squad: Vec<Player>,
}

/// One owner's squad, as `squadSchema` describes it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SquadDto {
    /// The owner.
    pub guest_id: String,
    /// The 15 players.
    pub players: Vec<Player>,
    /// The saved starting XI, or `null`.
    pub starting_xi: Option<StartingXiDto>,
    /// `true` from the first league match.
    pub locked: bool,
    /// Whether the free substitution has been spent.
    pub substitution_used: bool,
}

/// One owner's lineup, as `lineupSchema` describes it: the squad and the saved XI.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LineupDto {
    /// The owner.
    pub guest_id: String,
    /// The 15 players.
    pub players: Vec<Player>,
    /// The saved starting XI, or `null`.
    pub starting_xi: Option<StartingXiDto>,
}

/// A starting XI, as `startingXiSchema` describes it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartingXiDto {
    /// The 11 player IDs in batting order.
    pub player_ids: Vec<String>,
    /// The captain.
    pub captain_id: String,
    /// The vice-captain.
    pub vice_captain_id: String,
}

/// The league, as `leagueSchema` describes it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LeagueDto {
    /// 0 before the first round, then the round reached.
    pub round: u32,
    /// Every fixture in round order.
    pub fixtures: Vec<FixtureDto>,
    /// The table, best first.
    pub standings: Vec<StandingDto>,
    /// Whether every league round has been played.
    pub league_complete: bool,
}

/// One league fixture, as `fixtureSchema` describes it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FixtureDto {
    /// The round.
    pub round: u32,
    /// The home franchise.
    pub home_franchise_id: String,
    /// The away franchise.
    pub away_franchise_id: String,
    /// The score once played, or `null`.
    pub result: Option<MatchScoreDto>,
}

/// The score of a played match, as `matchScoreSchema` describes it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchScoreDto {
    /// Home runs.
    pub home_runs: u32,
    /// Home wickets lost.
    pub home_wickets: u32,
    /// Away runs.
    pub away_runs: u32,
    /// Away wickets lost.
    pub away_wickets: u32,
    /// The winner, or `null` for a tie.
    pub winner_franchise_id: Option<String>,
}

/// One played league match, as `matchSchema` describes it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchDto {
    /// The match ID, such as `r03-csk-mi`.
    pub id: String,
    /// The league round.
    pub round: u32,
    /// The home franchise.
    pub home_franchise_id: String,
    /// The away franchise.
    pub away_franchise_id: String,
    /// The result. A played match always has one.
    pub result: MatchScoreDto,
}

/// One franchise's table row, as `standingSchema` describes it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StandingDto {
    /// The franchise.
    pub franchise_id: String,
    /// Matches played.
    pub played: u32,
    /// Matches won.
    pub won: u32,
    /// Matches tied.
    pub tied: u32,
    /// Matches lost.
    pub lost: u32,
    /// League points.
    pub points: u32,
    /// Runs scored.
    pub runs_for: u32,
    /// Runs conceded.
    pub runs_against: u32,
    /// Net run rate.
    pub net_run_rate: f64,
}

/// The playoff bracket, as `playoffsSchema` describes it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayoffsDto {
    /// The four slots in IPL order.
    pub matches: Vec<PlayoffSlotDto>,
    /// The champion once the Final is played.
    pub champion: Option<String>,
}

/// One playoff slot, as `playoffSlotViewSchema` describes it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayoffSlotDto {
    /// `qualifier-1`, `eliminator`, `qualifier-2` or `final`.
    pub slot: String,
    /// The round, 15 to 18.
    pub round: u32,
    /// The home franchise, or `null` until known.
    pub home_franchise_id: Option<String>,
    /// The away franchise, or `null` until known.
    pub away_franchise_id: Option<String>,
    /// The result once played, or `null`.
    pub result: Option<PlayoffResultDto>,
}

/// A played playoff match, as `playoffResultSchema` describes it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayoffResultDto {
    /// Home franchise.
    pub home_franchise_id: String,
    /// Away franchise.
    pub away_franchise_id: String,
    /// The winner. Always set in the playoffs.
    pub winner_franchise_id: String,
    /// Whether super overs settled a level score.
    pub super_over: bool,
    /// The score.
    pub score: MatchScoreDto,
    /// The Man of the Match, or `null` if the match had no performances.
    pub man_of_the_match: Option<ManOfTheMatchDto>,
    /// The key moments, from the toss to the result, replayed from the match's seed (ADR 0007).
    pub match_log: Vec<MatchEventDto>,
}

/// One key moment in a playoff match's log, as `matchEventSchema` describes it. The `kind` field
/// tags the variant. Players are named as well as identified, so the log reads without a lookup.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum MatchEventDto {
    /// The toss. The winner bats first.
    Toss {
        /// The franchise that won the toss.
        winner_franchise_id: String,
    },
    /// An innings begins.
    InningsStart {
        /// One-based innings number within the match.
        innings: u32,
        /// Whether this is a super over.
        super_over: bool,
        /// The franchise batting.
        batting_franchise_id: String,
        /// The franchise bowling.
        bowling_franchise_id: String,
        /// The two openers, in batting order.
        openers: [String; 2],
        /// The bowler who bowls the first over.
        opening_bowler: String,
    },
    /// A batter brings up a thirty, fifty or hundred.
    Milestone {
        /// The innings.
        innings: u32,
        /// The over, one-based.
        over: u32,
        /// The ball within the over.
        ball: u32,
        /// The batter.
        batter: String,
        /// `thirty`, `fifty` or `hundred`.
        milestone: Milestone,
    },
    /// Two batters bring up a fifty or hundred partnership.
    Partnership {
        /// The innings.
        innings: u32,
        /// The over, one-based.
        over: u32,
        /// The ball within the over.
        ball: u32,
        /// The two batters at the crease.
        batters: [String; 2],
        /// `fifty` or `hundred`.
        milestone: Milestone,
    },
    /// A batter is dismissed.
    Wicket {
        /// The innings.
        innings: u32,
        /// The over, one-based.
        over: u32,
        /// The ball within the over.
        ball: u32,
        /// The batter dismissed.
        batter: String,
        /// The bowler.
        bowler: String,
        /// How the batter was dismissed.
        wicket_kind: WicketKind,
        /// The catcher, or `null` unless it was a catch.
        fielder: Option<String>,
        /// The batting side's runs after the ball.
        runs: u32,
        /// The batting side's wickets after the ball.
        wickets: u32,
    },
    /// A bowler takes his fourth wicket in an innings.
    FourWickets {
        /// The innings.
        innings: u32,
        /// The over, one-based.
        over: u32,
        /// The ball within the over.
        ball: u32,
        /// The bowler.
        bowler: String,
    },
    /// The start of the last over of an innings.
    FinalOver {
        /// The innings.
        innings: u32,
        /// The runs before the over.
        runs: u32,
        /// The wickets before the over.
        wickets: u32,
        /// The runs needed to win, in a chase.
        target: Option<u32>,
    },
    /// An innings ends.
    InningsEnd {
        /// The innings.
        innings: u32,
        /// The franchise that batted.
        batting_franchise_id: String,
        /// The total runs.
        runs: u32,
        /// The wickets lost.
        wickets: u32,
        /// Legal deliveries bowled.
        legal_balls: u32,
    },
    /// The result of the match.
    Result {
        /// The winner, which is always set in the playoffs.
        winner_franchise_id: Option<String>,
    },
}

/// The awards, as `awardsSchema` describes them.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AwardsDto {
    /// Whether the Final has been played.
    pub season_complete: bool,
    /// Most runs.
    pub orange_cap: PairDto<PlayerAwardLineDto>,
    /// Most wickets.
    pub purple_cap: PairDto<PlayerAwardLineDto>,
    /// Highest owner fantasy points.
    pub most_valuable: PairDto<OwnerAwardLineDto>,
    /// Highest uncapped fantasy points.
    pub emerging: PairDto<PlayerAwardLineDto>,
    /// The Fair Play award and every franchise's screen.
    pub fair_play: FairPlayDto,
    /// Each played match's Man of the Match.
    pub man_of_the_match: Vec<ManOfTheMatchDto>,
}

/// Two places on an award, as `awardPairSchema` describes them.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PairDto<T> {
    /// The winner, or `null`.
    pub winner: Option<T>,
    /// The runner-up, or `null`.
    pub runner_up: Option<T>,
}

/// A player's line on an individual award screen.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerAwardLineDto {
    /// The player.
    pub player_id: String,
    /// The player's name.
    pub name: String,
    /// The franchise represented.
    pub franchise_id: String,
    /// Matches batted.
    pub innings: u32,
    /// Runs scored.
    pub runs: u32,
    /// Wickets taken.
    pub wickets: u32,
    /// Runs conceded.
    pub runs_conceded: u32,
    /// Fantasy points before multipliers.
    pub fantasy_points: u32,
}

/// An owner's line on the Most Valuable Player screen.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnerAwardLineDto {
    /// The owner.
    pub guest_id: String,
    /// The owner's name.
    pub display_name: String,
    /// The owner's franchise.
    pub franchise_id: String,
    /// Fantasy points with multipliers.
    pub fantasy_points: f64,
}

/// The Fair Play award.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FairPlayDto {
    /// The winning franchise, or `null`.
    pub winner_franchise_id: Option<String>,
    /// Every franchise that has played.
    pub franchises: Vec<FairPlayFranchiseDto>,
}

/// One franchise's Fair Play screen.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FairPlayFranchiseDto {
    /// The franchise.
    pub franchise_id: String,
    /// The season standing, from 0 to 10.
    pub standing: f64,
    /// Up to two players who pulled the rating down.
    pub lowering: Vec<FairPlayLineDto>,
    /// Up to two players who held it up.
    pub lifting: Vec<FairPlayLineDto>,
}

/// One player's effect on a franchise's Fair Play rating.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FairPlayLineDto {
    /// The player.
    pub player_id: String,
    /// The player's name.
    pub name: String,
    /// The average effect, 0 or below.
    pub average_effect: f64,
}

/// The Man of the Match in one match.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManOfTheMatchDto {
    /// The round.
    pub round: u32,
    /// The home franchise.
    pub home_franchise_id: String,
    /// The away franchise.
    pub away_franchise_id: String,
    /// The player.
    pub player_id: String,
    /// The player's name.
    pub name: String,
    /// The franchise represented.
    pub franchise_id: String,
}

/// Body of `POST /api/lobbies`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLobbyBody {
    /// The lobby's name.
    pub name: String,
    /// The creator's guest ID.
    pub guest_id: String,
    /// The creator's name.
    pub display_name: String,
}

/// Body of `POST /api/lobbies/{code}/join`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinBody {
    /// The guest.
    pub guest_id: String,
    /// The guest's name.
    pub display_name: String,
}

/// Body of `POST /api/lobbies/{code}/franchise`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaimBody {
    /// The guest.
    pub guest_id: String,
    /// The franchise to claim.
    pub franchise_id: String,
}

/// Body of a request that only names the guest acting.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuestBody {
    /// The guest acting.
    pub guest_id: String,
}

/// Body of `POST /api/lobbies/{code}/league/skip-vote`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkipVoteBody {
    /// The owner voting.
    pub guest_id: String,
    /// `true` to vote for the skip, `false` to withdraw the vote.
    pub vote: bool,
}

/// Body of `POST /api/lobbies/{code}/auction/bids`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BidBody {
    /// The bidder.
    pub guest_id: String,
    /// The bid, which must be the lot's minimum next bid.
    pub amount_lakhs: u32,
}

/// Body of `POST /api/lobbies/{code}/squad/xi`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetXiBody {
    /// The owner.
    pub guest_id: String,
    /// The 11 player IDs in batting order.
    pub player_ids: Vec<String>,
    /// The captain.
    pub captain_id: String,
    /// The vice-captain.
    pub vice_captain_id: String,
}

/// Body of `POST /api/lobbies/{code}/squad/substitution`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubstituteBody {
    /// The owner.
    pub guest_id: String,
    /// The XI player leaving.
    pub out_player_id: String,
    /// The squad player coming in.
    pub in_player_id: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::de::DeserializeOwned;

    #[test]
    fn a_missing_franchise_serialises_as_null_not_as_an_absent_key() {
        let owner = OwnerDto {
            guest_id: "g".to_string(),
            display_name: "Asha".to_string(),
            franchise_id: None,
        };
        let json = serde_json::to_value(&owner).expect("serialises");
        assert_eq!(json["franchiseId"], serde_json::Value::Null);
    }

    #[test]
    fn match_events_are_tagged_with_kind_and_name_the_wicket_kind() {
        let event = MatchEventDto::Wicket {
            innings: 1,
            over: 4,
            ball: 2,
            batter: "Asha".to_string(),
            bowler: "Ravi".to_string(),
            wicket_kind: WicketKind::RunOut,
            fielder: None,
            runs: 40,
            wickets: 2,
        };
        let json = serde_json::to_value(&event).expect("serialises");
        assert_eq!(json["kind"], "wicket");
        assert_eq!(json["wicketKind"], "run-out");
        assert!(json["fielder"].is_null());
    }

    /// Parses a shared fixture into its DTO and checks that serialising it gives the same JSON.
    /// The fixtures are also parsed by the frontend's zod schemas, so a drift on either side fails.
    ///
    /// @param json - The fixture text.
    fn round_trips<T: Serialize + DeserializeOwned>(json: &str) {
        let parsed: T = serde_json::from_str(json).expect("the fixture parses into the DTO");
        let back = serde_json::to_value(&parsed).expect("serialises");
        let original: serde_json::Value = serde_json::from_str(json).expect("the fixture is JSON");
        assert_eq!(back, original);
    }

    #[test]
    fn the_lobby_fixture_round_trips() {
        round_trips::<LobbyDto>(include_str!("../../../../data/fixtures/api/lobby.json"));
    }

    #[test]
    fn the_auction_fixture_round_trips() {
        round_trips::<AuctionDto>(include_str!("../../../../data/fixtures/api/auction.json"));
    }

    #[test]
    fn the_squad_fixture_round_trips() {
        round_trips::<SquadDto>(include_str!("../../../../data/fixtures/api/squad.json"));
    }

    #[test]
    fn the_league_fixture_round_trips() {
        round_trips::<LeagueDto>(include_str!("../../../../data/fixtures/api/league.json"));
    }

    #[test]
    fn the_playoffs_fixture_round_trips() {
        round_trips::<PlayoffsDto>(include_str!("../../../../data/fixtures/api/playoffs.json"));
    }

    #[test]
    fn the_awards_fixture_round_trips() {
        round_trips::<AwardsDto>(include_str!("../../../../data/fixtures/api/awards.json"));
    }
}
