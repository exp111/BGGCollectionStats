import {BaseGamePlay, BaseGamePlayer, BaseGameStats} from "./base-game-stats";
import {enumValuesToStrings} from "../app/enum-utils";

export enum Gearlocs {
  Patches,
  Boomer,
  Tantrum,
  Picket,
  END
}

export enum Tyrants {
  Mulmesh = Gearlocs.END,
  Nom,
  Drellen,
  Marrow,
  GoblinKing,
  Gendricks,
  Duster,
  END
}

export enum Difficulty {
  Adventurer = Tyrants.END,
  Heroic,
  Legendary
}

export const BoxContent: ({ [key: string]: any[] }) = {
  "Too Many Bones": [
    ...enumValuesToStrings(Gearlocs, Gearlocs.Patches, Gearlocs.Boomer, Gearlocs.Tantrum, Gearlocs.Picket),
    ...enumValuesToStrings(Tyrants, Tyrants.Mulmesh, Tyrants.Nom, Tyrants.Drellen, Tyrants.Marrow, Tyrants.GoblinKing, Tyrants.Gendricks, Tyrants.Duster),
    ...enumValuesToStrings(Difficulty.Adventurer, Difficulty.Heroic, Difficulty.Legendary)
  ],
  //TODO: expansions
}

export interface TooManyBonesPlayer extends BaseGamePlayer {
  Name: string;
  IsMe: boolean;
  Gearloc: Gearlocs;
}

export interface TooManyBonesPlay extends BaseGamePlay {
  Players: TooManyBonesPlayer[];
  Tyrant: Tyrants;
  Difficulty: Difficulty;
}

export interface TooManyBonesStats extends BaseGameStats {
  Plays: TooManyBonesPlay[];
  OwnedExpansions: string[];
}
