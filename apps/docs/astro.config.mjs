// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	outDir: '../../dist',
	integrations: [
		starlight({
			title: 'Wish API Docs',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
			sidebar: [
				{
					label: 'Docs',
					items: [
						{ label: 'Overview', slug: 'overview' },
						{ label: 'Quickstart', slug: 'quickstart' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Requests API', slug: 'reference/requests' },
						{ label: 'Comments API', slug: 'reference/comments' },
						{ label: 'Upvotes API', slug: 'reference/upvotes' },
						{ label: 'Errors & Status Codes', slug: 'reference/errors' },
					],
				},
			],
		}),
	],
});
