import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";
import { UpdaterService, UpdaterServiceConfig } from "./service";
import { projectRoot, waitForSignal } from "./utils";

main(process.argv.slice(2));

async function main(arg: string[]) {
    // tslint:disable no-console

    const { env } = process;

    let config = {
        steamApiEndpoint: env.STEAM_API_ENDPOINT || "http://api.steampowered.com",
        steamApiKey: env.STEAM_API_KEY || "",
        circleApiEndpoint: env.CIRCLE_API_ENDPOINT || "https://circleci.com/api/v1.1",
        circleApiUserToken: env.CIRCLE_API_USER_TOKEN || "",
        // ociPackageEndpoint: env.OCI_PACKAGE_ENDPOINT || "",
        interval: 60 * 1000,
        games: [],
    } as UpdaterServiceConfig;

    if (env.STEAM_DISTRIBUTION_UPDATER_CONFIG) {
        const configFile = path.join(projectRoot, "config", env.STEAM_DISTRIBUTION_UPDATER_CONFIG + ".yaml");
        const configData = fs.readFileSync(configFile, "utf8");
        config = {
            ...config,
            ...yaml.load(configData),
        };
    }

    for (const configFile of arg) {
        const configData = fs.readFileSync(configFile, "utf8");
        config = {
            ...config,
            ...yaml.load(configData),
        };
    }

    const service = new UpdaterService(config);
    service.on("started", () => console.log("started"));
    service.on("stopped", () => console.log("stopped"));
    service.on("build", name => console.log(`build ${name}`));
    service.on("error", error => console.error(error));

    try {
        await service.start();
        await waitForSignal("SIGINT", "SIGTERM");
    }
    finally {
        await service.stop();
    }

}
