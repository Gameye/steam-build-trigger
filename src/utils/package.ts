import * as fs from "fs";
import * as path from "path";
import { projectRoot } from "./root";

export function readPackage() {
    const content = fs.readFileSync(path.join(projectRoot, "package.json"), "utf8");
    return JSON.parse(content);
}
