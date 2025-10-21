// open-next.config.js

// The build tool requires the 'default' server configuration to be defined,
// even if it's an empty object. This key maps to the main Cloudflare Worker 
// that runs your Next.js server code.
const config = {
  default: {}, // This line resolves the "config.default cannot be empty" error.
};

export default config;