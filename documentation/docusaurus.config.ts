import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Dynamo',
  tagline: 'Solar-aligned AI governance — grounded in real-time solar physics',
  favicon: 'img/favicon.svg',

  url: 'https://dynamo-docs.vercel.app',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/htafolla/chrono-warp-drive/tree/main/documentation/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
    },
    image: 'img/dynamo-social.png',
    navbar: {
      title: 'Dynamo',
      logo: {
        alt: 'Dynamo',
        src: 'img/logo.svg',
      },
      items: [
        {type: 'doc', docId: 'overview', position: 'left', label: 'Docs'},
        {to: '/about', label: 'About', position: 'left'},
        {
          href: 'https://github.com/htafolla/chrono-warp-drive',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://dynamo.rippel.ai',
          label: 'Try Dynamo',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Overview', to: '/docs/overview'},
            {label: 'Architecture', to: '/docs/architecture'},
            {label: 'API Reference', to: '/docs/api'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'X / Twitter', href: 'https://x.com/blaze0x1'},
            {label: 'GitHub', href: 'https://github.com/htafolla/chrono-warp-drive'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'About', to: '/about'},
            {label: 'Dynamo App', href: 'https://dynamo.rippel.ai'},
          ],
        },
      ],
      copyright: `Built by <a href="https://x.com/blaze0x1" target="_blank">@blaze0x1</a> — the sun-powered governance layer for AI.`,
    },
    prism: {
      theme: require('prism-react-renderer').themes.github,
      darkTheme: require('prism-react-renderer').themes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
