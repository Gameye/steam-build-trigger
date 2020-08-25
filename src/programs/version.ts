import * as program from "commander";
import { packageInfo } from "../utils";

if (packageInfo.version) {
    program.version(packageInfo.version);
}
