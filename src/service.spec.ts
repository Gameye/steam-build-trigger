import { AbortController } from "abort-controller";
import * as delay from "delay";
import { HttpError } from "http-errors";
import { second } from "msecs";
import * as test from "tape-promise/tape";
import { UpdaterService } from "./service";
import { TestContext } from "./test";

test("service one build", t => TestContext.with(async ({
    steamApiEndpoint,
    circleApiEndpoint,
}) => {
    const abortController = new AbortController();
    const service = new UpdaterService({
        branch: "local",
        interval: 1000,
        steamApiEndpoint,
        steamApiKey: "123",
        circleApiEndpoint,
        circleApiUserToken: "456",
        games: [
            {
                name: "tf2",
                steamId: 440,
                repos: ["tf2"],
            },
        ],
    });

    let buildCount = 0;
    service.on("build", name => buildCount++);

    const runWait = service.run(abortController.signal);

    await delay(5 * second);

    t.equal(buildCount, 1);

    try {
        abortController.abort();
        await runWait;
    }
    catch (error) {
        if (error.name === "AbortError") null;
        else throw error;
    }
}));

test("service no build", t => TestContext.with(async ({
    steamApiEndpoint,
    circleApiEndpoint,
}) => {
    const abortController = new AbortController();
    const service = new UpdaterService({
        branch: "local",
        interval: 1000,
        steamApiEndpoint,
        steamApiKey: "123",
        circleApiEndpoint,
        circleApiUserToken: "456",
        games: [
            {
                name: "csgo",
                steamId: 730,
                repos: ["csgo"],
            },
        ],
    });

    let buildCount = 0;
    service.on("build", name => buildCount++);

    const runWait = service.run(abortController.signal);

    await delay(5 * second);

    t.equal(buildCount, 0);

    try {
        abortController.abort();
        await runWait;
    }
    catch (error) {
        if (error.name === "AbortError") null;
        else throw error;
    }
}));

test("http-error", t => TestContext.with(async ({
    steamApiEndpoint,
    circleApiEndpoint,
}) => {
    const abortController = new AbortController();
    const service = new UpdaterService({
        branch: "local",
        interval: 1000,
        steamApiEndpoint,
        steamApiKey: "123",
        circleApiEndpoint,
        circleApiUserToken: "456",
        games: [
            {
                name: "tf2",
                steamId: 440,
                repos: ["not-found"],
            },
        ],
    });

    const wait = new Promise((resolve, reject) => service.once("error", reject));
    const runWait = service.run(abortController.signal);

    try {
        await wait;
        t.fail();
    }
    catch (err) {
        if (err instanceof HttpError) {
            t.equal(err.status, 404);
            t.equal(err.statusCode, 404);
            t.equal(err.message, "Not Found");
        }
        else throw err;
    }

    try {
        abortController.abort();
        await runWait;
    }
    catch (error) {
        if (error.name === "AbortError") null;
        else throw error;
    }
}));
