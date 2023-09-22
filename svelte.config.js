import adapter from '@sveltejs/adapter-static';


export default {
	kit: {
		adapter: adapter({
			// default options are shown. On some platforms
			// these options are set automatically — see below
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: false,
			strict: true
		}),
		prerender: {
			// Other prerender options
			handleHttpError: (error) => {
			  // Handle the error here, e.g., log it or display a custom error page
			  console.error(error);
			},
		  },
		  paths: {
            base: process.env.NODE_ENV === 'production' ? '/T_Log' : '',
        },
	}
};