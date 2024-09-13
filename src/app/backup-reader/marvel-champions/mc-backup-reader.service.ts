import {Injectable} from '@angular/core';
import {BGGCatalogBackup, CustomFieldEntry, PlayerPlayEntry} from "../../../model/bgg-catalog";
import {
  Aspects,
  Difficulty,
  Heroes,
  MarvelChampionsPlay,
  MarvelChampionsPlayer,
  MarvelChampionsStats,
  MC_GAME_NAME,
  Modulars,
  Scenarios
} from "../../../model/marvel-champions";
import {formatToEnumString} from "../../enum-utils";
import {BaseBackupReaderService} from "../base-backup-reader.service";

@Injectable({
  providedIn: 'root'
})
export class MCBackupReaderService extends BaseBackupReaderService {
  protected override enumNormalizers = {
    [Aspects.END]: this.normalizeAspectName,
    [Modulars.END]: this.normalizeModularName
  };

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

  private parsePlayer(entry: PlayerPlayEntry, backup: BGGCatalogBackup, heroField: CustomFieldEntry, aspectField: CustomFieldEntry) {
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
    ret.Hero = this.parseEnumValue(Heroes, hero.value);
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
    ret.Aspect = this.parseEnumValue(Aspects, aspect.value);
    if (ret.Aspect == undefined) {
      console.error(`Aspect Value ${this.normalizeAspectName(formatToEnumString(aspect.value))} can not be parsed`);
      return ret;
    }
    return ret;
  }

  public override parse(backup: BGGCatalogBackup) {
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
        obj.Players.push(this.parsePlayer(player, backup, heroField, aspectField));
      }
      // scenario
      let scenario = this.getFieldValue(backup, scenarioField.id, play.id);
      if (!scenario) {
        console.error(`Scenario with id ${scenarioField.id} not found`);
        console.log(play);
        return ret;
      }
      obj.Scenario = this.parseEnumValue(Scenarios, scenario.value);
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
      obj.Modular = this.parseEnumValue(Modulars, modular.value);
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
      obj.Difficulty = this.parseEnumValue(Difficulty, difficulty.value);
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
