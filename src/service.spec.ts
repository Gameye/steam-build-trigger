import * as test from "blue-tape";
import { UpdaterService } from "./service";
import { TestContext } from "./test";

test("service one build", t => TestContext.with(async ({
    steamApiEndpoint,
    circleApiEndpoint,
    // ociPackageEndpoint,
}) => {
    const service = new UpdaterService({
        interval: 1000,
        steamApiEndpoint,
        steamApiKey: "123",
        circleApiEndpoint,
        circleApiUserToken: "456",
        // ociPackageEndpoint,
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

    await new Promise(resolve => setTimeout(resolve, 5000));

    t.equal(buildCount, 1);

    await service.stop();
}));

test("service no build", t => TestContext.with(async ({
    steamApiEndpoint,
    circleApiEndpoint,
    // ociPackageEndpoint,
}) => {
    const service = new UpdaterService({
        interval: 1000,
        steamApiEndpoint,
        steamApiKey: "123",
        circleApiEndpoint,
        circleApiUserToken: "456",
        // ociPackageEndpoint,
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

    await new Promise(resolve => setTimeout(resolve, 5000));

    t.equal(buildCount, 0);

    await service.stop();
}));
