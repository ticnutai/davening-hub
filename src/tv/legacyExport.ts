import type { TvConfig } from './config';
import { coloursOnScreen } from './designs';
import { getTheme } from './themes';
import { buildExport, toPortableTheme } from './transfer';

/** The deployed site's active importer understands roles and basic tablet geometry.
 * It does not understand free elements, ZIP workspaces or new renderer versions. */
export function exportForExistingSite(config: TvConfig, name: string, includeLayout = false) {
  const base = getTheme(config.theme, config.customThemes);
  const theme = toPortableTheme({ ...base, name: name.trim().slice(0,40) || 'עיצוב מ־New Shul', vars: coloursOnScreen(config) });
  const file = buildExport(config, { themes:false, gradients:true, board:includeLayout });
  // A visual transfer must not replace the destination synagogue's name.
  if (file.board) file.board.header = {};
  // Include the currently selected palette even if it was never saved as a custom theme.
  return { ...file, app:'new-shul', themes:[theme] };
}

export function backgroundElementIds(config: TvConfig): Set<string> {
  if (config.screenLayout !== 'composition') throw new Error('ייצוא רקע נקי זמין בערכות המורכבות מאלמנטים');
  const art = config.elements.filter(e=>e.kind!=='text' && !e.hidden);
  if (!art.length) throw new Error('אין רכיבים גרפיים לייצוא');
  return new Set(art.map(e=>e.id));
}
