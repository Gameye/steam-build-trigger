import * as path from "path";

export const projectRoot = getProjectRoot();

function getProjectRoot() {
    return path.resolve(__dirname, "..", "..");
}
