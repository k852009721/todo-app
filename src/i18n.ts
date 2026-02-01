import { createI18n } from 'vue-i18n'

import en from './locales/en.json'
import zhTW from './locales/zh-TW.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'

export type SupportedLocale = 'en' | 'zh-TW' | 'ja' | 'ko'

const savedLocale = localStorage.getItem('locale') as SupportedLocale | null

export const i18n = createI18n({
    legacy: false,
    locale: savedLocale || 'zh-TW',
    fallbackLocale: 'en',
    messages: {
        en,
        'zh-TW': zhTW,
        ja,
        ko
    }
})
