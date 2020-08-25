import * as path from "path";

export const projectRoot = makeProjectRoot();

function makeProjectRoot() {
    return path.resolve(__dirname, "..", "..");
}
