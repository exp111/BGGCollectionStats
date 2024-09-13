import {Injectable} from '@angular/core';
import {BGGCatalogBackup} from "../../model/bgg-catalog";
import {BaseGameStats} from "../../model/base-game-stats";
import {formatToEnumString, getEnumValue} from "../enum-utils";

@Injectable({
  providedIn: 'root'
})
export abstract class BaseBackupReaderService {
  constructor() {
    (window as any).backupReader = this;
  }

  protected abstract enumNormalizers: {[end: number]: (e: string) => string};

  /* Parses a string to an enum value of the given enum. Normalizes the name if a normalizer is in {@link enumNormalizers} */
  protected parseEnumValue(enums: any, str: string) {
    let endVal = enums["END"];
    if (!endVal) {
      console.error(`Can't find 'END' value for ${enums}, value: ${str}`);
      endVal = -1;
    }
    let normalizer = this.enumNormalizers[endVal] ?? ((e: string) => e);
    return getEnumValue(enums, normalizer(formatToEnumString(str)))
  }

  //TODO: should these all be methods on backup/other classes?
  /* Gets the value of a custom field */
  protected getFieldValue(backup: BGGCatalogBackup, fieldId: number, entityId: number, playerId?: number) {
    return backup.customData.find(d => d.fieldId == fieldId
      && d.entityId == entityId
      && (playerId == null || d.playerId == playerId)
    );
  }

  /* Searches the backup for the given custom field entry */
  protected findCustomField(backup: BGGCatalogBackup, gameId: number, name: string) {
    return backup.customFields.find(p =>
      p.selectedGames.split(",").map(g => Number(g)).includes(gameId)
      && p.name.toLowerCase() == name.toLowerCase()
    );
  }

  /* Parses the backup to a parser specific game stats model */
  public abstract parse(backup: BGGCatalogBackup): BaseGameStats;
}
