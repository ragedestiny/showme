/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import type { Plugin, Rolldown } from "vite";
import react from "@vitejs/plugin-react";
// Version 8 exports the plugin as the package itself, not by name
import purgeCSSPlugin from "@fullhuman/postcss-purgecss";
import tell from "./src/tellData";
import { phoneCarouselMedia } from "./src/config";

// The style libraries (MDB, Bootstrap and Font Awesome: about 570 KB) style
// far more than this site uses, and browsers download all of it before they
// can draw anything. When building, keep only the rules for the classes, tags
// and attributes this site uses: the ones written in its code, plus the ones
// the libraries' own code adds while you use the site, which never appear in
// our code as written (e.g. "carousel-item-next" while a slide moves).
// Using a new react-bootstrap or MDB component, or a new variant (e.g.
// <Button variant="success">)? Add its class names here: `npm start` keeps
// every rule, so it looks fine there, but the built site would leave it
// unstyled. (public/styles.css is not touched.)
const addedByLibraries = [
  /^carousel/, /^slide$/, /^active$/, /^fade$/, /^show$/, /^showing$/, /^hiding$/,
  /^collaps/, /^disabled$/, /^visually-hidden/, // slides, menus, pop-ups
  /^navbar/, /^nav$/, /^nav-/, /^container/, /^row$/, /^col/, // Navbar, Nav, Container, MDBRow/MDBCol
  /^modal/, /^tooltip/, /^bs-tooltip/, // Modal, Tooltip
  // Only the variants our code picks (each library has dozens): Button
  // variant="primary"/"secondary" and Modal's close button; Form.Control,
  // Form.Label, Form.Text; a plain ListGroup and ListGroup.Item
  /^btn$/, /^btn-(primary|secondary|close)$/, /^form-(control|label|text)$/, /^list-group(-item)?$/,
  /^badge/, /^rounded-pill$/, /^bg-/, /^text-/, /^pagination/, /^page-/, // Badge, Pagination
  /^spinner/, /^card/, /^table/, /^ripple/, // Spinner, MDBCard, MDBTable, MDB's click ripple
  /^fa[srb]?$/, /^fa-(list-check|check|rotate-right|lg|width-auto|bounce)$/, // Admin's MDBIcons, the edit pencil
];
// Tags and attributes that only the libraries' code writes (e.g. <table>, or
// the carousel's data-bs-target and a tooltip's data-popper-placement, with
// its values). MDB writes a few tag names in capitals.
const tagsAndAttributes =
  "html body div span a p h1 h2 h3 h4 h5 h6 img picture source svg path i b strong small " +
  "button input textarea select option label form ol ul li table thead tbody tr th td nav " +
  "footer header main section hr INPUT SELECT TEXTAREA " +
  "hidden type role tabindex disabled readonly multiple size list title href class " +
  "submit reset checkbox radio data-bs-target data-bs-popper data-mdb-popper " +
  "data-popper-placement top bottom start end left right auto";
const removeUnusedStyles = () =>
  purgeCSSPlugin({
    content: ["./index.html", "./src/**/*.{ts,tsx}", { raw: tagsAndAttributes, extension: "html" }],
    skippedContentGlobs: ["**/*.test.*", "**/test/**"],
    safelist: { standard: addedByLibraries },
  });

// Writes build/version.txt containing the git commit the site was built from.
// Netlify provides it as COMMIT_REF. CI reads this file to know when a deploy
// of a specific commit is live (see the workflows in .github/workflows/).
const versionFile = (): Plugin => ({
  name: "version-file",
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "version.txt",
      source: process.env.COMMIT_REF ?? "local",
    });
  },
});

// What each page needs first. On a fresh load or reload, the browser would
// only learn about these after the app's main file had downloaded and run, so
// two tiny scripts in index.html ask for them straight away:
// 1. At the very top: the page's own code (each page is a separate file,
//    loaded on demand, see NavbarComp), and the collection page's sentences
//    (the app picks that request up in src/api/index.ts).
// 2. After the stylesheets: the home page's first photo. The browser can't
//    draw anything until the stylesheets have arrived; starting the big photo
//    before them would make them share the connection with it, and the first
//    screen would appear later.
// Addresses are lowercase, without a trailing slash. File names change with
// every build, so the address-to-files list is written here.
const pageRoutes = {
  "/about": "About",
  "/admin": "Admin",
  "/collections": "Collection",
  "/login": "Login",
  "/mypage": "MyPage",
};

// The home page's first photo (see CarouselComp): the phone-shaped copy on
// phones held upright, the full photo everywhere else. The <picture> in
// CarouselComp makes the same choice, so the photo is never downloaded twice.
const firstPhoto = tell[0];
const preloadPhoto = (href: string, media: string) => ({
  rel: "preload",
  as: "image",
  fetchpriority: "high",
  href,
  media,
});
const homePhoto = [
  preloadPhoto(firstPhoto.phonePicture, phoneCarouselMedia),
  preloadPhoto(firstPhoto.picture, `not all and ${phoneCarouselMedia}`),
];

// What the tiny script starts for one address: <link> tags (as their
// attributes) and API requests
interface PageStart {
  links: Record<string, string>[];
  requests?: string[];
}

// The tiny script. `byAddress` lists, for each address, the <link> tags to add
// (as their attributes) and the API requests to start; the app finds those
// requests in window.earlyRequests. A tag with a `media` rule is only added on
// screens that match it, so even a browser that ignored the rule wouldn't
// download both photos.
const pageScript = (byAddress: Record<string, PageStart>) => `(function () {
      var page = ${JSON.stringify(byAddress)}[location.pathname.toLowerCase().replace(/\\/+$/, "") || "/"];
      if (!page) return;
      (page.links || []).forEach(function (attributes) {
        if (attributes.media && !matchMedia(attributes.media).matches) return;
        var link = document.createElement("link");
        for (var name in attributes) link.setAttribute(name, attributes[name]);
        document.head.appendChild(link);
      });
      (page.requests || []).forEach(function (path) {
        var request = fetch("/api" + path);
        request.catch(function () {}); // the app deals with failures
        (window.earlyRequests = window.earlyRequests || {})[path] = request;
      });
    })();`;

const preloadCurrentPage = (): Plugin => ({
  name: "preload-current-page",
  transformIndexHtml: {
    order: "post",
    handler(html, { bundle }) {
      if (!bundle) return html; // dev server: nothing is bundled
      const chunks = Object.values(bundle).filter(
        (c): c is Rolldown.OutputChunk => c.type === "chunk"
      );
      // Files index.html already loads (the main file and its imports)
      const entry = chunks.find((c) => c.isEntry);
      if (!entry) throw new Error("No main file found in the build");
      const alreadyLoaded = new Set([entry.fileName, ...entry.imports]);
      // A page's file plus the shared files it imports (e.g. MyPage needs Modal)
      const filesFor = (page: string) => {
        const chunk = chunks.find((c) =>
          c.facadeModuleId?.replaceAll("\\", "/").endsWith(`/src/pages/${page}.tsx`)
        );
        if (!chunk) throw new Error(`No build file found for page ${page}`);
        return [chunk.fileName, ...chunk.imports].filter((f) => !alreadyLoaded.has(f));
      };
      const atTheTop: Record<string, PageStart> = {};
      for (const [address, page] of Object.entries(pageRoutes)) {
        const links = filesFor(page).map((file) => ({
          rel: "modulepreload",
          crossorigin: "",
          href: "/" + file,
        }));
        atTheTop[address] = { links };
      }
      atTheTop["/collections"].requests = ["/Collections"];
      const afterTheStylesheets = { "/": { links: homePhoto } };

      // 1. Right after <meta charset> (which must stay in the first 1024
      // bytes) and before the stylesheets: a script placed after them waits
      // for them to download before running
      const charset = '<meta charset="utf-8" />';
      if (!html.includes(charset)) throw new Error("index.html needs " + charset);
      // 2. At the end of <head>, after the app's stylesheet (Vite puts it there)
      const headEnd = "</head>";
      if (html.lastIndexOf('rel="stylesheet"') > html.indexOf(headEnd)) {
        throw new Error("Expected every stylesheet before " + headEnd);
      }
      return html
        .replace(charset, `${charset}\n    <script>${pageScript(atTheTop)}</script>`)
        .replace(headEnd, `  <script>${pageScript(afterTheStylesheets)}</script>\n  ${headEnd}`);
    },
  },
});

export default defineConfig(({ command }) => ({
  // JSX support and instant refresh when you save a component
  plugins: [react(), versionFile(), preloadCurrentPage()],

  // Only when building the site: while developing, every rule stays, so a
  // class you just started using works straight away
  css: {
    postcss: { plugins: command === "build" ? [removeUnusedStyles()] : [] },
  },

  server: {
    // Google only allows its sign-in button on origins approved in Google
    // Cloud, and http://localhost:3000 is the approved one.
    port: 3000,
    strictPort: true,
    // Does locally what public/_redirects does on Netlify: requests to
    // localhost:3000/api/... are forwarded to the Firebase emulator, so the
    // browser sees one site and accepts the httpOnly login cookie.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
        // /api/MyPage -> /showme-backend-789/us-central1/apiv2/MyPage
        rewrite: (path) =>
          path.replace(/^\/api/, "/showme-backend-789/us-central1/apiv2"),
      },
    },
  },

  build: {
    // Netlify publishes the build/ folder (Create React App's default)
    outDir: "build",
  },

  test: {
    // A pretend browser, so component tests have somewhere to draw
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
}));
