import * as Sentry from "@sentry/node";
import * as bunyan from "bunyan";
import * as program from "commander";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { UpdaterService, UpdaterServiceConfig } from "../service";
import { waitForSignal } from "../utils";
import { readPackage } from "../utils";

const pkg = readPackage();
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
    option("--log-level <trace|debug|info|warn|error|fatal>", "Log level", String, env.LOG_LEVEL || "info").
    action(runTask);

interface RunTaskConfig {
    steamApiEndpoint: string;
    steamApiKey: string;
    circleApiEndpoint: string;
    circleApiUserToken: string;
    interval: number;
    sentryDsn?: string;
    logLevel: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
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
        logLevel,
    }: RunTaskConfig,
) {
    if (sentryDSN) {
        Sentry.init({ dsn: sentryDSN });
    }

    const logger = bunyan.createLogger({
        level: logLevel,
        name: pkg.name,
        src: true,
    });

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

    service.on("starting", () => logger.info({ event: "starting" }));
    service.on("started", () => logger.info({ event: "started" }));

    service.on("stopped", () => logger.info({ event: "stopped" }));
    service.on("stopping", () => logger.info({ event: "stopping" }));

    service.on("stepped", () => logger.trace({ event: "stepped" }));
    service.on("stepping", () => logger.trace({ event: "stepping" }));

    service.on("build", repo => logger.info({ event: "build", repo }));
    service.on(
        "initialize-version",
        (name, version) => logger.info({
            event: "initialize-version",
            name,
            version,
        }),
    );
    service.on(
        "update-version",
        (
            name,
            version,
            fromVersion,
        ) => logger.info({
            event: "update-version",
            name,
            version,
            fromVersion,
        }),
    );
    service.on("error", error => logger.error(error));
    service.on("error", error => Sentry.captureException(error));

    try {
        await service.start();
        await waitForSignal("SIGINT", "SIGTERM");
    }
    finally {
        await service.stop();
    }
}
