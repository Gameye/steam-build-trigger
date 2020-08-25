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

    await service.start();

    await delay(5 * second);

    t.equal(buildCount, 1);

    await service.stop();
}));

test("service no build", t => TestContext.with(async ({
    steamApiEndpoint,
    circleApiEndpoint,
}) => {
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

    await service.start();

    await delay(5 * second);

    t.equal(buildCount, 0);

    await service.stop();
}));

test("http-error", t => TestContext.with(async ({
    steamApiEndpoint,
    circleApiEndpoint,
}) => {
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
    await service.start();

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

    await service.stop();
}));
