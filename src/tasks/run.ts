import * as Sentry from "@sentry/node";
import * as program from "commander";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { UpdaterService, UpdaterServiceConfig } from "../service";
import { waitForSignal } from "../utils";

const { env } = process;

program.
    command("run <config>").
    option(
        "--steam-api-endpoint <url>",
        "Steam API url",
        String,
        env.STEAM_API_ENDPOINT || "http://api.steampowered.com",
    ).
    option(
        "--steam-api-key <string>",
        "Your Steam API Key",
        String,
        env.STEAM_API_KEY,
    ).
    option(
        "--circle-api-endpoint <url>",
        "Endpoint of the CircleCI API",
        String,
        env.CIRCLE_API_ENDPOINT || "https://circleci.com/api/v1.1",
    ).
    option(
        "--circle-api-user-token <string>",
        "Your CircleCI API user token for triggering builds",
        String,
        env.CIRCLE_API_USER_TOKEN,
    ).
    option("--interval <msec>", "Polling interval in milliseconds", Number, 60 * 1000).
    option("--sentry-dsn [string]", "Public DSN for Sentry", String, env.SENTRY_DSN).
    action(runTask);

interface RunTaskConfig {
    steamApiEndpoint: string;
    steamApiKey: string;
    circleApiEndpoint: string;
    circleApiUserToken: string;
    interval: number;
    sentryDsn?: string;
}

async function runTask(
    configFile: string,
    {
        steamApiEndpoint,
        steamApiKey,
        circleApiEndpoint,
        circleApiUserToken,
        interval,
        sentryDsn: sentryDSN,
    }: RunTaskConfig,
) {
    // tslint:disable no-console
    if (sentryDSN) {
        Sentry.init({ dsn: sentryDSN });
    }

    const config: UpdaterServiceConfig = {
        steamApiEndpoint,
        steamApiKey,
        circleApiEndpoint,
        circleApiUserToken,
        interval,
        games: [],
    };

    if (configFile) {
        const configData = fs.readFileSync(configFile, "utf8");
        const configObject = yaml.load(configData);
        config.games = configObject.games;
    }

    const service = new UpdaterService(config);
    service.on("started", () => console.log("started"));
    service.on("stopped", () => console.log("stopped"));
    service.on("build", name => console.log(`build ${name}`));
    service.on("error", error => console.error(error));
    service.on("error", error => Sentry.captureException(error));

    try {
        await service.start();
        await waitForSignal("SIGINT", "SIGTERM");
    }
    finally {
        await service.stop();
    }
}
