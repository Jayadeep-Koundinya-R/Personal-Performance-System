const ts = require("typescript");
const fs = require("fs");
const path = require("path");

const filePath = path.resolve("src/components/sections/DashboardSection.tsx");
const configFile = ts.findConfigFile("./", ts.sys.fileExists, "tsconfig.app.json") || ts.findConfigFile("./", ts.sys.fileExists, "tsconfig.json");
const config = ts.readConfigFile(configFile, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(config.config, ts.sys, "./");

const program = ts.createProgram([filePath], parsedConfig.options);
const sourceFile = program.getSourceFile(filePath);
const diagnostics = [
  ...program.getSyntacticDiagnostics(sourceFile),
  ...program.getSemanticDiagnostics(sourceFile),
];

console.log("Total diagnostics:", diagnostics.length);
diagnostics.forEach(d => {
  const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
  const message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
  console.log(`Line ${line + 1}:${character + 1} - ${message}`);
});

