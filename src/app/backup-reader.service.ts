import {Injectable} from '@angular/core';
import {BGGCatalogBackup, CustomFieldEntry, PlayerPlayEntry} from "../model/bgg-catalog";
import {
  Aspects,
  Difficulty,
  Heroes,
  MarvelChampionsPlay,
  MarvelChampionsPlayer,
  MarvelChampionsStats, MC_GAME_NAME,
  Modulars,
  Scenarios
} from "../model/marvel-champions";
import {formatToEnumString, getEnumValue} from "./enum-utils";
import {
  Gearlocs,
  TMB_GAME_NAME,
  Difficulty as TMBDifficulty,
  TooManyBonesPlay,
  TooManyBonesPlayer,
  TooManyBonesStats, Tyrants
} from "../model/too-many-bones";

@Injectable({
  providedIn: 'root'
})
export class BackupReaderService {
  //TODO: refactor this service to handle only one game and unify simple tasks into functions
  constructor() {
    (window as any).backupReader = this;
  }

  private normalizeAspectName(str: string) {
    return {
      "Gerechtigkeit": "Justice",
      "F\xfchrung": "Leadership",
      "Pool": "Deadpool",
      "Schutz": "Protection"
    }[str] ?? str;
  }

  private normalizeModularName(str: string) {
    return {
      "Bombenbedrohung": "BombThreat",
      "UnterBeschuss": "UnderAttack",
      "HydrasLegionen": "LegionsOfHydra"
    }[str] ?? str;
  }

  //TODO: these should all be methods on backup/other classes?
  private getFieldValue(backup: BGGCatalogBackup, fieldId: number, entityId: number, playerId?: number) {
    return backup.customData.find(d => d.fieldId == fieldId
      && d.entityId == entityId
      && (playerId == null || d.playerId == playerId)
    );
  }

  private findCustomField(backup: BGGCatalogBackup, gameId: number, name: string) {
    return backup.customFields.find(p =>
      p.selectedGames.split(",").map(g => Number(g)).includes(gameId)
      && p.name.toLowerCase() == name.toLowerCase()
    );
  }

  private marvelChampionsPlayer(entry: PlayerPlayEntry, backup: BGGCatalogBackup, heroField: CustomFieldEntry, aspectField: CustomFieldEntry) {
    let ret = {} as MarvelChampionsPlayer;
    // get player
    let player = backup.players.find(p => p.id == entry.playerId);
    if (!player) {
      console.error(`Player with id ${entry.playerId} not found`);
      return ret;
    }
    // name
    ret.Name = player.name;
    ret.IsMe = player.me == 1;
    // find hero
    let hero = this.getFieldValue(backup, heroField.id, entry.playId, entry.id);
    if (!hero) {
      console.error(`Hero field with id ${heroField.id} not found`);
      console.log(backup.plays.find(p => p.id == entry.playId));
      console.log(entry);
      return ret;
    }
    ret.Hero = getEnumValue(Heroes, formatToEnumString(hero.value));
    if (ret.Hero == undefined) {
      console.error(`Hero Value ${formatToEnumString(hero.value)} can not be parsed`);
      return ret;
    }
    // find aspect
    let aspect = this.getFieldValue(backup, aspectField.id, entry.playId, entry.id);
    if (!aspect) {
      console.error(`Aspect field with id ${heroField.id} not found`);
      console.log(backup.plays.find(p => p.id == entry.playId));
      console.log(entry);
      return ret;
    }
    ret.Aspect = getEnumValue(Aspects, this.normalizeAspectName(formatToEnumString(aspect.value)));
    if (ret.Aspect == undefined) {
      console.error(`Aspect Value ${this.normalizeAspectName(formatToEnumString(aspect.value))} can not be parsed`);
      return ret;
    }
    return ret;
  }

  public marvelChampions(backup: BGGCatalogBackup) {
    let ret = {
      Plays: [],
      OwnedPacks: []
    } as MarvelChampionsStats;
    let plays = [];
    // get game id
    let game = backup.games.find(g => g.name == MC_GAME_NAME);
    if (!game) {
      console.error("Game not found");
      return ret;
    }
    let owned = backup.games.filter(g => g.name.startsWith(MC_GAME_NAME));
    ret.OwnedPacks = owned.map(g => g.name);
    let gameId = game.id;
    // get custom data fields
    let aspectField = this.findCustomField(backup, gameId, "Aspect");
    let heroField = this.findCustomField(backup, gameId, "Hero");
    let scenarioField = this.findCustomField(backup, gameId, "Villain");
    let modularField = this.findCustomField(backup, gameId, "Modular");
    let difficultyField = this.findCustomField(backup, gameId, "Difficulty");
    if (!aspectField || !heroField || !scenarioField || !modularField || !difficultyField) {
      console.error("Can't find custom fields");
      return ret;
    }
    // plays
    for (let play of backup.plays) {
      // only check game plays
      if (play.gameId != gameId) {
        continue;
      }
      let obj = {
        Id: play.id,
        Players: [] as MarvelChampionsPlayer[],
      } as MarvelChampionsPlay;
      // players
      let players = backup.playersPlays.filter(p => p.playId == play.id);
      for (let player of players) {
        obj.Players.push(this.marvelChampionsPlayer(player, backup, heroField, aspectField));
      }
      // scenario
      let scenario = this.getFieldValue(backup, scenarioField.id, play.id);
      if (!scenario) {
        console.error(`Scenario with id ${scenarioField.id} not found`);
        console.log(play);
        return ret;
      }
      obj.Scenario = getEnumValue(Scenarios, formatToEnumString(scenario.value));
      if (obj.Scenario == undefined) {
        console.error(`Scenario Value ${formatToEnumString(scenario.value)} can not be parsed`);
        return ret;
      }
      // modular
      let modular = this.getFieldValue(backup, modularField.id, play.id);
      if (!modular) {
        console.error(`Modular with id ${modularField.id} not found`);
        return ret;
      }
      obj.Modular = getEnumValue(Modulars, this.normalizeModularName(formatToEnumString(modular.value)));
      if (obj.Modular == undefined) {
        console.error(`Modular Value ${this.normalizeModularName(formatToEnumString(modular.value))} can not be parsed`);
        return ret;
      }
      // difficulty
      let difficulty = this.getFieldValue(backup, difficultyField.id, play.id);
      if (!difficulty) {
        console.error(`Difficulty with id ${difficultyField.id} not found`);
        return ret;
      }
      obj.Difficulty = getEnumValue(Difficulty, formatToEnumString(difficulty.value));
      if (obj.Difficulty == undefined) {
        console.error(`Difficulty Value ${formatToEnumString(difficulty.value)} can not be parsed`);
        return ret;
      }
      obj.Won = players.some(p => p.winner == 1)
      plays.push(obj);
    }
    ret.Plays = plays;
    return ret;
  }

  // Too Many Bones
  private tooManyBonesPlayer(entry: PlayerPlayEntry, backup: BGGCatalogBackup, gearlocField: CustomFieldEntry) {
    let ret = {} as TooManyBonesPlayer;
    // get player
    let player = backup.players.find(p => p.id == entry.playerId);
    if (!player) {
      console.error(`Player with id ${entry.playerId} not found`);
      return ret;
    }
    // name
    ret.Name = player.name;
    ret.IsMe = player.me == 1;
    // find hero
    let gearloc = this.getFieldValue(backup, gearlocField.id, entry.playId, entry.id);
    if (!gearloc) {
      console.error(`Gearloc field with id ${gearlocField.id} not found`);
      console.log(backup.plays.find(p => p.id == entry.playId));
      console.log(entry);
      return ret;
    }
    ret.Gearloc = getEnumValue(Gearlocs, formatToEnumString(gearloc.value));
    if (ret.Gearloc == undefined) {
      console.error(`Gearloc Value ${formatToEnumString(gearloc.value)} can not be parsed`);
      return ret;
    }
    return ret;
  }

  public tooManyBones(backup: BGGCatalogBackup) {
    let ret = {
      Plays: [],
      OwnedExpansions: []
    } as TooManyBonesStats;
    let plays = [];
    // get game id
    let game = backup.games.find(g => g.name == TMB_GAME_NAME);
    if (!game) {
      console.error("Game not found");
      return ret;
    }
    let owned = backup.games.filter(g => g.name.startsWith("Marvel Champions: The Card Game"));
    ret.OwnedExpansions = owned.map(g => g.name);
    let gameId = game.id;
    // get custom data fields
    let gearlocField = this.findCustomField(backup, gameId, "Gearloc");
    let tyrantField = this.findCustomField(backup, gameId, "Tyrant");
    let difficultyField = this.findCustomField(backup, gameId, "Difficulty");
    if (!gearlocField || !tyrantField || !difficultyField) {
      console.error("Can't find custom fields");
      return ret;
    }
    // plays
    for (let play of backup.plays) {
      // only check game plays
      if (play.gameId != gameId) {
        continue;
      }
      let obj = {
        Id: play.id,
        Players: [] as TooManyBonesPlayer[],
      } as TooManyBonesPlay;
      // players
      let players = backup.playersPlays.filter(p => p.playId == play.id);
      for (let player of players) {
        obj.Players.push(this.tooManyBonesPlayer(player, backup, gearlocField));
      }
      // scenario
      let tyrant = this.getFieldValue(backup, tyrantField.id, play.id);
      if (!tyrant) {
        console.error(`Tyrant with id ${tyrantField.id} not found`);
        console.log(play);
        return ret;
      }
      obj.Tyrant = getEnumValue(Tyrants, formatToEnumString(tyrant.value));
      if (obj.Tyrant == undefined) {
        console.error(`Scenario Value ${formatToEnumString(tyrant.value)} can not be parsed`);
        return ret;
      }
      // difficulty
      let difficulty = this.getFieldValue(backup, difficultyField.id, play.id);
      if (!difficulty) {
        console.error(`Difficulty with id ${difficultyField.id} not found`);
        return ret;
      }
      obj.Difficulty = getEnumValue(TMBDifficulty, formatToEnumString(difficulty.value));
      if (obj.Difficulty == undefined) {
        console.error(`Difficulty Value ${formatToEnumString(difficulty.value)} can not be parsed`);
        return ret;
      }
      obj.Won = players.some(p => p.winner == 1)
      plays.push(obj);
    }
    ret.Plays = plays;
    return ret;
  }
}
