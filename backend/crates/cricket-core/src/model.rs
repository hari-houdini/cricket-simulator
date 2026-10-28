//! Domain types shared by every module of the core. Field names follow the seed files
//! (camelCase on the wire) and `ARCHITECTURE.md`. Money is in lakhs and ratings are
//! integers (ADR 0004).

use serde::{Deserialize, Serialize};

/// Money is stored in lakhs: ₹1cr is 100 lakhs (ADR 0004).
pub type Lakhs = u32;

/// One of the four roles a player can hold (GLOSSARY.md, Role).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Role {
    /// A specialist batter.
    Batter,
    /// A specialist bowler.
    Bowler,
    /// Bowls and bats. Counts as a bowling option.
    AllRounder,
    /// The single wicket-keeper required in every starting XI.
    WicketKeeper,
}

impl Role {
    /// Reports whether the role counts towards the 4 bowling options in a starting XI.
    ///
    /// @returns `true` for bowlers and bowling all-rounders.
    pub fn is_bowling_option(self) -> bool {
        matches!(self, Role::Bowler | Role::AllRounder)
    }
}

/// The auction tier of a player (GLOSSARY.md, Category).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Category {
    /// Top tier, highest base price.
    Marquee,
    /// Middle tier.
    Capped,
    /// Entry tier.
    Uncapped,
}

/// A real IPL cricketer as held in the player pool (GLOSSARY.md, Player).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Player {
    /// Stable identifier from the seed file.
    pub id: String,
    /// Display name.
    pub name: String,
    /// Franchise the player last represented. `None` only for a retired player with no IPL history.
    pub franchise_id: Option<String>,
    /// The player's role.
    pub role: Role,
    /// The auction tier.
    pub category: Category,
    /// Whether the player has retired.
    pub retired: bool,
    /// Batting rating, integer 0 to 100 (ADR 0004).
    pub batting: u8,
    /// Bowling rating, integer 0 to 100 (ADR 0004).
    pub bowling: u8,
    /// Fielding rating, integer 0 to 100 (ADR 0004).
    pub fielding: u8,
    /// Opening bid in lakhs.
    pub base_price: Lakhs,
    /// Fair-play trouble rating, 0 to 10 (GLOSSARY.md, Trouble rating). A player with no
    /// verified record has no entry in the seed and uses {@link unverified_trouble_rating}.
    #[serde(default = "unverified_trouble_rating")]
    pub trouble_rating: u8,
}

/// The trouble rating for a player whose record has not been verified. It is not zero, so an
/// unverified player is never treated as clean (docs/game-design.md section 9).
///
/// @returns The base trouble rating, 2.
pub fn unverified_trouble_rating() -> u8 {
    2
}

/// One of the 10 IPL franchises (GLOSSARY.md, Franchise).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Franchise {
    /// Lowercase identifier, such as `csk`.
    pub id: String,
    /// Full name.
    pub name: String,
    /// Short name shown in the UI.
    pub abbreviation: String,
    /// Brand colour as a hex string.
    pub color: String,
}

/// How a batter was dismissed (docs/game-design.md section 6.1).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum WicketKind {
    /// Caught by a fielder.
    Caught,
    /// Leg before wicket.
    Lbw,
    /// Bowled.
    Bowled,
    /// Run out. Not credited to the bowler.
    RunOut,
    /// Any other dismissal.
    Other,
}

/// A single legal delivery (GLOSSARY.md, Ball).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Ball {
    /// Zero-based over number within the innings.
    pub over: u32,
    /// One-based legal delivery number within the over.
    pub ball: u32,
    /// Bowler's player ID.
    pub bowler_id: String,
    /// Batter facing the delivery, by player ID.
    pub batter_id: String,
    /// Runs scored off the bat. Zero on a wicket.
    pub runs: u32,
    /// Set if the batter was dismissed.
    pub wicket: Option<WicketKind>,
}

/// One franchise's batting turn in a match (GLOSSARY.md, Innings).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Innings {
    /// Franchise batting in this innings.
    pub batting_franchise_id: String,
    /// Franchise bowling in this innings.
    pub bowling_franchise_id: String,
    /// Every legal delivery, in order.
    pub balls: Vec<Ball>,
    /// Total runs scored.
    pub total_runs: u32,
    /// Total wickets lost.
    pub total_wickets: u32,
    /// Legal deliveries bowled. Equals `balls.len()`.
    pub legal_balls: u32,
}
