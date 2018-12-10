import * as test from "blue-tape";
import { UpdaterService } from "./service";

test("instantiate", async (t) => {
    const service = new UpdaterService({
        interval: 100,
        steamApiEndpoint: "http://localhost:8001",
        steamApiKey: "123",
        circleApiEndpoint: "http://localhost:8002",
        circleApiUserToken: "string",
        games: [],
    });

    t.ok(service);
});
