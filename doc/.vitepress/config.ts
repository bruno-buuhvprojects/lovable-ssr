import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'lovable-ssr',
  description: 'SSR and route data engine for Lovable projects',
  base: '/',
  ignoreDeadLinks: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/guide/api' },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'Routes', link: '/guide/routes' },
          { text: 'App shell', link: '/guide/app-shell' },
        ],
      },
      {
        text: 'SSR',
        items: [
          { text: 'SSR entry & server', link: '/guide/ssr' },
          { text: 'getData', link: '/guide/get-data' },
          { text: 'SEO', link: '/guide/seo' },
          { text: 'Middleware', link: '/guide/middleware' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'API', link: '/guide/api' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/bruno-buuhvprojects/lovable-ssr' }],
  },
});
