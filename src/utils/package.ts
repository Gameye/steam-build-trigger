import * as fs from "fs";
import * as path from "path";
import { PackageJson } from "type-fest";
import { projectRoot } from "./root";

export const packageInfo = readPackageInfo();
export const packageName = readPackageName();

function readPackageInfo() {
    const content = fs.readFileSync(path.join(projectRoot, "package.json"), "utf8");
    return JSON.parse(content) as PackageJson;
}

function readPackageName() {
    const match = /[^/]*$/.exec(packageInfo.name ?? "");
    if (!match) throw new Error("name not found!");
    return match.toString();
}
