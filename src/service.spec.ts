import * as test from "blue-tape";
import { UpdaterService } from "./service";
import { TestContext } from "./test";

test("service", t => TestContext.with(async ({
    steamApiEndpoint,
    circleApiEndpoint,
}) => {

    const service = new UpdaterService({
        interval: 1000,
        steamApiEndpoint,
        steamApiKey: "123",
        circleApiEndpoint,
        circleApiUserToken: "456",
        games: [
            {
                name: "csgo",
                steamId: 730,
            },
        ],
    });

    let buildCount = 0;
    service.on("build", name => buildCount++);

    service.start();

    await new Promise(resolve => setTimeout(resolve, 5000));

    t.equal(buildCount, 1);

    service.stop();
}));
