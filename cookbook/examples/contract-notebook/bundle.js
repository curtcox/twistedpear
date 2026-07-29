import { freenet, ui } from "@twistedpear/miniapp-sdk";

let keyHex = "";
let codeHashHex = "";
let wasmHex = "";
let parametersHex = "";
let stateHex = "";
let status =
  "Reads are private to your node connection. Put and update are global and irreversible.";

async function render() {
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 10 },
      children: [
        {
          id: "title",
          type: "text",
          props: { value: "Contract notebook" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "warning",
          type: "text",
          props: {
            value:
              "Put and update publish to Freenet. The host asks for confirmation every time."
          }
        },
        {
          id: "key",
          type: "text-input",
          props: {
            value: keyHex,
            placeholder: "Contract key (hex)",
            event: "fn.key"
          }
        },
        {
          id: "code-hash",
          type: "text-input",
          props: {
            value: codeHashHex,
            placeholder: "Contract code hash for update (hex)",
            event: "fn.codeHash"
          }
        },
        {
          id: "wasm",
          type: "text-input",
          props: {
            value: wasmHex,
            placeholder: "Contract WASM for put (hex)",
            event: "fn.wasm"
          }
        },
        {
          id: "parameters",
          type: "text-input",
          props: {
            value: parametersHex,
            placeholder: "Contract parameters (hex; empty is allowed)",
            event: "fn.parameters"
          }
        },
        {
          id: "state",
          type: "text-input",
          props: {
            value: stateHex,
            placeholder: "Contract state (hex)",
            event: "fn.state"
          }
        },
        {
          id: "actions",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: [
            { id: "get", type: "button", props: { label: "Get", event: "fn.get" } },
            { id: "put", type: "button", props: { label: "Put", event: "fn.put" } },
            {
              id: "update",
              type: "button",
              props: { label: "Update", event: "fn.update" }
            }
          ]
        },
        {
          id: "status",
          type: "text",
          props: { value: status },
          style: { fontSize: 12 }
        }
      ]
    }
  });
}

async function run(operation) {
  try {
    if (operation === "get") {
      const record = await freenet.get(keyHex);
      if (record === null) {
        status = "Contract not found";
      } else {
        keyHex = record.keyHex;
        stateHex = record.stateHex;
        status = `Read ${record.stateHex.length / 2} state bytes`;
      }
    } else if (operation === "put") {
      const result = await freenet.put({ wasmHex, parametersHex, stateHex });
      keyHex = result.keyHex;
      status = `Published contract ${result.keyHex}`;
    } else {
      await freenet.update({ keyHex, codeHashHex, stateHex });
      status = "Published contract update";
    }
  } catch (error) {
    status = error instanceof Error ? error.message : String(error);
  }
  await render();
}

ui.onEvent(async ({ event, value }) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (event === "fn.key") keyHex = text;
  else if (event === "fn.codeHash") codeHashHex = text;
  else if (event === "fn.wasm") wasmHex = text;
  else if (event === "fn.parameters") parametersHex = text;
  else if (event === "fn.state") stateHex = text;
  else if (event === "fn.get") await run("get");
  else if (event === "fn.put") await run("put");
  else if (event === "fn.update") await run("update");
  else return;
  await render();
});

await render();
