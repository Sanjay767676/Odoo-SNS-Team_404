import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("🚀 Starting SubHub Backend Standalone...");

// Run the dev:server command from the root directory
const child = spawn("npm", ["run", "dev:server"], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    shell: true,
});

child.on("exit", (code) => {
    process.exit(code || 0);
});
