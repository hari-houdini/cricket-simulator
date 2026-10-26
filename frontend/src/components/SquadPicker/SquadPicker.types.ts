import type { SetStartingXiInput, Squad } from "../../shared/types/squad.types";

/** The starting XI a guest saves, without the code and guest ID that the panel adds. */
export type StartingXiSelection = Omit<SetStartingXiInput, "code" | "guestId">;

/** Props for {@link SquadPicker}. The picker shows the squad and reports the guest's choices. */
export type SquadPickerProps = {
  /** The owner's squad, including any starting XI already saved. */
  readonly squad: Squad;
  /** True while a save or a substitution is in flight. Disables the actions. */
  readonly pending: boolean;
  /** A message for the last failed action, or `null`. */
  readonly error: string | null;
  /** Called with a legal XI when the guest saves it. */
  readonly onSave: (selection: StartingXiSelection) => void;
  /** Called with the two players when the guest makes the free substitution. */
  readonly onSubstitute: (outPlayerId: string, inPlayerId: string) => void;
};
