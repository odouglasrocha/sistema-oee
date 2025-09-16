import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: !isProduction,
      minify: isProduction ? 'terser' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-select'],
          },
        },
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    // Configurações específicas para produção
    ...(isProduction && {
      base: '/',
      assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif'],
    }),
  };
});
