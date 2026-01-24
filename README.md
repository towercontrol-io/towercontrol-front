
## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev
```

## Production

Build the application for production:

```bash
# npm
npm run generate
```

Locally preview production build:

```bash
# npm
npm run preview
```


## Install Nuxt.js

### Install Node.Js LTS version

#### Install nvm for installing node.js if not yet installed
```
brew install nvm
```

Add in file `.zshrc`
```
export NVM_DIR="$HOME/.nvm"
  [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"  # This loads nvm
  [ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"
```

#### Install Node.js LTS version

```
nvm install --lts
nvm install-latest-npm
```

## Init Nuxt.js project

```
npm create nuxt itc-front
```
Select the following options:
- **Package manager**: npm
- **Init git repository**: No
- **Official Nuxt.js modules**: Yes
   - **Nuxt.js modules**: @nuxt/icon
- **TypeScript**: Yes

## Install packages

Manual :
```
npm install @nuxtjs/i18n            # Internationalization support
npm install @pinia/nuxt             # Pinia state/store management
npm install @nuxt/ui                # Nuxt UI components
npm install qrcode.vue              # QR Code generation component
npm install apexcharts --save       # charts
npm install vue3-apexcharts
npm install valibot                 # Form Fields Validation library
npm install @tiptap/extension-text-align    # Text align extension for tiptap editor (tickets)
```

From existing file
```
npm install
```

## Clean libs

```
rm -rf node_modules
rm package-lock.json
npm i
```