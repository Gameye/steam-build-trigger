import * as program from "commander";
import { readPackage } from "../utils";

const pkg = readPackage();
if (pkg.version) {
    program.version(pkg.version);
}
