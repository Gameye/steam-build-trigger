import * as program from "commander";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { UpdaterService, UpdaterServiceConfig } from "../service";
import { waitForSignal } from "../utils";

const { env } = process;

program.
    command("run").
    option("--steam--api--endpoint <url>", "", String, env.STEAM_API_ENDPOINT || "http://api.steampowered.com").
    option("--steam--api--key <string>", "", String, env.STEAM_API_KEY).
    option("--circle--api--endpoint <url>", "", String, env.CIRCLE_API_ENDPOINT || "https://circleci.com/api/v1.1").
    option("--circle-api-user-token <string>", "", String, env.CIRCLE_API_USER_TOKEN).
    option("--interval <msec>", "", Number, 60 * 1000).
    option("--game-config-file <path>", "", String).
    action(runTask);

interface RunTaskConfig {
    steamApiEndpoint: string;
    steamApiKey: string;
    circleApiEndpoint: string;
    circleApiUserToken: string;
    interval: number;
    gameConfigFile: string;
}

async function runTask({
    steamApiEndpoint,
    steamApiKey,
    circleApiEndpoint,
    circleApiUserToken,
    interval,
    gameConfigFile,
}: RunTaskConfig) {
    // tslint:disable no-console

    const config: UpdaterServiceConfig = {
        steamApiEndpoint,
        steamApiKey,
        circleApiEndpoint,
        circleApiUserToken,
        interval,
        games: [],
    };

    if (gameConfigFile) {
        const gameConfigData = fs.readFileSync(gameConfigFile, "utf8");
        const gameConfig = yaml.load(gameConfigData);
        config.games = gameConfig.games;
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
