import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { Buffer } from 'buffer';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills()],
})
