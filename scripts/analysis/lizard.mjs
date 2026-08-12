import path from "node:path";
import { spawnSync } from "node:child_process";

/**
 * One lizard CSV row, honouring quoted fields.
 *
 * Lizard quotes `location`, `file`, `name` and `long_name`, and a `long_name`
 * is the whole parameter list — commas included. Splitting on "," puts the back
 * half of every signature into the columns after it.
 *
 * @param {string} line
 * @returns {string[]}
 */
export function splitCsvRow(line) {
  const field = /"((?:[^"]|"")*)"|([^,]*)/y;
  const fields = [];
  let index = 0;
  while (index <= line.length) {
    field.lastIndex = index;
    const match = field.exec(line);
    if (!match) break;
    fields.push(
      match[1] === undefined ? match[2] : match[1].replaceAll('""', '"'),
    );
    if (field.lastIndex >= line.length) break;
    index = field.lastIndex + 1;
  }
  return fields;
}

/**
 * Every function lizard finds under `roots`, as repository-relative records.
 *
 * CSV columns are `nloc, ccn, tokens, params, length, location, file, name,
 * long_name, start, end`.
 *
 * @param {{ root: string, languages: string[], roots: string[] }} options
 * @returns {{ nloc: number, ccn: number, params: number, file: string,
 *   name: string, start: number }[]}
 */
export function measureFunctions({ root, languages, roots }) {
  const args = ["--csv"];
  for (const language of languages) args.push("-l", language);
  // Pruned during the walk rather than after it: these trees are large enough
  // that reading them costs more than the rest of the run put together.
  for (const skip of ["*/node_modules/*", "*/dist/*", "*/.git/*"])
    args.push("-x", skip);
  args.push(...roots);
  const result = spawnSync("lizard", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
  });
  if (result.error?.code === "ENOENT")
    throw new Error(
      "lizard is not installed; run `npm run tools:install` or `pip3 install --user lizard==1.23.0`.",
    );
  if (!result.stdout?.trim()) {
    process.stderr.write(result.stderr ?? "");
    throw new Error(`lizard produced no CSV output (exit ${result.status})`);
  }

  const functions = [];
  for (const line of result.stdout.split("\n")) {
    if (!line.trim()) continue;
    const fields = splitCsvRow(line);
    if (fields.length < 11) continue;
    functions.push({
      nloc: Number(fields[0]),
      ccn: Number(fields[1]),
      params: Number(fields[3]),
      file: path
        .relative(root, path.resolve(root, fields[6]))
        .split(path.sep)
        .join("/"),
      name: fields[7],
      start: Number(fields[9]),
    });
  }
  return functions;
}
