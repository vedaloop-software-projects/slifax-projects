import type { ThemeConfig } from 'antd'
import { theme as antdTheme } from 'antd'

// Light theme only. Brand: emerald — reads as "verified / fresh", outside the blue family.
export const BRAND = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primarySoft: '#E8F0FF',
  ink: '#101D35',
  sider: '#101A2D',
}

// Chart palette (distinct from primary so series don't read as "action" colour)
export const CHART = {
  printed: '#2563EB',
  failed: '#E5484D',
  scans: '#C2410C',
  visitors: '#F59E0B',
  series: ['#0E8A5F', '#C2410C', '#7C3AED', '#0891B2', '#CA8A04', '#DB2777'],
}

export const antdThemeConfig: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  cssVar: { key: 'sl' },
  token: {
    colorPrimary: BRAND.primary,
    colorInfo: '#0E7490',
    colorSuccess: '#16A34A',
    colorWarning: '#D97706',
    colorError: '#DC2626',
    colorLink: BRAND.primary,
    colorTextBase: BRAND.ink,
    colorBgLayout: '#F3F6FC',
    borderRadius: 10,
    borderRadiusLG: 14,
    fontFamily: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
    fontSize: 14,
    controlHeight: 36,
    motionDurationMid: '0.22s',
    motionDurationSlow: '0.32s',
    motionEaseInOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
    motionEaseOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
    boxShadowTertiary: '0 1px 2px rgba(16,35,27,0.04), 0 1px 6px -1px rgba(16,35,27,0.05)',
  },
  components: {
    Layout: { siderBg: BRAND.sider, headerBg: '#FFFFFF', headerHeight: 64, headerPadding: '0 24px' },
    Menu: {
      darkItemBg: BRAND.sider,
      darkSubMenuItemBg: BRAND.sider,
      darkItemSelectedBg: 'rgba(59, 130, 246, 0.18)',
      darkItemSelectedColor: '#93B4FF',
      darkItemColor: 'rgba(255,255,255,0.68)',
      darkItemHoverColor: '#FFFFFF',
      darkItemHoverBg: 'rgba(255,255,255,0.06)',
      itemBorderRadius: 8,
      itemHeight: 40,
      itemMarginInline: 10,
    },
    Card: { headerFontSize: 15 },
    Table: { headerBg: '#F8FAFD', headerColor: '#4B5E78', rowHoverBg: '#F4F7FC' },
    Button: { fontWeight: 600, primaryShadow: '0 2px 6px rgba(37,99,235,0.25)' },
    Statistic: { contentFontSize: 26 },
    Segmented: { itemSelectedBg: '#FFFFFF' },
  },
}
