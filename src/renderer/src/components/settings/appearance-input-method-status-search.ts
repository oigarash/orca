import { translate } from '@/i18n/i18n'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { translateSearchKeyword } from './settings-search-keywords'

export const getInputMethodStatusBarToggle = createLocalizedCatalog(() => ({
  title: translate(
    'auto.components.settings.appearance.search.inputMethodStatusTitle',
    'Input Method'
  ),
  description: translate(
    'auto.components.settings.appearance.search.inputMethodStatusDescription',
    'Show the current keyboard input method in the status bar.'
  ),
  keywords: [
    ...translateSearchKeyword(
      'auto.components.settings.appearance.search.896eb53fd4',
      'status bar'
    ),
    ...translateSearchKeyword(
      'auto.components.settings.appearance.search.inputMethodStatusKeyword',
      'input method'
    ),
    ...translateSearchKeyword('auto.components.settings.appearance.search.imeKeyword', 'IME'),
    ...translateSearchKeyword(
      'auto.components.settings.appearance.search.japaneseKeyword',
      'Japanese'
    ),
    ...translateSearchKeyword(
      'auto.components.settings.appearance.search.keyboardKeyword',
      'keyboard'
    )
  ],
  toggleDescription: translate(
    'settings.appearance.statusBar.inputMethodToggleDescription',
    'Show IM: あ for Japanese input and IM: A for alphanumeric input.'
  )
}))
