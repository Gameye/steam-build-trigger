import * as test from "blue-tape";
import { UpdaterService } from "./service";
import { TestContext } from "./test";

test("instantiate", async t => TestContext.with(({
    steamApiEndpoint,
    circleApiEndpoint,
}) => {

    const service = new UpdaterService({
        interval: 1000,
        steamApiEndpoint,
        steamApiKey: "123",
        circleApiEndpoint,
        circleApiUserToken: "456",
        games: [],
    });

    t.ok(service);
}));
