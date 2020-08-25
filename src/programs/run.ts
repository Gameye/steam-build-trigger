import * as Sentry from "@sentry/node";
import * as bunyan from "bunyan";
import * as program from "commander";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { UpdaterService, UpdaterServiceConfig } from "../service";
import { packageInfo, packageName, waitForSignal } from "../utils";

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
    option("--log-level <trace|debug|info|warn|error|fatal>", "Log level", String, env.LOG_LEVEL || "info").
    action(runTask);

interface RunTaskConfig {
    steamApiEndpoint: string;
    steamApiKey: string;
    circleApiEndpoint: string;
    circleApiUserToken: string;
    interval: number;
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
        logLevel,
    }: RunTaskConfig,
) {
    Sentry.init();

    const logger = bunyan.createLogger({
        level: logLevel,
        name: packageName,
        version: packageInfo.version,
    });

    const config: UpdaterServiceConfig = {
        steamApiEndpoint,
        steamApiKey,
        circleApiEndpoint,
        circleApiUserToken,
        interval,
        branch: "",
        games: [],
    };

    if (configFile) {
        const configData = fs.readFileSync(configFile, "utf8");
        const configObject = yaml.load(configData);
        config.games = configObject.games;
        config.branch = configObject.branch;
    }

    const service = new UpdaterService(config);

    service.on("starting", () => logger.info({
        event: {
            type: "starting",
            payload: { iteration: service.iteration },
        },
    }));
    service.on("started", () => logger.info({
        event: {
            type: "started",
            payload: { iteration: service.iteration },
        },
    }));

    service.on("stopped", () => logger.info({
        event: {
            type: "stopped",
            payload: { iteration: service.iteration },
        },
    }));
    service.on("stopping", () => logger.info({
        event: {
            type: "stopping",
            payload: { iteration: service.iteration },
        },

    }));

    service.on("stepped", () => logger.trace({
        event: {
            type: "stepped",
            payload: { iteration: service.iteration },
        },
    }));
    service.on("stepping", () => logger.trace({
        event: {
            type: "stepping",
            payload: { iteration: service.iteration },
        },
    }));

    service.on("build", repo => logger.info({
        event: {
            type: "build",
            payload: {
                repo,
                iteration: service.iteration,
            },
        },
    }));
    service.on(
        "intialize-version",
        (name, version) => logger.info({
            event: {
                type: "initialize-version",
                payload: {
                    name,
                    version,
                    iteration: service.iteration,
                },
            },
        }),
    );
    service.on(
        "update-version",
        (
            name,
            version,
            oldVersion,
        ) => logger.info({
            event: {
                type: "update-version",
                payload: {
                    name,
                    version,
                    oldVersion,
                    iteration: service.iteration,
                },
            },
        }),
    );
    service.on("error", error => logger.error({ err: error }));
    service.on("error", error => Sentry.captureException(error));

    try {
        await service.start();
        await waitForSignal("SIGINT", "SIGTERM");
    }
    finally {
        await service.stop();
    }
}
