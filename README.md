# twistedpear

P2P apps using Pears and Reticulum on React Native.

## Handbook (platform docs)

The [Handbook](apps/handbook/) is interactive diagnostic documentation shipped as a
mini-app — install it like any other app and read chapters with live probes on your
host.

| Host | How to get the Handbook |
|---|---|
| **Desktop** | First boot seeds `handbook`, `devstudio`, and `chat` from the TwistedPear platform publisher. Open **Installed** and launch **handbook**. |
| **Web** | `npm run test:web-handbook` exercises install in CI; production web hosts follow the same 256t install path as other mini-apps. |
| **Node / CI** | `npm run test:handbook` |
| **Develop** | `npm run build:handbook` then `tp pack handbook` in a temp project |

Plan and phases: [docs/handbook.md](docs/handbook.md).
